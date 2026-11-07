'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { accountMessage } from './messages';
import './authentication.css';
export type AuthMode = 'password' | 'code' | 'register' | 'reset' | 'bind';
export function AuthenticationForm({
  initialMode = 'password',
  initialEmail = '',
}: {
  initialMode?: AuthMode;
  initialEmail?: string;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>(initialMode),
    [email, setEmail] = useState(initialEmail),
    [displayName, setDisplayName] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [code, setCode] = useState(''),
    [challenge, setChallenge] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [sentAt, setSentAt] = useState(0),
    [now, setNow] = useState(0);
  const needsCode = mode !== 'password',
    newPassword = ['register', 'reset', 'bind'].includes(mode);
  const cooldown = sentAt ? Math.max(0, Math.ceil((sentAt + 60000 - now) / 1000)) : 0;
  useEffect(() => {
    if (!sentAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);
  const changeMode = (value: AuthMode) => {
    if (busy) return;
    setMode(value);
    setPassword('');
    setConfirmation('');
    setChallenge('');
    setCode('');
    setNotice('');
    setSentAt(0);
  };
  const title = t(
    'teacherlab.auth.' +
      {
        password: 'loginTitle',
        code: 'codeTitle',
        register: 'registerTitle',
        reset: 'resetTitle',
        bind: 'bindTitle',
      }[mode],
  );
  async function sendCode() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/auth/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, purpose: mode === 'code' ? 'login' : mode }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setChallenge(data.challengeId);
      setSentAt(Date.now());
      setNow(Date.now());
      setNotice(t('teacherlab.codeSent'));
    } catch (error) {
      setNotice(
        accountMessage(t, error instanceof Error ? error.message : 'ACCOUNT_SERVICE_UNAVAILABLE'),
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (newPassword && password !== confirmation) {
      setNotice(t('teacherlab.auth.passwordMismatch'));
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(
        mode === 'password' ? '/api/auth/password/login' : '/api/auth/email/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'password'
              ? { email, password }
              : { challengeId: challenge, code, ...(newPassword ? { password } : {}) },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const expected = mode === 'code' ? 'login' : mode;
      if (mode !== 'password' && data.purpose !== expected) throw Error('INVALID_REQUEST');
      setPassword('');
      setConfirmation('');
      window.location.assign(
        mode === 'register'
          ? '/login?registered=1'
          : mode === 'reset'
            ? '/login?reset=1'
            : mode === 'bind'
              ? '/?settings=account'
              : '/',
      );
    } catch (error) {
      setNotice(
        accountMessage(t, error instanceof Error ? error.message : 'ACCOUNT_SERVICE_UNAVAILABLE'),
      );
      setBusy(false);
    }
  }
  return (
    <div className="teacherlab-auth" data-testid="authentication-form">
      {mode !== 'bind' && (
        <nav className="auth-tabs" aria-label={t('teacherlab.auth.accountAccess')}>
          <Link
            href="/login"
            aria-current={mode === 'password' || mode === 'code' ? 'page' : undefined}
          >
            {t('teacherlab.auth.login')}
          </Link>
          <Link href="/register" aria-current={mode === 'register' ? 'page' : undefined}>
            {t('teacherlab.auth.register')}
          </Link>
        </nav>
      )}
      <h2>{title}</h2>
      <p className="auth-intro">
        {t(
          'teacherlab.auth.' +
            (mode === 'password'
              ? 'passwordIntro'
              : mode === 'register'
                ? 'registerIntro'
                : mode === 'reset'
                  ? 'resetIntro'
                  : mode === 'bind'
                    ? 'bindIntro'
                    : 'codeIntro'),
        )}
      </p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <label>
            {t('training.accountDisplayName')}
            <input
              disabled={busy}
              value={displayName}
              maxLength={200}
              autoComplete="nickname"
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}
        <label>
          {t('teacherlab.email')}
          <input
            disabled={busy}
            required
            type="email"
            maxLength={254}
            value={email}
            autoComplete="username"
            onChange={(event) => {
              setEmail(event.target.value);
              setChallenge('');
              setCode('');
              setNotice('');
              setSentAt(0);
            }}
          />
        </label>
        {needsCode && (
          <label>
            {t('teacherlab.verificationCode')}
            <span className="auth-code-row">
              <input
                disabled={busy}
                required
                value={code}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="button"
                disabled={busy || !email || cooldown > 0}
                onClick={() => void sendCode()}
              >
                {cooldown > 0
                  ? `${cooldown}s`
                  : t(sentAt ? 'teacherlab.resendCode' : 'teacherlab.sendCode')}
              </button>
            </span>
          </label>
        )}
        {(mode === 'password' || newPassword) && (
          <label>
            {t(newPassword ? 'teacherlab.auth.newPassword' : 'teacherlab.auth.password')}
            <span className="auth-password">
              <input
                disabled={busy}
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                minLength={newPassword ? 8 : 1}
                maxLength={128}
                autoComplete={newPassword ? 'new-password' : 'current-password'}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={t(
                  showPassword ? 'teacherlab.auth.hidePassword' : 'teacherlab.auth.showPassword',
                )}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {newPassword && <small>{t('teacherlab.auth.passwordRules')}</small>}
          </label>
        )}
        {newPassword && (
          <label>
            {t('teacherlab.auth.confirmPassword')}
            <input
              disabled={busy}
              required
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
        )}
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        <button
          className="auth-submit"
          disabled={busy || (needsCode && (!challenge || code.length !== 6))}
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}{' '}
          {t(
            'teacherlab.auth.' +
              (mode === 'register'
                ? 'register'
                : mode === 'reset'
                  ? 'savePassword'
                  : mode === 'bind'
                    ? 'verifyBind'
                    : 'login'),
          )}
        </button>
      </form>
      {(mode === 'password' || mode === 'code') && (
        <div className="auth-other">
          <button
            type="button"
            onClick={() => changeMode(mode === 'password' ? 'code' : 'password')}
          >
            {t(mode === 'password' ? 'teacherlab.auth.useCode' : 'teacherlab.auth.usePassword')}
          </button>
          <button type="button" onClick={() => changeMode('reset')}>
            {t('teacherlab.auth.forgotPassword')}
          </button>
        </div>
      )}
      {mode === 'reset' && (
        <button className="auth-back" onClick={() => changeMode('password')}>
          {t('teacherlab.auth.backToLogin')}
        </button>
      )}
    </div>
  );
}
