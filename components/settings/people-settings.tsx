'use client';
import { accountMessage } from '@/components/account/messages';
import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
interface Person {
  accountId: string;
  displayName: string;
  email: string | null;
  verifiedAt: string | null;
  roles: string[];
  disabled: boolean;
  protected: boolean;
}
export function PeopleSettings() {
  const { t } = useI18n();
  const [users, setUsers] = useState<Person[]>([]),
    [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [admin, setAdmin] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  async function load() {
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setUsers(data.users);
    } catch {
      setNotice(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE'));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function change(value: unknown, method: string) {
    setBusy(true);
    setNotice('');
    try {
      const r = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setNotice(t('teacherlab.saved'));
      await load();
      return true;
    } catch (e) {
      setNotice(accountMessage(t, e instanceof Error ? e.message : 'ACCOUNT_SERVICE_UNAVAILABLE'));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    if (await change({ email, displayName: name, admin }, 'POST')) {
      setEmail('');
      setName('');
      setAdmin(false);
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t('teacherlab.peopleHint')}</p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded border p-3">
        <label className="text-sm">
          {t('teacherlab.email')}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block rounded border bg-background p-2"
          />
        </label>
        <label className="text-sm">
          {t('training.accountDisplayName')}
          <input
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block rounded border bg-background p-2"
          />
        </label>
        <label className="text-sm">
          <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />{' '}
          {t('teacherlab.grantAdmin')}
        </label>
        <button
          disabled={busy}
          className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          {t('teacherlab.addPerson')}
        </button>
      </form>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <ul className="space-y-3">
        {users.map((user) => (
          <li key={user.accountId} className="space-y-2 rounded border p-3">
            <p className="font-medium">
              {user.displayName} ·{' '}
              {user.roles.includes('admin')
                ? t('teacherlab.administrator')
                : t('teacherlab.member')}
            </p>
            <p className="break-all text-xs">
              {user.email ?? user.accountId} ·{' '}
              {user.disabled
                ? t('teacherlab.disabled')
                : user.verifiedAt
                  ? t('teacherlab.verified')
                  : t('teacherlab.unverified')}
            </p>
            {user.protected ? (
              <p className="text-xs text-muted-foreground">{t('teacherlab.bootstrapAdmin')}</p>
            ) : (
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() =>
                    void change(
                      { accountId: user.accountId, admin: !user.roles.includes('admin') },
                      'PATCH',
                    )
                  }
                >
                  {user.roles.includes('admin')
                    ? t('teacherlab.revokeAdmin')
                    : t('teacherlab.grantAdmin')}
                </button>
                <button
                  disabled={busy}
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() =>
                    void change({ accountId: user.accountId, disabled: !user.disabled }, 'PATCH')
                  }
                >
                  {user.disabled ? t('teacherlab.enable') : t('teacherlab.disable')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
