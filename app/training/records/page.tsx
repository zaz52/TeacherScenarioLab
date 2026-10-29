'use client';

/**
 * TeacherScenarioLab — training records: the learner's past trainings
 * with their evaluations, plus the five-dimension trend (mean score per
 * dimension across evaluated trainings, with the count it rests on).
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';
import { trainingStateLabel } from '@/lib/training/state-label';

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
  const router = useRouter();
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retraining, setRetraining] = useState('');
  const [retrainError, setRetrainError] = useState('');

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

  async function retrain(record: RecordEntry) {
    setRetraining(record.training.id);
    setRetrainError('');
    try {
      const res = await fetch('/api/training/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: record.training.scenarioId,
          scenarioVersion: record.training.scenarioVersion,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        training?: { id: string };
      };
      if (!res.ok || !data.success || !data.training) {
        setRetrainError(t('recordsRetrainFailed'));
        return;
      }
      router.push(`/training/${data.training.id}`);
    } catch {
      setRetrainError(t('recordsRetrainFailed'));
    } finally {
      setRetraining('');
    }
  }

  if (loading)
    return (
      <main>
        <p>{t('trainingLoading')}</p>
      </main>
    );
  if (error)
    return (
      <main>
        <p>{error}</p>
      </main>
    );

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
        {retrainError && <p>{retrainError}</p>}
        <ul>
          {records.map((record) => (
            <li key={record.training.id}>
              <p>
                <Link href={`/training/${record.training.id}`}>
                  {record.training.scenarioId} v{record.training.scenarioVersion}（
                  {trainingStateLabel(record.training.state, t)}）
                </Link>{' '}
                <Link href={`/training/${record.training.id}/review`}>{t('reviewTitle')}</Link>{' '}
                <button
                  onClick={() => void retrain(record)}
                  disabled={retraining === record.training.id}
                >
                  {retraining === record.training.id ? t('recordsRetraining') : t('recordsRetrain')}
                </button>
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
