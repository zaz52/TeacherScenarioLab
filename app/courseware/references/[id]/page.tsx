'use client';

/**
 * Reference detail: catalog citation, source-scoped reading notes and
 * licensed article text when available. Content scope is shown explicitly.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

import { ReferenceReader } from '@/components/courseware/reference-reader';
import type { ReferenceReading } from '@/lib/training/reference-reading';
import type { TrainingReference } from '@/lib/training/references';

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function ReferenceDetailPage() {
  const params = useParams<{ id: string }>();
  const referenceId = params.id;
  const [reference, setReference] = useState<
    (TrainingReference & { reading?: ReferenceReading | null }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setReference(null);
    (async () => {
      try {
        const res = await fetch(`/api/training/references/${encodeURIComponent(referenceId)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          success?: boolean;
          reference?: TrainingReference & { reading?: ReferenceReading | null };
        };
        if (controller.signal.aborted) return;
        if (!res.ok || !data.success || !data.reference) {
          setError(t('referencesDetailNotFound'));
          return;
        }
        setReference(data.reference);
      } catch {
        if (!controller.signal.aborted) setError(t('referencesDetailNotFound'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
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
    <main className="mx-auto max-w-4xl space-y-5 px-5 py-8">
      <p>
        <Link href="/courseware/references">{t('referencesDetailBack')}</Link>
      </p>
      {reference.knowledge && (
        <section className="rounded-2xl border border-violet-400/40 bg-violet-500/5 p-5">
          <h1 className="text-xl font-semibold">{reference.knowledge.label}</h1>
          <p className="mt-3 text-sm leading-7">{reference.knowledge.application}</p>
          {reference.knowledge.parentProfile && (
            <p className="mt-3 text-sm leading-7">
              {t('knowledgeFictionalParent')} · {reference.knowledge.parentProfile.opening}
            </p>
          )}
          {reference.knowledge.scenarioCase && (
            <p className="mt-3 text-sm leading-7">{t('knowledgeFictionalCase')}</p>
          )}
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {t('knowledgeEditorialNote')}
          </p>
        </section>
      )}
      <h2 className="text-lg font-semibold leading-8">{reference.title}</h2>
      <p>{reference.authors.join('；')}</p>
      <p>{reference.year}</p>
      {reference.venue && <p>{reference.venue}</p>}
      {reference.locator && <p>{reference.locator}</p>}
      {reference.knowledge && (
        <div className="space-y-2 rounded-xl border p-4 text-xs leading-6">
          <p>
            {reference.knowledge.journal.label} · {reference.knowledge.journal.edition}
          </p>
          <a
            className="underline"
            href={reference.knowledge.journal.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('knowledgeJournalSource')}
          </a>
          <p>
            {reference.knowledge.verification.method} · {reference.knowledge.verification.checkedAt}
          </p>
          <p>{t('knowledgeMetadataScope')}</p>
          <a
            className="underline"
            href={reference.knowledge.verification.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('knowledgeMetadataSource')}
          </a>
        </div>
      )}
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
      <ReferenceReader
        reading={reference.reading ?? null}
        originalUrl={reference.doi ? 'https://doi.org/' + reference.doi : reference.url}
      />
    </main>
  );
}
