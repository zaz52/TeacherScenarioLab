'use client';

/**
 * TeacherScenarioLab — training records: the learner's past trainings
 * with their evaluations, plus the five-dimension trend (mean score per
 * dimension across evaluated trainings, with the count it rests on).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

interface RecordEntry {
  training: {
    id: string;
    scenarioId: string;
    scenarioVersion: number;
    state: string;
    updatedAt: number;
  };
  evaluation: {
    dimensions: Array<{ dimension: string; score: number; comment: string }>;
    summary: string;
  } | null;
}

interface TrendEntry {
  dimension: string;
  average: number;
  count: number;
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

/** Dimension id → the room's dim label key (fact-checking → dimFactChecking). */
function dimLabelKey(dimension: string): string {
  return (
    'dim' +
    dimension
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  );
}

export default function TrainingRecordsPage() {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/records');
        const data = (await res.json()) as {
          records?: RecordEntry[];
          trend?: TrendEntry[];
        };
        if (!res.ok) throw new Error('load failed');
        setRecords(data.records ?? []);
        setTrend(data.trend ?? []);
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
      <h1>{t('recordsTitle')}</h1>
      <section>
        <h2>{t('recordsTrend')}</h2>
        <ul>
          {trend.map((entry) => (
            <li key={entry.dimension}>
              {t(dimLabelKey(entry.dimension))}：{entry.average}（{entry.count}
              {t('recordsTrendCount')}）
            </li>
          ))}
        </ul>
      </section>
      <section>
        {records.length === 0 && <p>{t('recordsEmpty')}</p>}
        <ul>
          {records.map((record) => (
            <li key={record.training.id}>
              <p>
                <Link href={`/training/${record.training.id}`}>
                  {record.training.scenarioId} v{record.training.scenarioVersion}（
                  {record.training.state}）
                </Link>
              </p>
              {record.evaluation ? (
                <p>
                  {t('recordsEvaluated')}：
                  {record.evaluation.dimensions
                    .map((d) => `${t(dimLabelKey(d.dimension))} ${d.score}`)
                    .join('、')}
                </p>
              ) : (
                <p>{t('recordsUnevaluated')}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
