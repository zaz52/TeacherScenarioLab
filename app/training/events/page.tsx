'use client';

/**
 * TeacherScenarioLab — event center: the learner's ledger across their
 * own trainings, newest first. Each entry names its training and
 * scenario so the timeline reads as one story.
 */
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

interface LedgerEvent {
  id: string;
  trainingId: string;
  scenarioId: string;
  scenarioVersion: number;
  type: string;
  createdAt: number;
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function TrainingEventsPage() {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/events');
        const data = (await res.json()) as { events?: LedgerEvent[] };
        if (!res.ok) throw new Error('load failed');
        setEvents(data.events ?? []);
      } catch {
        setError(t('trainingLoadFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <main><p>{t('trainingLoading')}</p></main>;
  if (error) return <main><p>{error}</p></main>;

  return (
    <main>
      <h1>{t('eventsTitle')}</h1>
      {events.length === 0 && <p>{t('eventsEmpty')}</p>}
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <p>
              {event.type} — {t('eventsTraining')} {event.trainingId}（
              {event.scenarioId} v{event.scenarioVersion}，
              {new Date(event.createdAt).toLocaleString()}）
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
