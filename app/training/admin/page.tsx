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

import { getClientTranslation } from '@/lib/i18n';

interface ScenarioRow {
  scenarioId: string;
  version: number;
  title: string;
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

  if (loading) return <main><p>{t('adminLoading')}</p></main>;
  if (error) return <main><p>{error}</p></main>;
  if (isAdmin === false) return <main><p>{t('adminRequired')}</p></main>;

  return (
    <main>
      <h1>{t('adminTitle')}</h1>
      {notice && <p>{notice}</p>}
      <section>
        <h2>{t('adminScenarios')}</h2>
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
              {scenario.publishedAt !== null ? (
                <p>{t('adminPublished')}</p>
              ) : (
                <p>
                  {t('adminDraft')}{' '}
                  <button
                    onClick={() => void publish(scenario.scenarioId, scenario.version)}
                  >
                    {t('adminPublish')}
                  </button>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{t('adminTrainings')}</h2>
        {trainings.length === 0 && <p>{t('adminEmpty')}</p>}
        <ul>
          {trainings.map((training) => (
            <li key={training.id}>
              <p>
                {training.id}（{training.scenarioId} v{training.scenarioVersion}，
                {training.state}，{training.ownerId}）
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{t('adminReferences')}</h2>
        {health && (
          <p>
            {t('adminReferencesTotal')}：{health.total}，
            {t('adminReferencesValid')}：{health.valid}，
            {t('adminReferencesInvalid')}：{health.invalid}
          </p>
        )}
      </section>
    </main>
  );
}
