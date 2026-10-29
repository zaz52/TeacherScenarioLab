/**
 * TeacherScenarioLab — training navigation links (pure helpers).
 *
 * The link list and the active-match rule live here so the header
 * component stays thin and the rules are unit-testable. Visibility is
 * decided by the caller's admin flag; the server still enforces admin
 * routes (403), so hiding a link never grants access.
 */

export interface TrainingNavLink {
  href: string;
  /** i18n key under the `training` block (without the prefix). */
  key: string;
  adminOnly?: boolean;
}

export const TRAINING_NAV_LINKS: readonly TrainingNavLink[] = [
  { href: '/', key: 'navHome' },
  { href: '/training/hall', key: 'navHall' },
  { href: '/training/records', key: 'navRecords' },
  { href: '/training/events', key: 'navEvents' },
  { href: '/training/references', key: 'navReferences' },
  { href: '/training/account', key: 'navAccount' },
  { href: '/training/admin', key: 'navAdmin', adminOnly: true },
];

/** Links a visitor may see. Admin links appear only for admins. */
export function visibleTrainingNavLinks(isAdmin: boolean): TrainingNavLink[] {
  return TRAINING_NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);
}

/**
 * Whether a nav link counts as active for the current pathname. The root
 * link is active only on `/` itself; other links are active on their page
 * and any nested page below it (`/training/admin/...`), but not on
 * lookalike siblings (`/training/hallway` is not `/training/hall`).
 */
export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
