'use client';

/**
 * TeacherScenarioLab — reference detail page: the full verified citation
 * for one catalog entry (title, authors, year, venue, DOI link, source
 * link, topics, summary). The data is the catalog record itself; nothing
 * here is generated or embellished.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function ReferenceDetailPage() {
  const params = useParams<{ id: string }>();
  const referenceId = params.id;
  const [reference, setReference] = useState<TrainingReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/training/references/${encodeURIComponent(referenceId)}`);
        const data = (await res.json()) as {
          success?: boolean;
          reference?: TrainingReference;
        };
        if (!res.ok || !data.success || !data.reference) {
          setError(t('referencesDetailNotFound'));
          return;
        }
        setReference(data.reference);
      } catch {
        setError(t('referencesDetailNotFound'));
      } finally {
        setLoading(false);
      }
    })();
  }, [referenceId]);

  if (loading)
    return (
      <main>
        <p>{t('referencesLoading')}</p>
      </main>
    );
  if (error)
    return (
      <main>
        <p>{error}</p>
      </main>
    );
  if (!reference)
    return (
      <main>
        <p>{t('referencesDetailNotFound')}</p>
      </main>
    );

  return (
    <main>
      <p>
        <Link href="/courseware/references">{t('referencesDetailBack')}</Link>
      </p>
      <h1>{reference.title}</h1>
      <p>{reference.authors.join('；')}</p>
      <p>{reference.year}</p>
      {reference.venue && <p>{reference.venue}</p>}
      {reference.doi && (
        <p>
          DOI：{' '}
          <a href={`https://doi.org/${reference.doi}`} target="_blank" rel="noreferrer">
            {reference.doi}
          </a>
        </p>
      )}
      {reference.url && (
        <p>
          <a href={reference.url} target="_blank" rel="noreferrer">
            {reference.url}
          </a>
        </p>
      )}
      <p>
        {t('referencesDetailTopics')}：{reference.topics.join('、')}
      </p>
      <p>
        {t('referencesDetailSummary')}：{reference.summary}
      </p>
    </main>
  );
}
