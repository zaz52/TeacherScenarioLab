import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

const load = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(`lib/i18n/locales/${locale}.json`, 'utf8')).training;
const english = load('en-US');
const proseKeys = [
  'homeTagline',
  'homeStartDesc',
  'homeRecordsDesc',
  'homeReferencesDesc',
  'homeAdminDesc',
  'homeCapRolesDesc',
  'homeCapInfoDesc',
  'homeCapTrainingDesc',
  'homeCapEvalDesc',
  'homeCapRefsDesc',
  'homeAccountNote',
  'accountAnonymous',
  'accountClaimDesc',
  'adminPublishedNote',
  'homeAccountCreate',
  'inputPlaceholder',
  'reviewNoEvaluation',
];

describe.each(supportedLocales)('$code training localization', ({ code }) => {
  test('covers every training key with nonempty copy and preserves interpolation', () => {
    const translated = load(code);
    expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(translated)) {
      expect(value.trim(), key).not.toBe('');
      const placeholders = (text: string) => text.match(/\{\{[^}]+\}\}/g)?.sort() ?? [];
      expect(placeholders(value), key).toEqual(placeholders(english[key]));
    }
  });

  if (code !== 'en-US') {
    test('provides localized learner and admin instructions', () => {
      const translated = load(code);
      for (const key of proseKeys) expect(translated[key], key).not.toBe(english[key]);
    });
  }
});
