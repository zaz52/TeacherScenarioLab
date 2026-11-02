'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Settings, ShieldCheck, Users, ClipboardList, BookOpen } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { SettingsDialog } from '@/components/settings';
import { AccountMenu } from '@/components/account/account-panel';
import { useAccount } from '@/components/account/account-provider';
import { TrainingHomeBlock } from './training-home-block';
import type { SettingsSection } from '@/lib/types/settings';

export function TeacherlabHome() {
  const { t } = useI18n(),
    params = useSearchParams(),
    { account, loading } = useAccount();
  const requested =
    params.get('settings') ?? (params.get('training') === 'account' ? 'account' : null);
  const [open, setOpen] = useState(Boolean(requested)),
    [section, setSection] = useState<SettingsSection>((requested ?? 'account') as SettingsSection);
  const settings = (id: SettingsSection) => {
    setSection(id);
    setOpen(true);
  };
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b px-5 py-5">
        <Link href="/" className="text-lg font-semibold">
          {t('teacherlab.brand')}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/courseware/references">{t('training.referencesTitle')}</Link>
          <Link href="/courseware/create">{t('teacherlab.courseMaterials')}</Link>
          <AccountMenu onOpen={() => settings('account')} />
          <button
            onClick={() => settings('model-services')}
            className="rounded-full border p-2"
            aria-label={t('settings.title')}
          >
            <Settings size={18} />
          </button>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14">
        <p className="mb-3 text-sm font-medium text-primary">TeacherScenarioLab</p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
          {t('teacherlab.epidemicTitle')}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
          {t('teacherlab.epidemicIntro')}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'prepare', Icon: ShieldCheck },
            { key: 'communicate', Icon: Users },
            { key: 'evaluate', Icon: ClipboardList },
            { key: 'review', Icon: BookOpen },
          ].map(({ key, Icon: Symbol }) => {
            return (
              <div key={key} className="rounded-xl border p-4">
                <Symbol size={20} className="mb-3 text-primary" />
                <p className="font-medium">{t('teacherlab.focus.' + key)}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16">
        {loading ? (
          <p>{t('training.trainingLoading')}</p>
        ) : account?.authenticated ? (
          <TrainingHomeBlock unified />
        ) : (
          <div className="space-y-4 rounded-xl border p-8">
            <h2 className="text-xl font-semibold">{t('teacherlab.joinTitle')}</h2>
            <p className="text-muted-foreground">{t('teacherlab.joinIntro')}</p>
            <button
              onClick={() => settings('account')}
              className="rounded-lg bg-primary px-5 py-3 text-primary-foreground"
            >
              {t('teacherlab.loginRegister')}
            </button>
          </div>
        )}
      </section>
      <footer className="border-t p-5 text-center text-xs text-muted-foreground">
        {t('teacherlab.brand')} · TeacherScenarioLab
      </footer>
      <SettingsDialog open={open} onOpenChange={setOpen} initialSection={section} />
    </main>
  );
}
