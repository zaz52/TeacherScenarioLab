'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Search, ArrowRight, ArrowLeft, Library, GraduationCap } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { TrainingReference } from '@/lib/training/references';
const groups = ['tutor', 'assessor', 'parents', 'scenarios'] as const;
const topics = {
  'epidemic-school': 'referencesTopicEpidemicSchool',
  'home-school': 'referencesTopicHomeSchool',
  simulation: 'referencesTopicSimulation',
  'crisis-theory': 'referencesTopicCrisisTheory',
  'teacher-wellbeing': 'referencesTopicTeacherWellbeing',
  rumor: 'referencesTopicRumor',
};
const control =
  'rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400';
export function KnowledgeLibrary() {
  const { t } = useI18n();
  const params = useSearchParams();
  const requested = params.get('category') ?? '';
  const [category, setCategory] = useState(
    [...groups, 'legacy'].includes(requested) ? requested : '',
  );
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [rows, setRows] = useState<TrainingReference[]>([]),
    [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setPage(0);
    setRows([]);
    const queryParams = new URLSearchParams();
    if (category) queryParams.set('category', category);
    if (topic) queryParams.set('topic', topic);
    if (search.trim()) queryParams.set('q', search.trim());
    void fetch('/api/training/references?' + queryParams, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.references)) throw Error();
        if (!controller.signal.aborted) setRows(data.references);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, search, topic]);
  const pages = Math.ceil(rows.length / 12);
  return (
    <main data-training-guide="knowledge" className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="rounded-3xl border border-border/60 bg-background/90 p-6 sm:p-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft size={15} />
          {t('teacherlab.knowledge.back')}
        </Link>
        <div className="flex items-start gap-3">
          <Library className="mt-1 shrink-0 text-violet-600" />
          <div>
            <h1 className="text-2xl font-semibold">{t('teacherlab.knowledge.title')}</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t('teacherlab.knowledge.intro')}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          {t('teacherlab.knowledge.scope')}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setCategory(group)}
            aria-pressed={category === group}
            className={
              'rounded-2xl border p-4 text-left transition ' +
              (category === group
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-border/60 bg-background hover:bg-muted')
            }
          >
            <GraduationCap size={18} className="mb-3 text-violet-500" />
            <span className="font-medium">{t('teacherlab.knowledge.' + group)}</span>
            <span className="ml-2 text-xs text-muted-foreground">50</span>
            <span className="mt-2 block text-xs leading-6 text-muted-foreground">
              {t('teacherlab.knowledge.' + group + 'Hint')}
            </span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <select
          aria-label={t('teacherlab.knowledge.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={control}
        >
          <option value="">{t('teacherlab.knowledge.all')}</option>
          <option value="legacy">{t('teacherlab.knowledge.legacy')}</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              {t('teacherlab.knowledge.' + group)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('training.referencesTopicAll')}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={control}
        >
          <option value="">{t('training.referencesTopicAll')}</option>
          {Object.entries(topics).map(([id, label]) => (
            <option key={id} value={id}>
              {t('training.' + label)}
            </option>
          ))}
        </select>
        <input
          className={control + ' min-w-0 flex-1'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('teacherlab.knowledge.searchHint')}
          aria-label={t('training.referencesSearch')}
        />
        <button className={control + ' inline-flex items-center gap-2 bg-violet-600 text-white'}>
          <Search size={16} />
          {t('training.referencesSearch')}
        </button>
      </form>
      <p className="text-xs text-muted-foreground" role="status">
        {loading
          ? t('training.referencesLoading')
          : error
            ? t('training.referencesLoadFailed')
            : t('teacherlab.knowledge.results') + ' ' + rows.length}
      </p>
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">
          {t('training.referencesEmpty')}
        </div>
      )}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.slice(page * 12, page * 12 + 12).map((ref) => (
            <article
              key={ref.id}
              className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-background p-5"
            >
              <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-violet-500/10 px-2 py-1 text-violet-600">
                  {ref.knowledge
                    ? t('teacherlab.knowledge.' + ref.knowledge.category)
                    : t('teacherlab.knowledge.legacy')}
                </span>
                <span className="rounded-full bg-muted px-2 py-1">{ref.year}</span>
              </div>
              <h2 className="font-semibold leading-7">
                <Link href={'/courseware/references/' + ref.id}>
                  {ref.knowledge?.label ?? ref.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {ref.knowledge?.application ?? ref.summary}
              </p>
              {ref.knowledge && (
                <p className="mt-3 text-xs leading-6 text-muted-foreground">{ref.title}</p>
              )}
              <p className="mt-3 text-xs leading-6">{ref.venue}</p>
              {ref.knowledge && (
                <p className="text-[11px] leading-6 text-muted-foreground">
                  {ref.knowledge.journal.label}
                </p>
              )}
              <Link
                href={'/courseware/references/' + ref.id}
                className="mt-5 inline-flex items-center gap-2 text-sm text-violet-600"
              >
                <BookOpen size={14} />
                {t('teacherlab.knowledge.detail')}
                <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav
          className="flex items-center justify-center gap-4"
          aria-label={t('teacherlab.knowledge.pagination')}
        >
          <button className={control} disabled={page === 0} onClick={() => setPage((v) => v - 1)}>
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm">
            {page + 1} / {pages}
          </span>
          <button
            className={control}
            disabled={page + 1 >= pages}
            onClick={() => setPage((v) => v + 1)}
          >
            <ArrowRight size={16} />
          </button>
        </nav>
      )}
    </main>
  );
}
