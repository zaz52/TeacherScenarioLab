import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import { DNS_LOOKUP_ADAPTER } from '../server/dns-lookup';

export async function resolveDohRecords(hostname, family, fetchImpl = fetch) {
  const type = family === 4 ? 1 : 28;
  const url = new URL('https://cloudflare-dns.com/dns-query');
  url.searchParams.set('name', hostname);
  url.searchParams.set('type', String(type));
  const response = await fetchImpl(url, {
    headers: { accept: 'application/dns-json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Unable to verify hostname safety');
  const result = await response.json();
  if (result.Status !== 0 && result.Status !== 3)
    throw new Error('Unable to verify hostname safety');
  const addresses = (result.Answer ?? [])
    .filter((answer) => answer.type === type)
    .map((answer) => answer.data);
  if (!addresses.length)
    throw Object.assign(new Error('No DNS addresses'), {
      code: result.Status === 3 ? 'ENOTFOUND' : 'ENODATA',
    });
  if (addresses.length > 100 || addresses.some((address) => isIP(address) !== family))
    throw new Error('Unable to verify hostname safety');
  return addresses;
}

const workerResolver = {
  resolve4: (hostname) => resolveDohRecords(hostname, 4),
  resolve6: (hostname) => resolveDohRecords(hostname, 6),
};

/**
 * @param {string} hostname
 * @param {{resolve4: (hostname: string) => Promise<string[]>, resolve6: (hostname: string) => Promise<string[]>}} resolver
 */
export async function lookupWithRecords(hostname, resolver = dns) {
  const answers = await Promise.allSettled([
    resolver.resolve4(hostname),
    resolver.resolve6(hostname),
  ]);
  const addresses = [];
  for (const [index, result] of answers.entries()) {
    if (result.status === 'fulfilled') {
      for (const address of result.value) addresses.push({ address, family: index === 0 ? 4 : 6 });
    } else if (!['ENODATA', 'ENOTFOUND'].includes(result.reason?.code)) {
      throw new Error('Unable to verify hostname safety');
    }
  }
  if (!addresses.length) throw new Error('Unable to verify hostname safety');
  return addresses;
}

export function installTrainingNetwork() {
  // Use the documented DoH endpoint across deployment and emulator; the
  // emulator's node:dns resolve functions can return EBADQUERY.
  globalThis[DNS_LOOKUP_ADAPTER] = (hostname) => lookupWithRecords(hostname, workerResolver);
  // workerd rejects private destinations at connection time with
  // global_fetch_strictly_public. Node uses the existing pinned dispatcher.
  globalThis[Symbol.for('teacherlab.training-public-fetch')] = (url, init) => fetch(url, init);
}
