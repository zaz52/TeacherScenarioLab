'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAccount } from './account-provider';
import { AuthenticationForm } from './authentication-form';
export function AccountPanel() {
  const { t } = useI18n();
  const { account, loading, error, refresh } = useAccount();
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  if (loading) return <p>{t('training.trainingLoading')}</p>;
  if (error)
    return (
      <div>
        <p role="alert">{t('training.accountLoadFailed')}</p>
        <button className="mt-3 rounded-lg border px-3 py-2" onClick={() => void refresh()}>
          {t('teacherlab.reload')}
        </button>
      </div>
    );
  async function accountAction(path: string, logout = false) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(path, { method: 'POST' });
      if (logout) {
        if (!response.ok) throw Error();
        window.location.assign('/login');
        return;
      }
      setNotice(response.ok ? t('training.accountClaimSuccess') : t('training.accountClaimNone'));
    } catch {
      setNotice(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5" data-testid="site-account-panel">
      {account?.authenticated ? (
        <>
          <section className="space-y-3 rounded-xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">{account.displayName}</h3>
              <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                {account.adminAccess?.isOwner
                  ? t('teacherlab.adminUi.owner')
                  : account.roles.includes('admin')
                    ? t('teacherlab.administrator')
                    : t('teacherlab.member')}
              </span>
            </div>
            <p className="break-all text-sm">{account.email ?? t('teacherlab.auth.bindIntro')}</p>
            <p className="text-sm text-muted-foreground">
              {account.emailVerified ? t('teacherlab.verified') : t('teacherlab.unverified')}
            </p>
            {account.emailVerified && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p>
                  {t(
                    account.passwordConfigured
                      ? 'teacherlab.auth.passwordConfigured'
                      : 'teacherlab.auth.passwordNotConfigured',
                  )}
                </p>
                <Link href="/login?mode=reset" className="mt-2 inline-flex text-primary underline">
                  {t(
                    account.passwordConfigured
                      ? 'teacherlab.auth.changePassword'
                      : 'teacherlab.auth.setPassword',
                  )}
                </Link>
              </div>
            )}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">{t('training.accountOwnerId')}</summary>
              <p className="mt-2 break-all font-mono">{account.ownerId}</p>
            </details>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                className="min-h-11 rounded-lg border px-3 py-2 text-sm"
                onClick={() => void accountAction('/api/training/accounts/logout', true)}
              >
                {t('training.accountLogout')}
              </button>
              <button
                disabled={busy}
                className="min-h-11 rounded-lg border px-3 py-2 text-sm"
                onClick={() => void accountAction('/api/training/claim')}
              >
                {t('training.accountClaimButton')}
              </button>
            </div>
          </section>
          {!account.emailVerified && (
            <AuthenticationForm initialMode="bind" initialEmail={account.email ?? ''} />
          )}
        </>
      ) : (
        <>
          <AuthenticationForm />
          <Link href="/login" className="inline-flex text-sm text-muted-foreground underline">
            {t('teacherlab.auth.openLoginPage')}
          </Link>
        </>
      )}
      {notice && (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
export function AccountMenu({ onOpen }: { onOpen?: () => void }) {
  const { account } = useAccount(),
    { t } = useI18n();
  return (
    <button
      className="rounded-full border bg-background px-4 py-2 text-sm"
      onClick={() =>
        !account?.authenticated
          ? window.location.assign('/login')
          : onOpen
            ? onOpen()
            : window.location.assign('/?settings=account')
      }
    >
      {account?.authenticated ? account.displayName || account.email : t('teacherlab.auth.login')}
    </button>
  );
}
