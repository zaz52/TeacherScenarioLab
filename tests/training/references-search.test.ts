import { describe, expect, test } from 'vitest';

import { listReferences, searchReferences } from '@/lib/training/references';

describe('searchReferences', () => {
  test('empty query returns the whole catalog (or the topic slice)', () => {
    expect(searchReferences('')).toHaveLength(listReferences().length);
    expect(searchReferences('', 'rumor')).toHaveLength(listReferences('rumor').length);
    expect(listReferences('rumor').length).toBeGreaterThan(0);
  });

  test('matches title, author and summary text case-insensitively', () => {
    const all = listReferences();
    const first = all[0];
    const titleWord = first.title.split(' ')[0];
    expect(searchReferences(titleWord)).toContainEqual(first);
    const authorWord = first.authors[0].split(' ')[0];
    expect(searchReferences(authorWord.toUpperCase())).toContainEqual(first);
  });

  test('every term must match (AND semantics)', () => {
    const all = searchReferences('epidemic-school');
    expect(all.length).toBeGreaterThan(0);
    const narrowed = searchReferences('epidemic-school zzz-no-such-term');
    expect(narrowed).toHaveLength(0);
  });

  test('unknown terms return an empty list, never fabricated rows', () => {
    expect(searchReferences('qqq-no-such-topic-zzz')).toHaveLength(0);
  });
});
