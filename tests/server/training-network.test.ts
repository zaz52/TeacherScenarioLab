import { afterEach, expect, test, vi } from 'vitest';
import { lookupWithRecords, resolveDohRecords } from '@/lib/cloudflare/training-network.mjs';
import { DNS_LOOKUP_ADAPTER, type DnsLookupAdapter } from '@/lib/server/dns-lookup';
import { validatePublicUrlForSSRF } from '@/lib/server/ssrf-guard';

const runtime = globalThis as typeof globalThis & { [DNS_LOOKUP_ADAPTER]?: DnsLookupAdapter };
afterEach(() => {
  delete runtime[DNS_LOOKUP_ADAPTER];
  vi.unstubAllEnvs();
});
const noData = () => Promise.reject(Object.assign(new Error('no answers'), { code: 'ENODATA' }));

test('DoH uses a fixed TLS resolver and refuses malformed, failed and empty answers', async () => {
  const transport = vi.fn().mockResolvedValue(
    Response.json({
      Status: 0,
      Answer: [
        { type: 5, data: 'alias.example' },
        { type: 1, data: '93.184.216.34' },
      ],
    }),
  );
  expect(await resolveDohRecords('models.example', 4, transport)).toEqual(['93.184.216.34']);
  const [url, options] = transport.mock.calls[0];
  expect(String(url)).toBe('https://cloudflare-dns.com/dns-query?name=models.example&type=1');
  expect(options.redirect).toBe('error');
  for (const response of [
    Response.json({ Status: 2 }),
    Response.json({ Status: 0 }),
    Response.json({ Status: 0, Answer: [{ type: 1, data: 'invalid' }] }),
    new Response(null, { status: 503 }),
  ]) {
    transport.mockResolvedValueOnce(response);
    await expect(resolveDohRecords('models.example', 4, transport)).rejects.toBeDefined();
  }
});

test('Workers resolves both address families with its supported DNS API', async () => {
  const resolver = {
    resolve4: vi.fn().mockResolvedValue(['93.184.216.34']),
    resolve6: vi.fn().mockResolvedValue(['2606:4700:4700::1111']),
  };
  expect(await lookupWithRecords('models.example', resolver)).toEqual([
    { address: '93.184.216.34', family: 4 },
    { address: '2606:4700:4700::1111', family: 6 },
  ]);
  expect(resolver.resolve4).toHaveBeenCalledWith('models.example');
  expect(resolver.resolve6).toHaveBeenCalledWith('models.example');
});
test('DNS failures and empty responses remain closed', async () => {
  await expect(
    lookupWithRecords('models.example', { resolve4: noData, resolve6: noData }),
  ).rejects.toThrow('Unable to verify');
  await expect(
    lookupWithRecords('models.example', {
      resolve4: async () => ['93.184.216.34'],
      resolve6: async () => {
        throw Object.assign(new Error('timeout'), { code: 'ETIMEOUT' });
      },
    }),
  ).rejects.toThrow('Unable to verify');
});
test('a private answer in either family is refused by the original public-address guard', async () => {
  vi.stubEnv('ALLOW_LOCAL_NETWORKS', 'true');
  runtime[DNS_LOOKUP_ADAPTER] = (hostname) =>
    lookupWithRecords(hostname, {
      resolve4: async () => ['93.184.216.34'],
      resolve6: async () => ['fd00::1'],
    });
  expect(await validatePublicUrlForSSRF('https://models.example/v1')).not.toBeNull();
  runtime[DNS_LOOKUP_ADAPTER] = (hostname) =>
    lookupWithRecords(hostname, { resolve4: async () => ['93.184.216.34'], resolve6: noData });
  expect(await validatePublicUrlForSSRF('https://models.example/v1')).toBeNull();
});
