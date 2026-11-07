'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/hooks/use-i18n';
export default function TrainingSettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link className="mb-6 inline-block text-sm text-primary" href="/?settings=training-admin">
        {t('settings.title')}
      </Link>
      {children}
    </main>
  );
}
