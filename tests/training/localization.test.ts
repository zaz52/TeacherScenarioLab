import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';
import { TRAINING_STATES } from '@/lib/training/state-machine';
import { trainingStateLabel } from '@/lib/training/state-label';

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

  test('renders every state with a label from this locale', () => {
    const translated = load(code);
    for (const state of TRAINING_STATES) {
      const label = trainingStateLabel(state, (key) => translated[key]);
      expect(typeof label).toBe('string');
      expect(label.trim()).not.toBe('');
      expect(label).not.toBe(state);
    }
  });

  if (code !== 'en-US') {
    test('provides localized learner and admin instructions', () => {
      const translated = load(code);
      for (const key of proseKeys) expect(translated[key], key).not.toBe(english[key]);
    });
  }
});

test('unknown state identifiers remain visible without treating them as translation keys', () => {
  expect(trainingStateLabel('__proto__', () => 'unexpected')).toBe('__proto__');
});
