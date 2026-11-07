'use client';

/**
 * TeacherScenarioLab — admin console (admin role required).
 *
 * Client-only page: the server enforces the role on every admin route, so
 * this page is a convenience view, not a boundary — a non-admin who opens
 * it sees the requirement notice and every admin fetch answers 403.
 * Sections: scenario review + publish + code-draft import, training spot
 * checks, reference library health.
 */
import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { getClientTranslation } from '@/lib/i18n';
import { useAccount } from '@/components/account/account-provider';
import { hasAdminPermission } from '@/lib/training/admin-permissions';
import { trainingStateLabel } from '@/lib/training/state-label';
import { RefreshCw, Plus, BookOpen } from 'lucide-react';
import { AdminHeading, AdminPanel, AdminNotice } from './admin-ui';

interface ScenarioRow {
  scenarioId: string;
  version: number;
  title: string;
  publishedAt: number | null;
}

interface ScenarioDetail {
  scenarioId: string;
  version: number;
  title: string;
  setting: string;
  goal: string;
  rules: string[];
  learnerRole: string;
  characters: Array<{ id: string; name: string; role: string }>;
  facts: Array<{
    id: string;
    content: string;
    category: string;
    visibility: string;
    ownerCharacterId?: string;
    disclosureConditionId?: string;
  }>;
  disclosureConditions: Record<string, Record<string, string>>;
  publishedAt: number | null;
}

interface TrainingRow {
  id: string;
  ownerId: string;
  scenarioId: string;
  scenarioVersion: number;
  state: string;
}

interface ReferencesHealth {
  total: number;
  valid: number;
  invalid: number;
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function TrainingAdminPage() {
  const { account } = useAccount();
  const canScenarios = hasAdminPermission(account?.adminAccess, 'scenarios.manage');
  const canTrainings = hasAdminPermission(account?.adminAccess, 'trainings.audit');
  const canReferences = hasAdminPermission(account?.adminAccess, 'references.inspect');
  const ui = (key: string) => getClientTranslation('teacherlab.adminUi.' + key);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [health, setHealth] = useState<ReferencesHealth | null>(null);
  const [importId, setImportId] = useState('');
  const [detail, setDetail] = useState<ScenarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const errors: string[] = [];
    async function read(path: string, apply: (data: Record<string, unknown>) => void) {
      try {
        const res = await fetch('/api/training/admin/' + path, { cache: 'no-store' });
        if (!res.ok) throw Error();
        apply(await res.json());
      } catch {
        errors.push(t('adminLoadFailed'));
      }
    }
    await Promise.all([
      ...(canScenarios
        ? [read('scenarios', (data) => setScenarios((data.scenarios ?? []) as ScenarioRow[]))]
        : []),
      ...(canTrainings
        ? [read('trainings', (data) => setTrainings((data.trainings ?? []) as TrainingRow[]))]
        : []),
      ...(canReferences
        ? [read('references', (data) => setHealth(data as unknown as ReferencesHealth))]
        : []),
    ]);
    setError([...new Set(errors)].join(' '));
    setLoading(false);
  }, [canScenarios, canTrainings, canReferences]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish(scenarioId: string, version: number) {
    setNotice('');
    try {
      const res = await fetch(
        `/api/training/admin/scenarios/${encodeURIComponent(scenarioId)}/versions/${version}/publish`,
        { method: 'POST' },
      );
      if (!res.ok) {
        setNotice(t('adminPublishFailed'));
        return;
      }
      await load();
    } catch {
      setNotice(t('adminPublishFailed'));
    }
  }

