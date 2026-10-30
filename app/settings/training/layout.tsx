'use client';

/**
 * TeacherScenarioLab — settings-style shell for the training admin area.
 *
 * The old /training/admin tree now lives under /settings/training: the
 * admin console, the model center and the scenario editor, with a
 * settings-style section nav (same tokens as the fork's settings dialog).
 * The server still enforces the admin role on every admin API route, so
 * this nav is a convenience view, not a boundary.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getClientTranslation } from '@/lib/i18n';

const NAV = [
  { href: '/settings/training', key: 'adminTitle' },
  { href: '/settings/training/models', key: 'modelCenterTitle' },
];

export default function TrainingSettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== '/settings/training' && pathname.startsWith(`${href}/`));
  return (
    <div className="mx-auto flex max-w-5xl gap-6 p-6">
      <nav className="w-48 shrink-0" aria-label="training settings">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  isActive(item.href)
                    ? 'block rounded-md bg-muted px-3 py-2 text-sm font-medium'
                    : 'block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
                }
              >
                {item.key === 'modelCenterTitle'
                  ? getClientTranslation('modelCenter.title')
                  : getClientTranslation(`training.${item.key}`)}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/"
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {getClientTranslation('training.navHome')}
            </Link>
          </li>
        </ul>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
