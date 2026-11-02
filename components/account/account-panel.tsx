'use client';
import { accountMessage } from '@/components/account/messages';
import { useState, type FormEvent } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAccount } from './account-provider';
const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2';
export function AccountPanel() {
  const { t } = useI18n();
  const { account, loading, error, refresh } = useAccount();
  const [email, setEmail] = useState(''),
    [displayName, setDisplayName] = useState(''),
    [code, setCode] = useState(''),
    [challenge, setChallenge] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [sentAt, setSentAt] = useState(0);
  const message = (value: string) => accountMessage(t, value);
  async function sendCode() {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const r = await fetch('/api/auth/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          displayName,
          purpose: account?.authenticated ? 'bind' : 'login',
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setChallenge(data.challengeId);
      setSentAt(Date.now());
      setNotice(t('teacherlab.codeSent'));
    } catch (e) {
      setNotice(message(e instanceof Error ? e.message : 'ACCOUNT_SERVICE_UNAVAILABLE'));
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const r = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge, code }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      window.location.assign('/?settings=account');
    } catch (e) {
      setNotice(message(e instanceof Error ? e.message : 'ACCOUNT_SERVICE_UNAVAILABLE'));
      setBusy(false);
    }
  }
  if (loading) return <p>{t('training.trainingLoading')}</p>;
  if (error)
    return (
      <div>
        <p role="alert">{t('training.accountLoadFailed')}</p>
        <button className="mt-3 rounded border px-3 py-2" onClick={() => void refresh()}>
          {t('teacherlab.reload')}
        </button>
      </div>
    );
  return (
    <div className="space-y-4" data-testid="site-account-panel">
      {account?.authenticated && (
        <section className="space-y-2 rounded-lg border p-4">
          <h3 className="font-medium">{account.displayName}</h3>
          <p className="break-all text-sm">
            {t('training.accountOwnerId')}：{account.ownerId}
          </p>
          <p className="text-sm">
            {account.roles.includes('admin')
              ? t('teacherlab.administrator')
              : t('teacherlab.member')}
          </p>
          {account.email && (
            <p className="text-sm">
              {account.email} ·{' '}
              {account.emailVerified ? t('teacherlab.verified') : t('teacherlab.unverified')}
            </p>
          )}
          <button
            className="rounded border px-3 py-2 text-sm"
            onClick={async () => {
              const r = await fetch('/api/training/accounts/logout', { method: 'POST' });
              if (r.ok) window.location.assign('/');
              else setNotice(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE'));
            }}
          >
            {t('training.accountLogout')}
          </button>
          <button
            className="ml-2 rounded border px-3 py-2 text-sm"
            onClick={async () => {
              const r = await fetch('/api/training/claim', { method: 'POST' });
              setNotice(r.ok ? t('training.accountClaimSuccess') : t('training.accountClaimNone'));
            }}
          >
            {t('training.accountClaimButton')}
          </button>
        </section>
      )}
      {(!account?.authenticated || !account.emailVerified) && (
        <form onSubmit={verify} className="max-w-md space-y-4">
          <h3 className="font-medium">
            {account?.authenticated ? t('teacherlab.bindEmail') : t('teacherlab.emailLogin')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('teacherlab.emailHint')}</p>
          {!account?.authenticated && (
            <label className="block text-sm">
              {t('training.accountDisplayName')}
              <input
                className={inputClass}
                value={displayName}
                maxLength={200}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
              />
            </label>
          )}
          <label className="block text-sm">
            {t('teacherlab.email')}
            <input
              className={inputClass}
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setChallenge('');
                setCode('');
              }}
            />
          </label>
          <button
            type="button"
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            disabled={busy || !email}
            onClick={() => void sendCode()}
          >
            {busy
              ? t('teacherlab.working')
              : sentAt
                ? t('teacherlab.resendCode')
                : t('teacherlab.sendCode')}
          </button>
          <label className="block text-sm">
            {t('teacherlab.verificationCode')}
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
            />
          </label>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            disabled={busy || !challenge || code.length !== 6}
          >
            {account?.authenticated ? t('teacherlab.confirmBind') : t('teacherlab.loginRegister')}
          </button>
        </form>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
export function AccountMenu({ onOpen }: { onOpen?: () => void }) {
  const { account } = useAccount();
  const { t } = useI18n();
  return (
    <button
      className="rounded-full border bg-background px-4 py-2 text-sm"
      onClick={() => (onOpen ? onOpen() : window.location.assign('/?settings=account'))}
    >
      {account?.authenticated
        ? account.displayName || account.email
        : t('teacherlab.loginRegister')}
    </button>
  );
}
