'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ServerSettingsGate } from './server-settings';
import type { UserRouting } from '@/lib/training/user-model-routing';
import type { ModelSettingsView } from '@/lib/model-settings/client';
export function UserTrainingModels() {
  return <ServerSettingsGate>{(view) => <RoutingForm view={view} />}</ServerSettingsGate>;
}
function RoutingForm({ view }: { view: ModelSettingsView }) {
  const { t } = useI18n();
  const [routing, setRouting] = useState<UserRouting>({
      roleplay: null,
      evaluation: null,
      characters: {},
    }),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(() => {
    void fetch('/api/training/models/routing')
      .then(async (r) => {
        if (!r.ok) throw Error();
        setRouting((await r.json()).routing);
      })
      .catch(() => setNotice(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE')));
  }, []);
  const options = view.providers
    .filter((p) => p.source === 'workspace')
    .flatMap((p) =>
      (p.models ?? p.capabilities.chat?.models.map((m) => m.id) ?? []).map((id) => ({
        ref: p.id + ':' + id,
        label: p.id + ' / ' + id,
      })),
    );
  async function save() {
    setBusy(true);
    try {
      const r = await fetch('/api/training/models/routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routing),
      });
      if (!r.ok) throw Error();
      setNotice(t('teacherlab.saved'));
    } catch {
      setNotice(t('teacherlab.errors.PERSONAL_MODEL_REQUIRED'));
    } finally {
      setBusy(false);
    }
  }
  const select = (label: string, value: string | null, onChange: (v: string | null) => void) => (
    <label key={label} className="block space-y-1 text-sm">
      {label}
      <select
        className="block w-full rounded border bg-background p-2"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{t('teacherlab.systemDefault')}</option>
        {options.map((o) => (
          <option key={o.ref} value={o.ref}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">{t('teacherlab.personalModelsHint')}</p>
      {select(t('teacherlab.roleModel'), routing.roleplay, (v) =>
        setRouting((r) => ({ ...r, roleplay: v })),
      )}
      {select(t('teacherlab.evaluationModel'), routing.evaluation, (v) =>
        setRouting((r) => ({ ...r, evaluation: v })),
      )}
      {(['parent-1', 'student-1', 'doctor-1', 'principal-1'] as const).map((id) =>
        select(t('teacherlab.characters.' + id), routing.characters[id] ?? null, (v) =>
          setRouting((r) => ({ ...r, characters: { ...r.characters, [id]: v } })),
        ),
      )}
      <button
        disabled={busy}
        onClick={() => void save()}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {t('teacherlab.save')}
      </button>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
