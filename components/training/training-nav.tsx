'use client';

/**
 * TeacherScenarioLab — shared header for every /training/* page.
 *
 * Deliberately local to the training routes (see app/training/layout.tsx):
 * the root layout carries no navigation, and the workbench header is
 * classroom-specific, so reusing it here would drag stage machinery into
 * training pages. Visual language comes from the upstream design system
 * (shadcn tokens, Geist/Inter fonts, radius scale), not a new system.
 *
 * Admin visibility is client-side convenience only: the link appears only
 * after /api/training/accounts/me reports an admin role, and every admin
 * route still answers 403 server-side for anyone else.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';
import { isNavLinkActive, visibleTrainingNavLinks } from '@/lib/training/nav-links';

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

interface MeState {
  authenticated: boolean;
  roles: string[];
  displayName: string | null;
}

export function TrainingNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<MeState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/accounts/me');
        const data = await res.json();
        if (res.ok && data.success) {
          setMe({
            authenticated: data.authenticated === true,
            roles: Array.isArray(data.roles) ? data.roles : [],
            displayName: data.displayName ?? null,
          });
        }
      } catch {
        // Anonymous fallback: no account area, no admin link.
      }
    })();
  }, []);

  const isAdmin = me?.roles.includes('admin') === true;
  const links = visibleTrainingNavLinks(isAdmin);

  return (
    <header className="border-b border-border bg-background">
      <nav
        aria-label="training"
        className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3"
      >
        {links.map((link) => {
          const active = isNavLinkActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'text-sm font-medium text-primary'
                  : 'text-sm text-muted-foreground hover:text-foreground'
              }
            >
              {t(link.key)}
            </Link>
          );
        })}
        <span className="ml-auto text-sm text-muted-foreground">
          {me?.authenticated ? (
            <Link href="/training/account" className="hover:text-foreground">
              {me.displayName ?? t('navAccount')}
            </Link>
          ) : (
            <Link href="/" className="hover:text-foreground">
              {t('navAccount')}
            </Link>
          )}
        </span>
      </nav>
    </header>
  );
}
