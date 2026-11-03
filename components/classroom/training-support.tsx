'use client';
import Link from 'next/link';
import { BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { KnowledgeSupport } from '@/lib/training/knowledge/support';
import type { PracticeConfig } from '@/lib/training/practice-config';
import { practiceSummary } from '@/lib/training/practice-config';
type Source = { id: string; label: string; title: string; url: string };
function Sources({ items, label }: { items: Source[]; label: string }) {
  return (
    <details className="mt-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer">{label}</summary>
      <ul className="mt-2 space-y-2">
        {items.map((source) => (
          <li key={source.id}>
            <Link
              className="underline underline-offset-2"
              href={'/courseware/references/' + source.id}
            >
              {source.label}
            </Link>
            <p className="mt-1 leading-5">{source.title}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
export function TrainingSupport({
  support,
  practice,
  loading,
  error,
}: {
  support: KnowledgeSupport | null;
  practice: PracticeConfig | null;
  loading: boolean;
  error: boolean;
}) {
  const { t } = useI18n();
  return (
    <section
      data-training-guide="support"
      className="space-y-4 rounded-2xl border border-violet-400/40 bg-background/90 p-4"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen size={16} />
        {t('teacherlab.knowledge.supportTitle')}
      </h2>
      {practice && (
        <p className="rounded-lg bg-muted/40 p-3 text-xs leading-6">{practiceSummary(practice)}</p>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        {t('teacherlab.knowledge.supportMethod')}
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {t('teacherlab.knowledge.supportError')}
        </p>
      )}
      {!support && loading && (
        <p className="text-xs text-muted-foreground">{t('training.referencesLoading')}</p>
      )}
      {support && (
        <>
          <p className="text-xs text-muted-foreground">
            {t('teacherlab.knowledge.rounds')} {support.completedRounds} ·{' '}
            {t('teacherlab.knowledge.nextAt')} {support.nextReportAt}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: (support.completedRounds % 10) * 10 + '%' }}
            />
          </div>
          <h3 className="text-xs font-semibold">{t('teacherlab.knowledge.tutor')}</h3>
          {support.corrections.length ? (
            support.corrections.map((item) => (
              <article
                key={item.id + item.messageId}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-6"
              >
                <p className="flex gap-2 font-medium">
                  <AlertCircle size={14} className="mt-1 shrink-0" />
                  {item.advice}
                </p>
                <p className="mt-2">
                  {t('teacherlab.knowledge.rewrite')} {item.alternative}
                </p>
                <a href={'#' + item.messageId} className="mt-2 inline-block underline">
                  {t('teacherlab.knowledge.evidence')}
                </a>
                <Sources items={item.sources} label={t('teacherlab.knowledge.reading')} />
              </article>
            ))
          ) : (
            <p className="text-xs leading-6 text-muted-foreground">
              {t('teacherlab.knowledge.noRisk')}
            </p>
          )}
          {support.report ? (
            <details open className="rounded-xl border border-border/60 p-3">
              <summary className="cursor-pointer text-xs font-semibold">
                {t('teacherlab.knowledge.assessor')} · {support.report.roundStart}–
                {support.report.roundEnd}
              </summary>
              <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                {t('teacherlab.knowledge.reportMethod')}
              </p>
              <div className="mt-3 space-y-3">
                {support.report.dimensions.map((d) => (
                  <article
                    key={d.dimension}
                    className="border-t border-border/60 pt-3 text-xs leading-6"
                  >
                    <h4 className="font-medium">
                      {t('teacherlab.knowledge.dim.' + d.dimension)} ·{' '}
                      {t('teacherlab.knowledge.status.' + d.status)}
                    </h4>
                    {d.evidence.map((item) => (
                      <a
                        key={item.id}
                        href={'#' + item.id}
                        className="mt-2 block rounded-lg bg-muted/50 p-2"
                      >
                        <CheckCircle2 size={12} className="mr-1 inline" />
                        {item.text}
                      </a>
                    ))}
                    {d.concerns.map((item, n) => (
                      <a
                        key={item.messageId + n}
                        href={'#' + item.messageId}
                        className="mt-2 block text-amber-600"
                      >
                        {item.advice}
                      </a>
                    ))}
                    <Sources items={d.sources} label={t('teacherlab.knowledge.reading')} />
                  </article>
                ))}
              </div>
            </details>
          ) : (
            <p className="rounded-lg bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
              {t('teacherlab.knowledge.waitForTen')}
            </p>
          )}
        </>
      )}
      <Link
        className="inline-block text-xs text-violet-600 underline"
        href="/courseware/references?category=tutor"
      >
        {t('teacherlab.knowledge.open')}
      </Link>
    </section>
  );
}
