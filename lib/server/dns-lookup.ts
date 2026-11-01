import { promises as dns } from 'node:dns';

export const DNS_LOOKUP_ADAPTER = Symbol.for('teacherlab.dns-lookup');
export type DnsLookupAdapter = (hostname: string) => Promise<{ address: string; family: number }[]>;
type Runtime = typeof globalThis & { [DNS_LOOKUP_ADAPTER]?: DnsLookupAdapter };

/** Node uses its system resolver; Workers supplies its supported DNS resolver. */
export function lookupAddresses(hostname: string) {
  const adapter = (globalThis as Runtime)[DNS_LOOKUP_ADAPTER];
  return adapter ? adapter(hostname) : dns.lookup(hostname, { all: true, verbatim: true });
}
