'use client';
import { accountMessage } from '@/components/account/messages';
import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAccount } from '@/components/account/account-provider';
import { AdminHeading, AdminPanel } from './admin-ui';
export function MailSettings() {
  const { t } = useI18n();
  const { account } = useAccount();
  const owner = account?.adminAccess?.isOwner === true;
  const [value, setValue] = useState({
      host: 'smtp.qq.com',
      port: 465,
      username: '',
      from: '',
      password: '',
    }),
    [configured, setConfigured] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(() => {
    if (!owner) return;
    void fetch('/api/admin/mail', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error();
        setConfigured(data.settings.configured);
        setValue({ ...data.settings, password: '' });
      })
      .catch(() => setNotice(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE')));
  }, [owner, t]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const r = await fetch('/api/admin/mail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: value.host,
          port: value.port,
          username: value.username,
          from: value.from,
          ...(value.password ? { password: value.password } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setConfigured(true);
      setValue((v) => ({ ...v, password: '' }));
      setNotice(t('teacherlab.saved'));
    } catch (e) {
      setNotice(accountMessage(t, e instanceof Error ? e.message : 'ACCOUNT_SERVICE_UNAVAILABLE'));
    } finally {
      setBusy(false);
    }
  }
  if (!owner) return null;
  return (
    <div className="teacherlab-admin">
      <AdminHeading
        title={t('teacherlab.mail')}
        description={t('teacherlab.adminUi.ownerMailDescription')}
        action={<span className="admin-badge">{t('teacherlab.adminUi.ownerOnly')}</span>}
      />
      <AdminPanel
        title={t('teacherlab.adminUi.deliverySettings')}
        description={t('teacherlab.mailHint')}
      >
        <form onSubmit={save} className="admin-form-grid">
          <label className="block text-sm">
            {t('teacherlab.smtpHost')}
            <input
              required
              value={value.host}
              onChange={(e) => setValue((v) => ({ ...v, host: e.target.value }))}
              className="block w-full rounded border bg-background p-2"
            />
          </label>
          <label className="block text-sm">
            {t('teacherlab.smtpPort')}
            <select
              value={value.port}
              onChange={(e) => setValue((v) => ({ ...v, port: Number(e.target.value) }))}
              className="block w-full rounded border bg-background p-2"
            >
              <option value={465}>465 · TLS</option>
              <option value={587}>587 · STARTTLS</option>
            </select>
          </label>
          <label className="block text-sm">
            {t('teacherlab.smtpUsername')}
            <input
              required
              value={value.username}
              onChange={(e) => setValue((v) => ({ ...v, username: e.target.value }))}
              className="block w-full rounded border bg-background p-2"
            />
          </label>
          <label className="block text-sm">
            {t('teacherlab.smtpFrom')}
            <input
              required
              type="email"
              value={value.from}
              onChange={(e) => setValue((v) => ({ ...v, from: e.target.value }))}
              className="block w-full rounded border bg-background p-2"
            />
          </label>
          <label className="block text-sm admin-wide">
            {t('teacherlab.smtpPassword')}
            <input
              type="password"
              autoComplete="new-password"
              required={!configured}
              value={value.password}
              onChange={(e) => setValue((v) => ({ ...v, password: e.target.value }))}
              placeholder={configured ? t('teacherlab.passwordSaved') : ''}
              className="block w-full rounded border bg-background p-2"
            />
          </label>
          <button disabled={busy} className="admin-primary justify-self-start">
            {busy ? t('teacherlab.working') : t('teacherlab.save')}
          </button>
          {notice && (
            <p role="status" className="admin-notice admin-wide">
              {notice}
            </p>
          )}
        </form>
      </AdminPanel>
    </div>
  );
}
