import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { supportedLocales } from '@/lib/i18n/locales';
const load = (code: string) =>
  JSON.parse(readFileSync(`lib/i18n/locales/${code}.json`, 'utf8')).modelCenter as Record<
    string,
    string
  >;
const en = load('en-US');
describe.each(supportedLocales)('$code model center', ({ code }) => {
  test('has complete nonempty labels and native privacy instructions', () => {
    const d = load(code);
    expect(Object.keys(d).sort()).toEqual(Object.keys(en).sort());
    for (const v of Object.values(d)) expect(v.trim()).not.toBe('');
    if (code !== 'en-US') expect(d.privacyNote).not.toBe(en.privacyNote);
  });
});
