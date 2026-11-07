'use client';

import { BookOpen, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { ReferenceReading } from '@/lib/training/reference-reading';

export function ReferenceReader({
  reading,
  originalUrl,
}: {
  reading: ReferenceReading | null;
  originalUrl?: string;
}) {
  const { t } = useI18n();
  const text = (key: string) => t('teacherlab.reading.' + key);
  const source = reading?.fullText?.sourceUrl ?? originalUrl ?? reading?.sourceUrl;
  return (
    <section className="space-y-5 rounded-3xl border border-border/60 bg-background p-5 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen size={19} />
          {text('title')}
        </h2>
        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-600">
          {text(reading?.scope ?? 'pending')}
        </span>
      </header>
      {reading ? (
        <>
          <p className="text-xs leading-6 text-muted-foreground">
            {text(reading.fullText ? 'openScope' : 'abstractScope')} · {text('checked')}{' '}
            {reading.checkedAt}
          </p>
          <dl className="grid gap-5">
            {(['method', 'findings', 'application', 'limitations'] as const).map((key) => (
              <div key={key}>
                <dt className="mb-2 text-sm font-semibold">{text(key)}</dt>
                <dd className="text-sm leading-8">{reading[key]}</dd>
              </div>
            ))}
          </dl>
          <a
            className="inline-flex items-center gap-2 text-sm text-violet-600 underline underline-offset-4"
            href={reading.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} />
            {text('readingSource')}
          </a>
          {reading.fullText && (
            <div className="space-y-4 border-t border-border/60 pt-5">
              <h3 className="font-semibold">{text('bodyTitle')}</h3>
              <p className="text-sm leading-7">{reading.fullText.title}</p>
              <p className="text-xs leading-6 text-muted-foreground">
                {text('license')}{' '}
                <a
                  href={reading.fullText.license.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {reading.fullText.license.label}
                </a>{' '}
                · {text('reflow')}
              </p>
              <div className="space-y-3">
                {reading.fullText.sections.map((section, index) => (
                  <details
                    key={index}
                    open={index === 0}
                    className="rounded-xl border border-border/60 p-4"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {section.title}
                    </summary>
                    <div lang="en" className="mt-4 space-y-4 break-words text-sm leading-8">
                      {section.paragraphs.map((paragraph, n) => (
                        <p key={n}>{paragraph}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm leading-8 text-muted-foreground">{text('pendingHint')}</p>
      )}
      {source && (
        <a
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm"
          href={source}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={14} />
          {text('original')}
        </a>
      )}
    </section>
  );
}
