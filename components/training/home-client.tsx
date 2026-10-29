'use client';

/**
 * TeacherScenarioLab — product homepage (client island).
 *
 * Rendered by app/page.tsx, which owns the document metadata. Copy comes
 * from the training i18n block; visuals come from the upstream design
 * system (shadcn Button/Card + theme tokens + Geist/Inter fonts). Every
 * entry below points at a route that exists, and every capability listed
 * is a function that already runs — nothing unimplemented is advertised.
 * The admin card appears only after /api/training/accounts/me reports an
 * admin role; the admin routes still enforce 403 server-side.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientTranslation } from '@/lib/i18n';

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

interface MeState {
  authenticated: boolean;
  roles: string[];
  displayName: string | null;
}

const CAPABILITIES = [
  { title: 'homeCapRoles', desc: 'homeCapRolesDesc' },
  { title: 'homeCapInfo', desc: 'homeCapInfoDesc' },
  { title: 'homeCapTraining', desc: 'homeCapTrainingDesc' },
  { title: 'homeCapEval', desc: 'homeCapEvalDesc' },
  { title: 'homeCapRefs', desc: 'homeCapRefsDesc' },
] as const;

export function TrainingHomeClient() {
  const [me, setMe] = useState<MeState | null>(null);
  const [creating, setCreating] = useState(false);
  const [accountError, setAccountError] = useState('');

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch('/api/training/accounts/me');
      const data = await res.json();
      if (res.ok && data.success) {
        setMe({
          authenticated: data.authenticated === true,
          roles: Array.isArray(data.roles) ? data.roles : [],
          displayName: data.displayName ?? null,
        });
      }
    } catch {
      // Anonymous fallback: account card offers creation.
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const isAdmin = me?.roles.includes('admin') === true;

  async function createAccount() {
    if (creating) return;
    setCreating(true);
    setAccountError('');
    try {
      const res = await fetch('/api/training/accounts', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('create failed');
      await loadMe();
    } catch {
      setAccountError(t('loadFailed'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 bg-background p-6 text-foreground">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t('homeTitle')}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t('homeTagline')}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/training/hall">{t('homeStart')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/training/records">{t('homeRecords')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/training/references">{t('homeReferences')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/courseware">{t('navCourseware')}</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('homeStart')}</CardTitle>
            <CardDescription>{t('homeStartDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" asChild className="px-0">
              <Link href="/training/hall">{t('homeStart')} →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('homeRecords')}</CardTitle>
            <CardDescription>{t('homeRecordsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" asChild className="px-0">
              <Link href="/training/records">{t('homeRecords')} →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('homeReferences')}</CardTitle>
            <CardDescription>{t('homeReferencesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" asChild className="px-0">
              <Link href="/training/references">{t('homeReferences')} →</Link>
            </Button>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>{t('homeAdmin')}</CardTitle>
              <CardDescription>{t('homeAdminDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" asChild className="px-0">
                <Link href="/training/admin">{t('homeAdmin')} →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('homeCapabilitiesTitle')}</h2>
        <ul className="flex flex-col gap-3">
          {CAPABILITIES.map((cap) => (
            <li key={cap.title}>
              <p className="text-sm font-medium">{t(cap.title)}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t(cap.desc)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{t('homeAccount')}</CardTitle>
            <CardDescription>{t('homeAccountNote')}</CardDescription>
          </CardHeader>
          <CardContent>
            {me === null ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : me.authenticated ? (
              <p className="text-sm">
                {t('homeAccountCreated')}：{me.displayName ?? t('homeAccount')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <Button onClick={() => void createAccount()} disabled={creating}>
                  {creating ? t('loading') : t('homeAccountCreate')}
                </Button>
                {accountError && <p className="text-sm text-destructive">{accountError}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
