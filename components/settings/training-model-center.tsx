'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getClientTranslation } from '@/lib/i18n';
import {
  modelKey,
  policySchema,
  type ModelPolicy,
  type ModelTask,
} from '@/lib/training/models/types';
import type { poolOverview } from '@/lib/training/models/store';
import type { providerSummaries } from '@/lib/training/models/providers';

type Overview = Awaited<ReturnType<typeof poolOverview>> & {
  providers: ReturnType<typeof providerSummaries>;
  privacy: { source: string; verifiedAt: string };
};
export type CenterView = 'overview' | 'providers' | 'quotas' | 'routing' | 'logs';
const t = (key: string) => getClientTranslation(`modelCenter.${key}`);
const number = (value: number | null | undefined) =>
  value == null ? t('unknown') : Math.round(value * 100) / 100;
const date = (value: number | null | undefined) =>
  value ? new Date(value).toLocaleString() : t('unknown');

export function ModelCenter({ view = 'overview' }: { view?: CenterView }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ModelPolicy | null>(null);
  const [selected, setSelected] = useState('');
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/training/admin/models', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError(t('accessError'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(command: unknown) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/training/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (!r.ok) throw new Error();
      await load();
      return true;
    } catch {
      setError(t('actionError'));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <nav aria-label={t('title')} className="flex flex-wrap gap-4">
        {(['overview', 'providers', 'quotas', 'routing', 'logs'] as const).map((tab) => (
          <Link
            key={tab}
            aria-current={view === tab ? 'page' : undefined}
            href={`/settings/training/models${tab === 'overview' ? '' : `/${tab}`}`}
            className="underline"
          >
            {t(tab)}
          </Link>
        ))}
        <Link href="/settings/training">{getClientTranslation('training.navAdmin')}</Link>
      </nav>
      <p className="rounded border p-3 text-sm">
        {t('privacyNote')}{' '}
        {data && (
          <a className="underline" href={data.privacy.source} target="_blank" rel="noreferrer">
            {t('policySource')} · {data.privacy.verifiedAt}
          </a>
        )}
      </p>
      <p className="text-sm">{t('costNote')}</p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button disabled={busy} onClick={() => void load()} className="rounded border px-3 py-2">
        {busy ? t('working') : t('refresh')}
      </button>
      {!data && !error && <p>{t('working')}</p>}
      {data && (view === 'providers' || view === 'overview') && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.providers.map((provider) => (
            <article className="space-y-2 rounded border p-4" key={provider.id}>
              <h2 className="font-semibold">{provider.id}</h2>
              <p>{provider.configured ? t('configured') : t('missing')}</p>
              <p className="text-xs">{provider.keyVariable}</p>
              <a
                className="text-sm underline"
                target="_blank"
                rel="noreferrer"
                href={provider.policySource}
              >
                {t('policySource')} · {provider.verifiedAt}
              </a>
              <button
                disabled={busy || !provider.configured}
                onClick={() => void action({ action: 'catalog', provider: provider.id })}
                className="block rounded border p-2"
              >
                {t('catalog')}
              </button>
              {data.catalogs
                .filter((c) => c.provider === provider.id)
                .map((c) => (
                  <div key={c.provider}>
                    <p>
                      {c.httpStatus ?? t('unknown')} · {date(c.checkedAt)} ·{' '}
                      {c.error ?? t('available')}
                    </p>
                    <select
                      aria-label={`${provider.id} ${t('model')}`}
                      className="w-full rounded border p-2"
                      value={selected.startsWith(`${provider.id}:`) ? selected : ''}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="">{t('choose')}</option>
                      {c.models.map((id) => (
                        <option value={`${provider.id}:${id}`} key={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={busy || !selected.startsWith(`${provider.id}:`)}
                      className="mt-2 rounded border p-2"
                      onClick={() => {
                        const id = selected.slice(provider.id.length + 1);
                        setEditing(
                          data.policies.find((p) => modelKey(p) === selected) ??
                            policySchema.parse({
                              provider: provider.id,
                              modelId: id,
                              tasks: ['roleplay', 'evaluation'],
                            }),
                        );
                      }}
                    >
                      {t('configure')}
                    </button>
                  </div>
                ))}
            </article>
          ))}
        </section>
      )}
      {data && (view === 'quotas' || view === 'overview') && (
        <section className="grid gap-4 md:grid-cols-2">
          {data.policies.map((p) => {
            const key = modelKey(p);
            const m = data.metrics.find((m) => m.key === key)!;
            return (
              <article key={key} className="space-y-2 rounded border p-4">
                <h2 className="break-all font-semibold">
                  {key} · {t(p.enabled ? 'enabled' : 'paused')}
                </h2>
                <p>
                  {t(p.quotaScope === 'local-budget' ? 'localBudget' : 'quota')}: {number(p.total)}{' '}
                  / {number(p.remaining)} {p.quotaUnit} · {t(p.quotaSource)}
                </p>
                <p>
                  {t('estimate')}: {number(m.remainingEstimate)} · {t('used')}:{' '}
                  {number(m.usedEstimate)}
                </p>
                <p>
                  {t('requestsToday')}: {m.requestsToday} · {t('tokens')}: {number(m.inputTokens)} /{' '}
                  {number(m.outputTokens)}
                </p>
                <p>
                  {t('reset')}: {date(p.resetAt)} · {t('expiry')}: {date(p.expiresAt)}
                </p>
                <p>
                  {t('lastCall')}: {date(m.lastCall?.startedAt)} ·{' '}
                  {m.lastCall?.status ?? t('unknown')}
                </p>
                <p role="status">{m.alerts.map((a) => t(a)).join(' · ')}</p>
                {m.cooldown && (
                  <p role="alert">
                    {t('cooldown')}: {m.cooldown.kind} · {date(m.cooldown.retryAt)}
                  </p>
                )}
                <button
                  disabled={busy}
                  className="rounded border p-2"
                  onClick={() => setEditing(p)}
                >
                  {t('configure')}
                </button>
                <button
                  disabled={busy}
                  className="ml-2 rounded border p-2"
                  onClick={() =>
                    void action({ action: 'policy', policy: { ...p, enabled: !p.enabled } })
                  }
                >
                  {t(p.enabled ? 'pause' : 'resume')}
                </button>
              </article>
            );
          })}
        </section>
      )}
      {data && (view === 'routing' || view === 'overview') && (
        <section className="space-y-4 rounded border p-4">
          <h2 className="font-semibold">{t('routing')}</h2>
          <p>{t('orderNote')}</p>
          {(['roleplay', 'evaluation'] as const).map((task) => (
            <div key={task} className="space-y-2">
              <label className="block">
                {t(task)}{' '}
                <select
                  disabled={busy}
                  value={data.routing[task] ?? ''}
                  onChange={(e) =>
                    void action({
                      action: 'routing',
                      routing: { ...data.routing, [task]: e.target.value || null },
                    })
                  }
                  className="rounded border p-2"
                >
                  <option value="">{t('automatic')}</option>
                  {data.policies
                    .filter((p) => p.tasks.includes(task) && p.provider !== 'nvidia')
                    .map((p) => (
                      <option key={modelKey(p)} value={modelKey(p)}>
                        {modelKey(p)}
                      </option>
                    ))}
                </select>
              </label>
              {data.policies
                .filter((p) => p.tasks.includes(task))
                .map((p) => {
                  const q = data.qualifications.find(
                    (q) => q.key === modelKey(p) && q.task === task,
                  );
                  return (
                    <div key={modelKey(p)} className="flex flex-wrap items-center gap-2 text-sm">
                      <span>
                        {modelKey(p)} ·{' '}
                        {q
                          ? t(
                              q.suiteVersion !== 2
                                ? 'untested'
                                : q.passed
                                  ? 'qualified'
                                  : q.successes + q.failures > 0
                                    ? 'failed'
                                    : 'untested',
                            )
                          : t('untested')}{' '}
                        · {q ? `${q.successes}/${q.cases}` : ''}
                      </span>
                      <button
                        className="rounded border p-2"
                        disabled={busy || !p.enabled}
                        onClick={() => void action({ action: 'qualify', key: modelKey(p), task })}
                      >
                        {t('realTest')}
                      </button>
                      {q && (
                        <details className="w-full rounded border p-2">
                          <summary className="cursor-pointer">{t('testDetails')}</summary>
                          <p>
                            {t('lastCall')}: {date(q.checkedAt)} · {q.failureKind ?? '—'} ·{' '}
                            {t('samples')}: {q.successes}/{q.cases} · {t('skipped')}:{' '}
                            {q.skipped ?? 0}
                          </p>
                          {q.blockedFactIds?.length ? (
                            <p>
                              {t('blockedFacts')}: {q.blockedFactIds.join(', ')}
                            </p>
                          ) : null}
                          {q.samples?.map((sample) => (
                            <div key={sample.caseIndex} className="my-2">
                              <p>
                                {t('case')}: {sample.caseIndex}{' '}
                                {sample.truncated ? t('truncated') : ''}
                              </p>
                              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-gray-900">
                                {sample.output}
                              </pre>
                            </div>
                          ))}
                        </details>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
          <p className="text-sm">{t('testNote')}</p>
        </section>
      )}
      {data && (view === 'logs' || view === 'overview') && (
        <section className="overflow-x-auto rounded border p-4">
          <h2 className="font-semibold">{t('performance')}</h2>
          <p className="text-sm">{t('metricsNote')}</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {['model', 'samples', 'average', 'p50', 'p95', 'success', 'json'].map((k) => (
                  <th className="p-2" key={k}>
                    {t(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((m) => (
                <tr key={m.key}>
                  <td className="p-2">{m.key}</td>
                  <td>{m.sampleSize}</td>
                  <td>{number(m.averageMs)}</td>
                  <td>{number(m.p50Ms)}</td>
                  <td>{number(m.p95Ms)}</td>
                  <td>{number(m.successRate === null ? null : m.successRate * 100)}%</td>
                  <td>{number(m.jsonRate === null ? null : m.jsonRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-4 font-semibold">{t('logs')}</h3>
          <ul className="max-h-96 overflow-auto text-sm">
            {data.calls.map((c) => (
              <li className="border-b py-2" key={c.id}>
                {date(c.startedAt)} · {c.key} · {t(c.task)} · {c.purpose} · {c.status} · HTTP{' '}
                {c.httpStatus ?? '—'} · {c.kind ?? '—'} · {c.durationMs} ms
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">{t('audit')}</h3>
          <ul className="max-h-48 overflow-auto text-sm">
            {data.audit.map((a, i) => (
              <li key={i}>
                {date(a.createdAt)} · {a.action} · {a.actor}
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && (
        <PolicyEditor
          key={modelKey(editing)}
          policy={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (policy) => {
            if (await action({ action: 'policy', policy })) setEditing(null);
          }}
        />
      )}
    </main>
  );
}

function PolicyEditor({
  policy,
  busy,
  onCancel,
  onSave,
}: {
  policy: ModelPolicy;
  busy: boolean;
  onCancel: () => void;
  onSave: (p: ModelPolicy) => Promise<void>;
}) {
  const [value, setValue] = useState(policy);
  const [validationError, setValidationError] = useState('');
  const update = <K extends keyof ModelPolicy>(key: K, v: ModelPolicy[K]) =>
    setValue((p) => ({ ...p, [key]: v }));
  const numeric = (key: keyof ModelPolicy, label: string, nullable = false) => (
    <label key={key} className="block">
      {t(label)}
      <input
        className="block w-full rounded border p-2"
        type="number"
        min="0"
        step="any"
        value={value[key] === null ? '' : String(value[key])}
        onChange={(e) =>
          update(key, (e.target.value === '' && nullable ? null : Number(e.target.value)) as never)
        }
      />
    </label>
  );
  const checkbox = (key: 'enabled' | 'privacyReviewed' | 'nvidiaAuthorized', label: string) => (
    <label className="block" key={key}>
      <input type="checkbox" checked={value[key]} onChange={(e) => update(key, e.target.checked)} />{' '}
      {t(label)}
    </label>
  );
  return (
    <section className="space-y-4 rounded border-2 p-5" aria-label={t('configure')}>
      <h2 className="font-semibold">
        {t('configure')} · {modelKey(value)}
      </h2>
      {validationError && (
        <p role="alert" className="text-red-700">
          {validationError}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = policySchema.safeParse(value);
          setValidationError(parsed.success ? '' : t('actionError'));
          if (parsed.success)
            void onSave({ ...parsed.data, quotaSource: 'admin-entered', observedAt: Date.now() });
        }}
        className="space-y-4"
      >
        {checkbox('enabled', 'enabled')}
        {checkbox('privacyReviewed', 'privacyReviewed')}
        <div className="flex gap-4">
          {(['roleplay', 'evaluation'] as ModelTask[]).map((task) => (
            <label key={task}>
              <input
                type="checkbox"
                checked={value.tasks.includes(task)}
                onChange={(e) =>
                  update(
                    'tasks',
                    e.target.checked
                      ? [...value.tasks, task]
                      : value.tasks.filter((t) => t !== task),
                  )
                }
              />{' '}
              {t(task)}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            {t('free')}
            <select
              className="block rounded border p-2"
              value={value.free}
              onChange={(e) => update('free', e.target.value as ModelPolicy['free'])}
            >
              {['unknown', 'zero-price', 'free-plan', 'credit', 'paid'].map((v) => (
                <option key={v} value={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('quotaKind')}
            <select
              className="block rounded border p-2"
              value={value.quotaKind}
              onChange={(e) => update('quotaKind', e.target.value as ModelPolicy['quotaKind'])}
            >
              {['unknown', 'one-time', 'expiring', 'daily', 'monthly', 'zero-price', 'paid'].map(
                (v) => (
                  <option key={v} value={v}>
                    {t(v)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            {t('quotaScope')}
            <select
              className="block rounded border p-2"
              value={value.quotaScope}
              onChange={(e) => update('quotaScope', e.target.value as ModelPolicy['quotaScope'])}
            >
              <option value="local-budget">{t('localBudget')}</option>
              <option value="provider-balance">{t('quota')}</option>
            </select>
          </label>
          <label>
            {t('unit')}
            <select
              className="block rounded border p-2"
              value={value.quotaUnit}
              onChange={(e) => update('quotaUnit', e.target.value as ModelPolicy['quotaUnit'])}
            >
              {['requests', 'tokens', 'neurons', 'usd'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {numeric('total', 'total', true)}
          {numeric('remaining', 'remaining', true)}
          {numeric('reservePerCall', 'reserve', true)}
          {numeric('rpm', 'rpm')}
          {numeric('tpm', 'tpm')}
          {numeric('rpd', 'rpd')}
          {numeric('concurrency', 'concurrency')}
          {numeric('maxOutputTokens', 'outputCap')}
          {numeric('timeoutMs', 'timeout')}
          {numeric('warningPercent', 'warning')}
          {(['resetAt', 'expiresAt', 'accountVerifiedUntil'] as const).map((key) => (
            <label key={key}>
              {t(key)}
              <input
                type="datetime-local"
                className="block rounded border p-2"
                value={
                  value[key]
                    ? new Date(value[key]! - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  update(key, e.target.value ? new Date(e.target.value).getTime() : null)
                }
              />
            </label>
          ))}
        </div>
        <p>{t('quotaNote')}</p>
        {value.provider === 'nvidia' && (
          <fieldset className="space-y-3 rounded border p-3">
            <legend>{t('nvidia')}</legend>
            {checkbox('nvidiaAuthorized', 'authorizeNvidia')}
            <div className="grid gap-3 sm:grid-cols-2">
              {numeric('dailyBudgetUsd', 'dailyBudget')}
              {numeric('perCallBudgetUsd', 'perCallBudget')}
              {numeric('inputUsdPerMillion', 'inputPrice', true)}
              {numeric('outputUsdPerMillion', 'outputPrice', true)}
            </div>
          </fieldset>
        )}
        <div className="flex gap-4">
          <button
            disabled={busy || !value.tasks.length}
            type="submit"
            className="rounded border p-2"
          >
            {t('save')}
          </button>
          <button type="button" onClick={onCancel} className="rounded border p-2">
            {t('cancel')}
          </button>
        </div>
      </form>
    </section>
  );
}
