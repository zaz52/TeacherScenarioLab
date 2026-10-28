'use client';

/**
 * TeacherScenarioLab — reference library list page.
 *
 * Client-only page: reads the platform catalog from the training API
 * (owner resolved from the browser's cookies). Topic filter is a plain
 * select; the list itself is static catalog data, no learner state.
 */
import { useCallback, useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

interface TrainingReference {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  doi?: string;
  url?: string;
  topics: string[];
  summary: string;
}

const TOPICS = [
  'epidemic-school',
  'home-school',
  'simulation',
  'crisis-theory',
  'teacher-wellbeing',
  'rumor',
] as const;

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

function topicLabel(topic: string): string {
  switch (topic) {
    case 'epidemic-school':
      return t('referencesTopicEpidemicSchool');
    case 'home-school':
      return t('referencesTopicHomeSchool');
    case 'simulation':
      return t('referencesTopicSimulation');
    case 'crisis-theory':
      return t('referencesTopicCrisisTheory');
    case 'teacher-wellbeing':
      return t('referencesTopicTeacherWellbeing');
    case 'rumor':
      return t('referencesTopicRumor');
    default:
      return topic;
  }
}

export default function ReferenceLibraryPage() {
  const [topic, setTopic] = useState('');
  const [references, setReferences] = useState<TrainingReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (selectedTopic: string) => {
    setLoading(true);
    setError('');
    try {
      const query = selectedTopic ? `?topic=${encodeURIComponent(selectedTopic)}` : '';
      const res = await fetch(`/api/training/references${query}`);
      const data = (await res.json()) as {
        success?: boolean;
        references?: TrainingReference[];
      };
      if (!res.ok || !data.success || !Array.isArray(data.references)) {
        setError(t('referencesLoadFailed'));
        return;
      }
      setReferences(data.references);
    } catch {
      setError(t('referencesLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(topic);
  }, [topic, load]);

  return (
    <main>
      <h1>{t('referencesTitle')}</h1>
      <label>
        <select value={topic} onChange={(event) => setTopic(event.target.value)}>
          <option value="">{t('referencesTopicAll')}</option>
          {TOPICS.map((item) => (
            <option key={item} value={item}>
              {topicLabel(item)}
            </option>
          ))}
        </select>
      </label>
      {loading && <p>{t('referencesLoading')}</p>}
      {!loading && error && <p>{error}</p>}
      {!loading && !error && references.length === 0 && <p>{t('referencesEmpty')}</p>}
      {!loading && !error && references.length > 0 && (
        <ul>
          {references.map((ref) => (
            <li key={ref.id}>
              <p>
                {ref.title}（{ref.year}）
              </p>
              <p>{ref.authors.join('；')}</p>
              {ref.venue && <p>{ref.venue}</p>}
              {ref.doi && <p>DOI：{ref.doi}</p>}
              {ref.url && (
                <p>
                  <a href={ref.url} target="_blank" rel="noreferrer">
                    {ref.url}
                  </a>
                </p>
              )}
              <p>{ref.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
