'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAccount } from './account-provider';
import { AuthenticationForm, type AuthMode } from './authentication-form';
import { AccountPanel } from './account-panel';
export function AuthenticationPage({ initialMode = 'password' }: { initialMode?: AuthMode }) {
  const { t } = useI18n(),
    { account } = useAccount(),
    query = useSearchParams();
  const mode = query.get('mode') === 'reset' ? 'reset' : initialMode;
  return (
    <main className="teacherlab-auth-page">
      <header className="auth-page-header">
        <Link href="/">TeacherScenarioLab</Link>
        <Link href="/">{t('training.navHome')}</Link>
      </header>
      <div data-training-guide="account" className="auth-page-layout">
        <section className="auth-story">
          <h1>{t('teacherlab.brand')}</h1>
          <p>{t('teacherlab.auth.story')}</p>
          <small>TeacherScenarioLab · {t('teacherlab.auth.accountAccess')}</small>
        </section>
        <section>
          {query.get('registered') === '1' && (
            <p className="mb-5 rounded-lg border p-3 text-sm text-muted-foreground">
              {t('teacherlab.auth.registered')}
            </p>
          )}
          {query.get('reset') === '1' && (
            <p className="mb-5 rounded-lg border p-3 text-sm text-muted-foreground">
              {t('teacherlab.auth.passwordSaved')}
            </p>
          )}
          {account?.authenticated && mode !== 'reset' ? (
            <AccountPanel />
          ) : (
            <AuthenticationForm key={mode} initialMode={mode} initialEmail={account?.email ?? ''} />
          )}
        </section>
      </div>
    </main>
  );
}
