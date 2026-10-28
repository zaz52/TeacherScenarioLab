import { describe, expect, test } from 'vitest';

import { validateCitation } from '@/lib/training/citation-check';
import {
  findReferenceByDoi,
  getReferenceById,
  listReferences,
  TRAINING_REFERENCES,
  type ReferenceTopic,
} from '@/lib/training/references';

const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

const TOPICS: ReferenceTopic[] = [
  'epidemic-school',
  'home-school',
  'simulation',
  'crisis-theory',
  'teacher-wellbeing',
  'rumor',
];

describe('training reference library', () => {
  test('holds at least 50 entries with unique ids', () => {
    expect(TRAINING_REFERENCES.length).toBeGreaterThanOrEqual(50);
    const ids = TRAINING_REFERENCES.map((ref) => ref.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every entry has a title, at least one author, and a plausible year', () => {
    const currentYear = new Date().getFullYear();
    for (const ref of TRAINING_REFERENCES) {
      expect(ref.title.trim()).not.toBe('');
      expect(ref.authors.length).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(ref.year)).toBe(true);
      expect(ref.year).toBeGreaterThanOrEqual(1900);
      expect(ref.year).toBeLessThanOrEqual(currentYear + 1);
      expect(ref.topics.length).toBeGreaterThanOrEqual(1);
      for (const topic of ref.topics) {
        expect(TOPICS).toContain(topic);
      }
      if (ref.doi) {
        expect(ref.doi).toMatch(DOI_PATTERN);
      }
    }
  });

  test('topic filter returns only that topic and covers all six topics', () => {
    for (const topic of TOPICS) {
      const filtered = listReferences(topic);
      expect(filtered.length).toBeGreaterThan(0);
      for (const ref of filtered) {
        expect(ref.topics).toContain(topic);
      }
    }
    expect(listReferences().length).toBe(TRAINING_REFERENCES.length);
  });

  test('doi lookup is case-insensitive', () => {
    const ref = TRAINING_REFERENCES.find((item) => item.doi);
    expect(ref).toBeDefined();
    expect(findReferenceByDoi(ref!.doi!.toUpperCase())?.id).toBe(ref!.id);
    expect(getReferenceById('ref-zzz')).toBeUndefined();
  });
});

describe('validateCitation', () => {
  test('a catalog entry cited exactly is valid', () => {
    const ref = TRAINING_REFERENCES[0];
    const result = validateCitation({
      id: ref.id,
      doi: ref.doi,
      title: ref.title,
      year: ref.year,
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.reference?.id).toBe(ref.id);
  });

  test('doi alone resolves the entry', () => {
    const ref = TRAINING_REFERENCES.find((item) => item.doi);
    expect(ref).toBeDefined();
    const result = validateCitation({ doi: ref!.doi });
    expect(result.valid).toBe(true);
    expect(result.reference?.id).toBe(ref!.id);
  });

  test('unknown id is reported', () => {
    const result = validateCitation({ id: 'ref-zzz' });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('unknown-reference-id');
  });

  test('malformed doi is reported', () => {
    const result = validateCitation({ doi: 'not-a-doi' });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('invalid-doi-format');
  });

  test('doi that belongs to another entry is a mismatch', () => {
    const [first, second] = TRAINING_REFERENCES.filter((item) => item.doi);
    const result = validateCitation({ id: first.id, doi: second.doi });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('doi-mismatch');
  });

  test('unrelated title and wrong year are reported', () => {
    const ref = TRAINING_REFERENCES[0];
    const result = validateCitation({
      id: ref.id,
      title: 'a completely different study about penguins',
      year: ref.year + 5,
    });
    expect(result.valid).toBe(false);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain('title-mismatch');
    expect(codes).toContain('year-mismatch');
  });

  test('implausible year is reported even without a reference', () => {
    const result = validateCitation({ year: 1800 });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('implausible-year');
  });

  test('empty citation is reported', () => {
    const result = validateCitation({});
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('empty-citation');
  });
});
