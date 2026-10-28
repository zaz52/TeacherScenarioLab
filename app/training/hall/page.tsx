'use client';

/**
 * TeacherScenarioLab — training hall: published scenarios to start from.
 * Starting a training creates it (state `created`) and moves into the
 * room, where the start button advances it to `briefing`.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

interface HallScenario {
  scenarioId: string;
  version: number;
  title: string;
  setting: string;
  goal: string;
  characters: Array<{ id: string; name: string; role: string }>;
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function TrainingHallPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<HallScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/scenarios');
        const data = (await res.json()) as { scenarios?: HallScenario[] };
        if (!res.ok) throw new Error('load failed');
        setScenarios(data.scenarios ?? []);
      } catch {
        setError(t('trainingLoadFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function start(scenario: HallScenario) {
    setStarting(scenario.scenarioId);
    setError('');
    try {
      const res = await fetch('/api/training/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.scenarioId,
          scenarioVersion: scenario.version,
        }),
      });
      const data = (await res.json()) as { training?: { id: string } };
      if (!res.ok || !data.training) throw new Error('start failed');
      router.push(`/training/${data.training.id}`);
    } catch {
      setError(t('hallStartFailed'));
      setStarting('');
    }
  }

  if (loading) return <main><p>{t('trainingLoading')}</p></main>;
  if (error) return <main><p>{error}</p></main>;

  return (
    <main>
      <h1>{t('hallTitle')}</h1>
      {scenarios.length === 0 && <p>{t('hallEmpty')}</p>}
      <ul>
        {scenarios.map((scenario) => (
          <li key={`${scenario.scenarioId}-${scenario.version}`}>
            <h2>{scenario.title}</h2>
            <p>{scenario.setting}</p>
            <p>{scenario.goal}</p>
            <p>{scenario.characters.map((character) => character.name).join('、')}</p>
            <button
              onClick={() => void start(scenario)}
              disabled={starting !== ''}
            >
              {starting === scenario.scenarioId ? t('hallStarting') : t('hallStart')}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
