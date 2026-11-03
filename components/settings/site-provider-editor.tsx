'use client';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/account/account-provider';
import { useI18n } from '@/lib/hooks/use-i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Provider = { id: string; baseUrl: string; models: string[]; keyConfigured: boolean };
export function SiteProviderEditor({ providerId }: { providerId: string }) {
  const { account } = useAccount();
  const { t } = useI18n();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [revision, setRevision] = useState(0);
  const [key, setKey] = useState('');
  const [models, setModels] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!account?.adminAccess?.isOwner || providerId === 'teacherlab-gateway') return;
    let active = true;
    setProvider(null);
    setKey('');
    setMessage('');
    void fetch('/api/site-models', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const data = await r.json();
        if (!active) return;
        const found = data.providers.find((p: Provider) => p.id === providerId);
        setProvider(found ?? null);
        setRevision(data.revision);
        setModels(found?.models.join('\n') ?? '');
      })
      .catch(() => {
        if (active) setMessage(t('teacherlab.siteModels.failed'));
      });
    return () => {
      active = false;
    };
  }, [account?.adminAccess?.isOwner, providerId, reload, t]);
  if (!account?.adminAccess?.isOwner) return null;
  if (providerId === 'teacherlab-gateway')
    return <p className="rounded-xl border p-4 text-sm">{t('teacherlab.smartRouting')}</p>;
  return (
    <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">{t('teacherlab.siteModels.title')}</h3>
      <p className="text-xs text-muted-foreground">{t('teacherlab.siteModels.description')}</p>
      {provider && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage('');
            try {
              const r = await fetch('/api/site-models', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: providerId,
                  revision,
                  baseUrl: provider.baseUrl,
                  models: models
                    .split(/[\n,]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                  ...(key ? { apiKey: key } : {}),
                }),
              });
              const data = await r.json();
              if (!r.ok) {
                setMessage(
                  t(
                    data.error === 'new-key-required'
                      ? 'teacherlab.siteModels.newKey'
                      : data.error === 'revision-conflict'
                        ? 'teacherlab.siteModels.conflict'
                        : 'teacherlab.siteModels.failed',
                  ),
                );
                return;
              }
              setKey('');
              setReload((n) => n + 1);
              window.location.reload();
            } catch {
              setMessage(t('teacherlab.siteModels.failed'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block space-y-1 text-xs">
            API URL
            <Input
              type="url"
              required
              value={provider.baseUrl}
              onChange={(e) => setProvider({ ...provider, baseUrl: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-xs">
            API Key
            <Input
              type="password"
              autoComplete="new-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t('teacherlab.siteModels.keepKey')}
            />
          </label>
          <label className="block space-y-1 text-xs">
            {t('teacherlab.siteModels.models')}
            <textarea
              required
              className="min-h-28 w-full rounded-md border bg-background p-2 font-mono"
              value={models}
              onChange={(e) => setModels(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy}>
            {t(busy ? 'modelCenter.working' : 'teacherlab.siteModels.save')}
          </Button>
        </form>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </section>
  );
}
