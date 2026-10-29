'use client';

/**
 * TeacherScenarioLab — account page: who the learner is, where their
 * records live, how to log out, and how to claim anonymous trainings.
 * Everything here reuses existing APIs: accounts/me, accounts/logout and
 * claim. Claiming needs no body: the server only honors a pending claim
 * (a valid account session presented together with the anonymous cookie),
 * and a body field naming an owner is deliberately ignored server-side.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

interface MeInfo {
  authenticated: boolean;
  ownerId: string;
  kind: string;
  roles: string[];
  displayName: string | null;
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function TrainingAccountPage() {
  const [me, setMe] = useState<MeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/training/accounts/me');
      const data = (await res.json()) as MeInfo & { success?: boolean };
      if (!res.ok) throw new Error('load failed');
      setMe(data);
    } catch {
      setError(t('accountLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    setNotice('');
    try {
      const res = await fetch('/api/training/accounts/logout', { method: 'POST' });
      if (!res.ok) {
        setNotice(t('accountClaimFailed'));
        return;
      }
      setNotice(t('accountLogoutDone'));
      await load();
    } catch {
      setNotice(t('accountClaimFailed'));
    }
  }

  async function claim() {
    setNotice('');
    try {
      const res = await fetch('/api/training/claim', { method: 'POST' });
      const data = (await res.json()) as { success?: boolean; claimed?: number };
      if (res.status === 409) {
        setNotice(t('accountClaimNone'));
        return;
      }
      if (!res.ok || !data.success) {
        setNotice(t('accountClaimFailed'));
        return;
      }
      setNotice(`${t('accountClaimSuccess')}：${data.claimed ?? 0}`);
    } catch {
      setNotice(t('accountClaimFailed'));
    }
  }

  if (loading)
    return (
      <main>
        <p>{t('trainingLoading')}</p>
      </main>
    );
  if (error)
    return (
      <main>
        <p>{error}</p>
      </main>
    );
  if (!me)
    return (
      <main>
        <p>{t('accountLoadFailed')}</p>
      </main>
    );

  return (
    <main>
      <h1>{t('accountTitle')}</h1>
      {notice && <p>{notice}</p>}
      {!me.authenticated && (
        <section>
          <p>{t('accountAnonymous')}</p>
          <p>
            <Link href="/">{t('navHome')}</Link>
          </p>
        </section>
      )}
      {me.authenticated && (
        <>
          <section>
            <h2>{t('accountInfo')}</h2>
            <p>
              {t('accountDisplayName')}：{me.displayName ?? '—'}
            </p>
            <p>
              {t('accountOwnerId')}：{me.ownerId}
            </p>
            <p>
              {t('accountRoles')}：{me.roles.length > 0 ? me.roles.join('、') : '—'}
            </p>
            <p>
              <Link href="/training/records">{t('navRecords')}</Link>
            </p>
            <p>
              <button onClick={() => void logout()}>{t('accountLogout')}</button>
            </p>
          </section>
          <section>
            <h2>{t('accountClaimTitle')}</h2>
            <p>{t('accountClaimDesc')}</p>
            <p>
              <button onClick={() => void claim()}>{t('accountClaimButton')}</button>
            </p>
          </section>
        </>
      )}
    </main>
  );
}
