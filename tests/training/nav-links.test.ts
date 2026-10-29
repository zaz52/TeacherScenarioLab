import { describe, expect, test } from 'vitest';

import { isNavLinkActive, visibleTrainingNavLinks } from '@/lib/training/nav-links';

describe('visibleTrainingNavLinks', () => {
  test('hides the admin link from ordinary visitors', () => {
    const links = visibleTrainingNavLinks(false);
    expect(links.map((link) => link.href)).toEqual([
      '/',
      '/training/hall',
      '/training/records',
      '/training/events',
      '/training/references',
      '/training/account',
    ]);
  });

  test('shows the admin link to admins', () => {
    const links = visibleTrainingNavLinks(true);
    expect(links.map((link) => link.href)).toContain('/training/admin');
    expect(links).toHaveLength(7);
  });
});

describe('isNavLinkActive', () => {
  test('root is active only on /', () => {
    expect(isNavLinkActive('/', '/')).toBe(true);
    expect(isNavLinkActive('/training/hall', '/')).toBe(false);
  });

  test('exact and nested pages are active', () => {
    expect(isNavLinkActive('/training/hall', '/training/hall')).toBe(true);
    expect(isNavLinkActive('/training/admin/scenarios', '/training/admin')).toBe(true);
  });

  test('lookalike siblings are not active', () => {
    expect(isNavLinkActive('/training/hallway', '/training/hall')).toBe(false);
    expect(isNavLinkActive('/trainingx', '/training/hall')).toBe(false);
  });
});
