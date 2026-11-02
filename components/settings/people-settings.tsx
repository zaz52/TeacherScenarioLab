'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Search, Plus, ShieldCheck, RefreshCw } from 'lucide-react';
import { accountMessage } from '@/components/account/messages';
import { useAccount } from '@/components/account/account-provider';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  hasAdminPermission,
} from '@/lib/training/admin-permissions';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminHeading, AdminPanel, AdminNotice } from './admin-ui';
interface Person {
  accountId: string;
  displayName: string;
  email: string | null;
  verifiedAt: string | null;
  roles: string[];
  disabled: boolean;
  protected: boolean;
  isOwner: boolean;
  permissions: AdminPermission[];
}
function PermissionPicker({
  value,
  onChange,
  disabled,
}: {
  value: AdminPermission[];
  onChange: (value: AdminPermission[]) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <fieldset disabled={disabled} className="admin-permission-grid">
      <legend className="sr-only">{t('teacherlab.adminUi.permissions')}</legend>
      {ADMIN_PERMISSIONS.map((permission) => (
        <label className="admin-permission" key={permission}>
          <input
            type="checkbox"
            checked={value.includes(permission)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...value, permission]
                  : value.filter((item) => item !== permission),
              )
            }
          />
          <span>
            {t(`teacherlab.adminUi.permissionLabels.${permission.split('.')[0]}`)}
            <small>{t(`teacherlab.adminUi.permissionHints.${permission.split('.')[0]}`)}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
export function PeopleSettings() {
  const { t } = useI18n(),
    { account } = useAccount();
  const owner = account?.adminAccess?.isOwner === true;
  const [users, setUsers] = useState<Person[]>([]),
    [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [admin, setAdmin] = useState(false),
    [permissions, setPermissions] = useState<AdminPermission[]>([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(false),
    [search, setSearch] = useState(''),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Person | null>(null),
    [draftPermissions, setDraftPermissions] = useState<AdminPermission[]>([]);
  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setUsers(data.users);
    } catch {
      setError(true);
      setNotice(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function change(value: unknown, method: string) {
    setBusy(true);
    setNotice('');
    setError(false);
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
      setError(true);
      setNotice(accountMessage(t, e instanceof Error ? e.message : 'ACCOUNT_SERVICE_UNAVAILABLE'));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    if (
      await change(
        {
          email,
          displayName: name,
          admin: owner && admin,
          ...(owner && admin ? { permissions } : {}),
        },
        'POST',
      )
    ) {
      setEmail('');
      setName('');
      setAdmin(false);
      setPermissions([]);
      setAdding(false);
    }
  }
  const visible = users.filter((user) =>
    `${user.displayName} ${user.email ?? ''} ${user.accountId}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  if (!hasAdminPermission(account?.adminAccess, 'people.manage'))
    return <AdminNotice error>{t('training.adminRequired')}</AdminNotice>;
  return (
    <div className="teacherlab-admin">
      <AdminHeading
        title={t('teacherlab.people')}
        description={t('teacherlab.adminUi.peopleDescription')}
        action={
          <button className="admin-primary" onClick={() => setAdding((value) => !value)}>
            <Plus size={15} />
            {t('teacherlab.addPerson')}
          </button>
        }
      />
      <dl className="admin-stats">
        <div className="admin-stat">
          <dt>{t('teacherlab.adminUi.loadedPeople')}</dt>
          <dd>{users.length}</dd>
        </div>
        <div className="admin-stat">
          <dt>{t('teacherlab.administrator')}</dt>
          <dd>{users.filter((user) => user.roles.includes('admin')).length}</dd>
        </div>
        <div className="admin-stat">
          <dt>{t('teacherlab.disabled')}</dt>
          <dd>{users.filter((user) => user.disabled).length}</dd>
        </div>
      </dl>
      {notice && <AdminNotice error={error}>{notice}</AdminNotice>}
      {adding && (
        <AdminPanel title={t('teacherlab.addPerson')} description={t('teacherlab.peopleHint')}>
          <form onSubmit={add} className="admin-form-grid">
            <label>
              {t('teacherlab.email')}
              <input
                required
                type="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              {t('training.accountDisplayName')}
              <input
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            {owner && (
              <div className="admin-wide">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={admin}
                    onChange={(event) => setAdmin(event.target.checked)}
                  />
                  {t('teacherlab.grantAdmin')}
                </label>
                {admin && (
                  <PermissionPicker value={permissions} onChange={setPermissions} disabled={busy} />
                )}
              </div>
            )}
            <div className="admin-wide admin-actions">
              <button disabled={busy} className="admin-primary">
                {busy ? t('teacherlab.working') : t('teacherlab.addPerson')}
              </button>
              <button type="button" disabled={busy} onClick={() => setAdding(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </AdminPanel>
      )}
      <AdminPanel
        title={t('teacherlab.adminUi.memberList')}
        action={
          <button disabled={loading || busy} onClick={() => void load()}>
            <RefreshCw size={14} />
            {t('modelCenter.refresh')}
          </button>
        }
      >
        <label className="mb-5 block">
          <span className="flex items-center gap-2">
            <Search size={14} />
            {t('teacherlab.adminUi.findPeople')}
          </span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {loading && <p className="admin-empty">{t('teacherlab.working')}</p>}
        {!loading && visible.length === 0 && (
          <p className="admin-empty">{t('teacherlab.adminUi.noPeople')}</p>
        )}
        <ul className="admin-list">
          {visible.map((user) => (
            <li key={user.accountId} className="admin-row">
              <div className="admin-row-info">
                <p className="font-medium">
                  {user.displayName}{' '}
                  <span className="admin-badge">
                    {user.isOwner
                      ? t('teacherlab.adminUi.owner')
                      : user.roles.includes('admin')
                        ? t('teacherlab.administrator')
                        : t('teacherlab.member')}
                  </span>
                </p>
                <p className="admin-meta">{user.email ?? user.accountId}</p>
                <p className="admin-meta">
                  {user.disabled
                    ? t('teacherlab.disabled')
                    : user.verifiedAt
                      ? t('teacherlab.verified')
                      : t('teacherlab.unverified')}
                </p>
                {user.roles.includes('admin') && !user.isOwner && (
                  <p className="admin-meta">
                    {user.permissions.length
                      ? user.permissions
                          .map((permission) =>
                            t(`teacherlab.adminUi.permissionLabels.${permission.split('.')[0]}`),
                          )
                          .join(' · ')
                      : t('teacherlab.adminUi.noPermissions')}
                  </p>
                )}
              </div>
              {!user.protected &&
                user.accountId !== account?.ownerId &&
                (owner || !user.roles.includes('admin')) && (
                  <div className="admin-actions">
                    {owner && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          setDraftPermissions(user.permissions);
                          setEditing(user);
                        }}
                      >
                        <ShieldCheck size={14} />
                        {t(
                          user.roles.includes('admin')
                            ? 'teacherlab.adminUi.permissions'
                            : 'teacherlab.grantAdmin',
                        )}
                      </button>
                    )}
                    {owner && user.roles.includes('admin') && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(t('teacherlab.adminUi.confirmRevoke')))
                            void change({ accountId: user.accountId, admin: false }, 'PATCH');
                        }}
                      >
                        {t('teacherlab.revokeAdmin')}
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (user.disabled || window.confirm(t('teacherlab.adminUi.confirmDisable')))
                          void change(
                            { accountId: user.accountId, disabled: !user.disabled },
                            'PATCH',
                          );
                      }}
                    >
                      {t(user.disabled ? 'teacherlab.enable' : 'teacherlab.disable')}
                    </button>
                  </div>
                )}
            </li>
          ))}
        </ul>
      </AdminPanel>
      {owner && <AdminNotice>{t('teacherlab.adminUi.ownerScope')}</AdminNotice>}
      <Dialog
        open={Boolean(editing) && owner}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent className="teacherlab-admin max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>
            {t('teacherlab.adminUi.permissions')} · {editing?.displayName}
          </DialogTitle>
          <DialogDescription>{t('teacherlab.adminUi.permissionsHint')}</DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (editing)
                void change(
                  { accountId: editing.accountId, admin: true, permissions: draftPermissions },
                  'PATCH',
                ).then((ok) => {
                  if (ok) setEditing(null);
                });
            }}
          >
            <PermissionPicker
              value={draftPermissions}
              onChange={setDraftPermissions}
              disabled={busy}
            />
            {error && notice && <AdminNotice error>{notice}</AdminNotice>}
            <AdminNotice>{t('teacherlab.adminUi.ownerScope')}</AdminNotice>
            <div className="admin-actions">
              <button className="admin-primary" disabled={busy}>
                {busy ? t('teacherlab.working') : t('teacherlab.save')}
              </button>
              <button type="button" disabled={busy} onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
