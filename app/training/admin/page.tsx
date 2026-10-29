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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
    try {
      const meRes = await fetch('/api/training/accounts/me');
      const me = (await meRes.json()) as { roles?: string[] };
      const admin = Array.isArray(me.roles) && me.roles.includes('admin');
      setIsAdmin(admin);
      if (!admin) return;
      const [scenariosRes, trainingsRes, healthRes] = await Promise.all([
        fetch('/api/training/admin/scenarios'),
        fetch('/api/training/admin/trainings'),
        fetch('/api/training/admin/references'),
      ]);
      const scenariosData = (await scenariosRes.json()) as {
        scenarios?: ScenarioRow[];
      };
      const trainingsData = (await trainingsRes.json()) as {
        trainings?: TrainingRow[];
      };
      const healthData = (await healthRes.json()) as ReferencesHealth;
      if (!scenariosRes.ok || !trainingsRes.ok || !healthRes.ok) {
        setError(t('adminLoadFailed'));
        return;
      }
      setScenarios(scenariosData.scenarios ?? []);
      setTrainings(trainingsData.trainings ?? []);
      setHealth(healthData);
    } catch {
      setError(t('adminLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading)
    return (
      <main>
        <p>{t('adminLoading')}</p>
      </main>
    );
  if (error)
    return (
      <main>
        <p>{error}</p>
      </main>
    );
  if (isAdmin === false)
    return (
      <main>
        <p>{t('adminRequired')}</p>
      </main>
    );

  return (
    <main>
      <h1>{t('adminTitle')}</h1>
      {notice && <p>{notice}</p>}
      <section>
        <h2>{t('adminScenarios')}</h2>
        <p>
          <Link href="/training/admin/scenarios/new">{t('adminNewVersion')}</Link>
        </p>
        <p>{t('adminPublishedNote')}</p>
        <p>
          <input
            value={importId}
            onChange={(event) => setImportId(event.target.value)}
            placeholder={t('adminImportPlaceholder')}
          />
          <button onClick={() => void importDraft()}>{t('adminImport')}</button>
        </p>
        {scenarios.length === 0 && <p>{t('adminEmpty')}</p>}
        <ul>
          {scenarios.map((scenario) => (
            <li key={`${scenario.scenarioId}-${scenario.version}`}>
              <p>
                {scenario.title}（{scenario.scenarioId} v{scenario.version}）
              </p>
              <p>
                <button onClick={() => void showDetail(scenario.scenarioId, scenario.version)}>
                  {t('adminDetail')}
                </button>{' '}
                {scenario.publishedAt !== null ? (
                  <span>{t('adminPublished')}</span>
                ) : (
                  <>
                    <Link
                      href={`/training/admin/scenarios/${encodeURIComponent(scenario.scenarioId)}/versions/${scenario.version}/edit`}
                    >
                      {t('adminEditDraft')}
                    </Link>{' '}
                    <button onClick={() => void publish(scenario.scenarioId, scenario.version)}>
                      {t('adminPublish')}
                    </button>{' '}
                    <button onClick={() => void deleteDraft(scenario.scenarioId, scenario.version)}>
                      {t('adminDeleteDraft')}
                    </button>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
        {detail && (
          <section>
            <h3>
              {t('adminDetail')}：{detail.title}（{detail.scenarioId} v{detail.version}）
            </h3>
            <p>
              {t('adminSetting')}：{detail.setting}
            </p>
            <p>
              {t('adminGoal')}：{detail.goal}
            </p>
            <p>
              {t('adminRules')}：{detail.rules.join('；')}
            </p>
            <p>
              {t('adminLearnerRole')}：{detail.learnerRole}
            </p>
            <p>{t('adminCharacters')}：</p>
            <ul>
              {detail.characters.map((character) => (
                <li key={character.id}>
                  {character.name}（{character.id}，{character.role}）
                </li>
              ))}
            </ul>
            <p>{t('adminFacts')}：</p>
            <ul>
              {detail.facts.map((fact) => (
                <li key={fact.id}>
                  [{fact.id}，{fact.category}，{fact.visibility}
                  {fact.ownerCharacterId ? `，${fact.ownerCharacterId}` : ''}
                  {fact.disclosureConditionId ? `，${fact.disclosureConditionId}` : ''}]{' '}
                  {fact.content}
                </li>
              ))}
            </ul>
            <p>{t('adminConditions')}：</p>
            <ul>
              {Object.entries(detail.disclosureConditions).map(([id, condition]) => (
                <li key={id}>
                  {id}：{condition.type}（
                  {condition.topic ?? condition.event ?? condition.state ?? ''}）
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      <section>
        <h2>{t('adminTrainings')}</h2>
        {trainings.length === 0 && <p>{t('adminEmpty')}</p>}
        <ul>
          {trainings.map((training) => (
            <li key={training.id}>
              <p>
                {training.id}（{training.scenarioId} v{training.scenarioVersion}，{training.state}，
                {training.ownerId}）
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{t('adminReferences')}</h2>
        {health && (
          <p>
            {t('adminReferencesTotal')}：{health.total}，{t('adminReferencesValid')}：{health.valid}
            ，{t('adminReferencesInvalid')}：{health.invalid}
          </p>
        )}
      </section>
    </main>
  );
}
