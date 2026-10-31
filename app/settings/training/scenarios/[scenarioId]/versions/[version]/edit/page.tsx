'use client';

/**
 * TeacherScenarioLab — edit a draft scenario version (admin only).
 * Published versions are frozen: the page shows the frozen notice instead
 * of the form, and the server would refuse the save with 409 anyway.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ScenarioEditor, {
  fromStored,
  type EditorScenario,
} from '@/components/settings/training-scenario-editor';
import { getClientTranslation } from '@/lib/i18n';

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function EditScenarioPage() {
  const params = useParams<{ scenarioId: string; version: string }>();
  const [scenario, setScenario] = useState<EditorScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/training/admin/scenarios/${encodeURIComponent(params.scenarioId)}/versions/${params.version}`,
        );
        const data = (await res.json()) as {
          success?: boolean;
          scenario?: EditorScenario;
        };
        if (!res.ok || !data.success || !data.scenario) {
          setError(t('adminDetailNotFound'));
          return;
        }
        setScenario(fromStored(data.scenario));
      } catch {
        setError(t('adminDetailNotFound'));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.scenarioId, params.version]);

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
  if (!scenario)
    return (
      <main>
        <p>{t('adminDetailNotFound')}</p>
      </main>
    );
  if (scenario.publishedAt !== null) {
    return (
      <main>
        <p>{t('adminPublishedNote')}</p>
        <p>
          <Link href="/settings/training">{t('adminDetailBack')}</Link>
        </p>
      </main>
    );
  }
  return <ScenarioEditor mode="edit" initial={scenario} />;
}