  async function importDraft() {
    setNotice('');
    if (importId.trim() === '') return;
    try {
      const res = await fetch('/api/training/admin/scenarios/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: importId.trim() }),
      });
      if (!res.ok) {
        setNotice(t('adminImportFailed'));
        return;
      }
      setImportId('');
      await load();
    } catch {
      setNotice(t('adminImportFailed'));
    }
  }

  async function showDetail(scenarioId: string, version: number) {
    setNotice('');
    try {
      const res = await fetch(
        `/api/training/admin/scenarios/${encodeURIComponent(scenarioId)}/versions/${version}`,
      );
      const data = (await res.json()) as {
        success?: boolean;
        scenario?: ScenarioDetail;
      };
      if (!res.ok || !data.success || !data.scenario) {
        setNotice(t('adminDetailNotFound'));
        return;
      }
      setDetail(data.scenario);
    } catch {
      setNotice(t('adminDetailNotFound'));
    }
  }

  async function deleteDraft(scenarioId: string, version: number) {
    setNotice('');
    try {
      const res = await fetch(
        `/api/training/admin/scenarios/${encodeURIComponent(scenarioId)}/versions/${version}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        setNotice(t('adminDeleteFailed'));
        return;
      }
      setNotice(t('adminDeleteDone'));
      if (detail?.scenarioId === scenarioId && detail?.version === version) {
        setDetail(null);
      }
      await load();
    } catch {
      setNotice(t('adminDeleteFailed'));
    }
  }

  if (!canScenarios && !canTrainings && !canReferences)
    return <AdminNotice error>{t('adminRequired')}</AdminNotice>;
  return (
    <main className="teacherlab-admin">
      <AdminHeading
        title={t('adminTitle')}
        description={ui('scenarioDescription')}
        action={
          <button disabled={loading} onClick={() => void load()}>
            <RefreshCw size={14} />
            {getClientTranslation('modelCenter.refresh')}
          </button>
        }
      />
      {loading && <AdminNotice>{t('adminLoading')}</AdminNotice>}
      {error && <AdminNotice error>{error}</AdminNotice>}
      {notice && <AdminNotice>{notice}</AdminNotice>}
      <dl className="admin-stats">
        {canScenarios && (
          <>
            <div className="admin-stat">
              <dt>{ui('loadedScenarios')}</dt>
              <dd>{scenarios.length}</dd>
            </div>
            <div className="admin-stat">
              <dt>{t('adminPublished')}</dt>
              <dd>{scenarios.filter((row) => row.publishedAt !== null).length}</dd>
            </div>
          </>
        )}
        {canTrainings && (
          <div className="admin-stat">
            <dt>{ui('loadedTrainings')}</dt>
            <dd>{trainings.length}</dd>
          </div>
        )}
        {canReferences && (
          <div className="admin-stat">
            <dt>{t('adminReferencesValid')}</dt>
            <dd>{health?.valid ?? '—'}</dd>
          </div>
        )}
      </dl>
      {canScenarios && (
        <AdminPanel
          title={t('adminScenarios')}
          description={t('adminPublishedNote')}
          action={
            <Link className="admin-button admin-primary" href="/settings/training/scenarios/new">
              <Plus size={15} />
              {t('adminNewVersion')}
            </Link>
          }
        >
          <details className="mb-5">
            <summary className="text-sm text-muted-foreground">{ui('importCodeDraft')}</summary>
            <div className="admin-inline-form mt-3">
              <label>
                {ui('scenarioId')}
                <input
                  value={importId}
                  onChange={(event) => setImportId(event.target.value)}
                  placeholder={t('adminImportPlaceholder')}
                />
              </label>
              <button disabled={!importId.trim() || loading} onClick={() => void importDraft()}>
                {t('adminImport')}
              </button>
            </div>
          </details>
          {!loading && scenarios.length === 0 && <p className="admin-empty">{t('adminEmpty')}</p>}
          <ul className="admin-list">
            {scenarios.map((scenario) => (
              <li key={`${scenario.scenarioId}-${scenario.version}`} className="admin-row">
                <div className="admin-row-info">
                  <p className="font-medium">{scenario.title}</p>
                  <p className="admin-meta">
                    v{scenario.version} ·{' '}
                    <span className="admin-badge">
                      {scenario.publishedAt !== null ? t('adminPublished') : ui('draft')}
                    </span>
                  </p>
                  <p className="admin-meta font-mono">{scenario.scenarioId}</p>
                </div>
                <div className="admin-actions">
                  <button onClick={() => void showDetail(scenario.scenarioId, scenario.version)}>
                    {t('adminDetail')}
                  </button>
                  {scenario.publishedAt === null && (
                    <>
                      <Link
                        className="admin-button"
                        href={`/settings/training/scenarios/${encodeURIComponent(scenario.scenarioId)}/versions/${scenario.version}/edit`}
                      >
                        {t('adminEditDraft')}
                      </Link>
                      <button
                        onClick={() => {
                          if (window.confirm(ui('confirmPublish')))
                            void publish(scenario.scenarioId, scenario.version);
                        }}
                      >
                        {t('adminPublish')}
                      </button>
                      <button
                        className="admin-danger"
                        onClick={() => {
                          if (window.confirm(ui('confirmDelete')))
                            void deleteDraft(scenario.scenarioId, scenario.version);
                        }}
                      >
                        {t('adminDeleteDraft')}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {detail && (
            <section className="admin-detail">
              <div className="admin-panel-heading">
                <h3>
                  {detail.title} · v{detail.version}
                </h3>
                <button onClick={() => setDetail(null)}>
                  {getClientTranslation('common.close')}
                </button>
              </div>
              <dl>
                <div>
                  <dt>{t('adminSetting')}</dt>
                  <dd>{detail.setting}</dd>
                </div>
                <div>
                  <dt>{t('adminGoal')}</dt>
                  <dd>{detail.goal}</dd>
                </div>
                <div>
                  <dt>{t('adminRules')}</dt>
                  <dd>{detail.rules.join('；')}</dd>
                </div>
                <div>
                  <dt>{t('adminLearnerRole')}</dt>
                  <dd>{detail.learnerRole}</dd>
                </div>
              </dl>
              <details className="mt-4">
                <summary>{t('adminCharacters')}</summary>
                <ul className="mt-2 space-y-2">
                  {detail.characters.map((character) => (
                    <li key={character.id}>
                      {character.name}
                      <p className="admin-meta">
                        {character.id} · {character.role}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
              <details className="mt-4">
                <summary>{t('adminFacts')}</summary>
                <ul className="mt-2 space-y-3">
                  {detail.facts.map((fact) => (
                    <li key={fact.id}>
                      <p>{fact.content}</p>
                      <p className="admin-meta">
                        {fact.id} · {fact.category} · {fact.visibility}
                        {fact.ownerCharacterId ? ` · ${fact.ownerCharacterId}` : ''}
                        {fact.disclosureConditionId ? ` · ${fact.disclosureConditionId}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
              <details className="mt-4">
                <summary>{t('adminConditions')}</summary>
                <ul className="mt-2 space-y-2">
                  {Object.entries(detail.disclosureConditions).map(([id, condition]) => (
                    <li key={id}>
                      {id} · {condition.type} ·{' '}
                      {condition.topic ?? condition.event ?? condition.state ?? ''}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </AdminPanel>
      )}
      {canTrainings && (
        <AdminPanel title={t('adminTrainings')} description={ui('trainingAuditHint')}>
          {!loading && trainings.length === 0 && <p className="admin-empty">{t('adminEmpty')}</p>}
          <ul className="admin-list">
            {trainings.map((training) => (
              <li key={training.id} className="admin-row">
                <div className="admin-row-info">
                  <p className="font-medium">
                    {scenarios.find(
                      (row) =>
                        row.scenarioId === training.scenarioId &&
                        row.version === training.scenarioVersion,
                    )?.title ?? training.scenarioId}
                  </p>
                  <p className="admin-meta">
                    v{training.scenarioVersion} ·{' '}
                    <span className="admin-badge">{trainingStateLabel(training.state, t)}</span>
                  </p>
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary>
                      {ui('recordId')} · {training.id.slice(0, 8)}
                    </summary>
                    <p className="mt-2 font-mono">{training.id}</p>
                    <p className="mt-1 font-mono">{training.ownerId}</p>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
      {canReferences && (
        <AdminPanel
          title={t('adminReferences')}
          action={
            <Link className="admin-button" href="/courseware/references">
              <BookOpen size={15} />
              {ui('openReferences')}
            </Link>
          }
        >
          {health ? (
            <dl className="admin-form-grid">
              <div>
                <dt className="admin-meta">{t('adminReferencesTotal')}</dt>
                <dd className="text-xl tabular-nums">{health.total}</dd>
              </div>
              <div>
                <dt className="admin-meta">
                  {t('adminReferencesValid')} / {t('adminReferencesInvalid')}
                </dt>
                <dd className="text-xl tabular-nums">
                  {health.valid} / {health.invalid}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="admin-empty">{loading ? t('adminLoading') : t('adminLoadFailed')}</p>
          )}
        </AdminPanel>
      )}
    </main>
  );
}
