'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen, Clock3, MessageCircle, Search, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { trainingStateLabel } from '@/lib/training/state-label';
import './training-workspace.css';
import { LibraryRemoveButton, LibraryTrash } from './training-library-actions';

export interface HistoryRecord {
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
export interface HistoryEvent {
  id: string;
  trainingId: string;
  scenarioId: string;
  scenarioVersion: number;
  type: string;
  createdAt: number;
}
export interface HistoryTrend {
  dimension: string;
  average: number;
  count: number;
}
export interface HistoryScenario {
  scenarioId: string;
  version: number;
  title: string;
}
const dimKey = (dimension: string) =>
  'training.dim' +
  dimension
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
function useHistoryLabels(scenarios: HistoryScenario[]) {
  const { t, locale } = useI18n();
  return {
    t,
    locale,
    label: (id: string, version: number) =>
      scenarios.find((scene) => scene.scenarioId === id && scene.version === version)?.title ??
      t('teacherlab.history.scenarioFallback'),
  };
}
export function TrainingHistory({
  records,
  trend,
  scenarios,
  retraining,
  retrainError,
  onRetrain,
  onStart,
}: {
  records: HistoryRecord[];
  trend: HistoryTrend[];
  scenarios: HistoryScenario[];
  retraining: string;
  retrainError: string;
  onRetrain: (record: HistoryRecord) => void;
  onStart: () => void;
}) {
  const { t, locale, label } = useHistoryLabels(scenarios);
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const [recordLimits, setRecordLimits] = useState<Record<string, number>>({});
  const evaluated = records.filter((record) => record.evaluation !== null).length;
  const visible = records.filter(
    (record) =>
      (filter === 'all' ||
        (filter === 'evaluated' ? Boolean(record.evaluation) : !record.evaluation)) &&
      `${label(record.training.scenarioId, record.training.scenarioVersion)} ${record.training.id} ${record.training.scenarioId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const groups = new Map<string, HistoryRecord[]>();
  for (const record of visible) {
    const key = `${record.training.scenarioId}@${record.training.scenarioVersion}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return (
    <div data-training-guide="records" className="training-workspace">
      <header className="history-heading">
        <div>
          <h3>{t('training.navRecords')}</h3>
          <p>{t('teacherlab.history.recordsIntro')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LibraryTrash kind="training" />
          <button onClick={onStart}>
            {t('training.navHall')}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>
      <dl className="history-stats">
        <div>
          <dt>{t('teacherlab.history.total')}</dt>
          <dd>{records.length}</dd>
        </div>
        <div>
          <dt>{t('teacherlab.history.evaluated')}</dt>
          <dd>{evaluated}</dd>
        </div>
        <div>
          <dt>{t('teacherlab.history.awaiting')}</dt>
          <dd>{records.length - evaluated}</dd>
        </div>
      </dl>
      <section className="history-panel">
        <div className="history-section-title">
          <h4>{t('training.recordsTrend')}</h4>
          <span>{t('teacherlab.history.scoreScale')}</span>
        </div>
        <p className="history-muted">
          {evaluated ? t('teacherlab.history.trendHint') : t('teacherlab.history.noScores')}
        </p>
        <div className="history-dimensions">
          {trend.map((entry) => (
            <div key={entry.dimension}>
              <div className="history-dimension-label">
                <span>{t(dimKey(entry.dimension))}</span>
                <strong>{entry.count ? entry.average : '—'}</strong>
              </div>
              <div className="history-track" aria-hidden="true">
                <span
                  style={{
                    width: `${entry.count ? Math.max(0, Math.min(100, entry.average)) : 0}%`,
                  }}
                />
              </div>
              <small>
                {entry.count
                  ? `${entry.count} ${t('training.recordsTrendCount')}`
                  : t('training.recordsUnevaluated')}
              </small>
            </div>
          ))}
        </div>
      </section>
      {records.length === 0 ? (
        <div className="history-empty">
          <BookOpen size={26} />
          <h4>{t('training.recordsEmpty')}</h4>
          <p>{t('teacherlab.history.firstTraining')}</p>
          <button onClick={onStart}>
            {t('training.hallStart')}
            <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="history-toolbar">
            <label>
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('teacherlab.history.searchRecords')}
                aria-label={t('teacherlab.history.searchRecords')}
              />
            </label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label={t('teacherlab.history.filterRecords')}
            >
              <option value="all">{t('teacherlab.history.all')}</option>
              <option value="pending">{t('teacherlab.history.awaiting')}</option>
              <option value="evaluated">{t('teacherlab.history.evaluated')}</option>
            </select>
          </div>
          {retrainError && (
            <p role="alert" className="history-notice">
              {retrainError}
            </p>
          )}
          {!visible.length && <p className="history-notice">{t('teacherlab.history.noMatches')}</p>}
          <ul className="history-records">
            {[...groups].map(([groupKey, entries]) => (
              <li key={groupKey} className="history-group">
                <details>
                  <summary className="history-group-summary">
                    <div>
                      <strong>
                        {label(entries[0].training.scenarioId, entries[0].training.scenarioVersion)}
                      </strong>
                      <p className="history-muted">
                        {entries.length} {t('teacherlab.library.attempts')} ·{' '}
                        {t('teacherlab.library.expand')}
                      </p>
                    </div>
                    <time>
                      {new Date(
                        Math.max(...entries.map((record) => record.training.updatedAt)),
                      ).toLocaleDateString(locale)}
                    </time>
                  </summary>
                  <ul className="history-records mt-3">
                    {entries.slice(0, recordLimits[groupKey] ?? 5).map((record) => (
                      <li
                        key={record.training.id}
                        data-testid={`training-record-${record.training.id}`}
                        className="history-record"
                      >
                        <div className="history-record-header">
                          <div>
                            <h4>
                              {label(record.training.scenarioId, record.training.scenarioVersion)}
                            </h4>
                            <p className="history-muted">
                              v{record.training.scenarioVersion} ·{' '}
                              {trainingStateLabel(record.training.state, (key) =>
                                t('training.' + key),
                              )}
                            </p>
                          </div>
                          <span className="history-status">
                            {record.evaluation
                              ? t('training.recordsEvaluated')
                              : t('training.recordsUnevaluated')}
                          </span>
                        </div>
                        <p className="history-summary">
                          {record.evaluation?.summary || t('teacherlab.history.continueForScore')}
                        </p>
                        {record.evaluation && (
                          <div className="history-scores">
                            {record.evaluation.dimensions.map((dimension) => (
                              <span key={dimension.dimension}>
                                {t(dimKey(dimension.dimension))}
                                <strong>{dimension.score}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="history-record-footer">
                          <time dateTime={new Date(record.training.updatedAt).toISOString()}>
                            <Clock3 size={14} />
                            {new Date(record.training.updatedAt).toLocaleString(locale)}
                          </time>
                          <div className="history-actions">
                            <LibraryRemoveButton
                              kind="training"
                              itemKey={record.training.id}
                              title={label(
                                record.training.scenarioId,
                                record.training.scenarioVersion,
                              )}
                            />
                            <Link
                              className="history-primary"
                              href={
                                record.evaluation
                                  ? `/eval/training/${record.training.id}`
                                  : `/classroom/training/${record.training.id}`
                              }
                            >
                              {record.evaluation
                                ? t('training.reviewTitle')
                                : t('teacherlab.history.continueTraining')}
                              <ArrowRight size={15} />
                            </Link>
                            <button
                              data-testid={`training-retrain-${record.training.id}`}
                              disabled={Boolean(retraining)}
                              onClick={() => onRetrain(record)}
                            >
                              <RotateCcw size={14} />
                              {retraining === record.training.id
                                ? t('training.recordsRetraining')
                                : t('training.recordsRetrain')}
                            </button>
                          </div>
                        </div>
                        <details className="history-identifiers">
                          <summary>{t('teacherlab.history.identifiers')}</summary>
                          <p>
                            {record.training.scenarioId} · {record.training.id}
                          </p>
                        </details>
                      </li>
                    ))}
                  </ul>
                  {entries.length > (recordLimits[groupKey] ?? 5) && (
                    <button
                      className="mt-3"
                      onClick={() =>
                        setRecordLimits((previous) => ({
                          ...previous,
                          [groupKey]: (previous[groupKey] ?? 5) + 5,
                        }))
                      }
                    >
                      {t('teacherlab.library.more')}
                    </button>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
const eventKeys: Record<string, string> = {
  'training-created': 'created',
  'practice-configured': 'practice',
  'training-started': 'started',
  'user-message': 'message',
  'character-reply': 'reply',
  'training-transition': 'transition',
  'state-transition': 'transition',
  'fact-disclosed': 'disclosure',
  'evaluation-completed': 'evaluation',
  'model-selected': 'model',
  'model-switched': 'switch',
  'rumor-in-group': 'rumor',
  'emergency-decision-recorded': 'emergency',
};
export function TrainingTimeline({
  events,
  scenarios,
  onStart,
}: {
  events: HistoryEvent[];
  scenarios: HistoryScenario[];
  onStart: () => void;
}) {
  const { t, locale, label } = useHistoryLabels(scenarios);
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const [limits, setLimits] = useState<Record<string, number>>({});
  const groups = new Map<string, HistoryEvent[]>();
  for (const event of events)
    groups.set(event.trainingId, [...(groups.get(event.trainingId) ?? []), event]);
  const visible = [...groups]
    .filter(
      ([id, items]) =>
        (filter === 'all' || id === filter) &&
        `${label(items[0].scenarioId, items[0].scenarioVersion)} ${id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Math.max(...b[1].map((e) => e.createdAt)) - Math.max(...a[1].map((e) => e.createdAt)),
    );
  return (
    <div data-training-guide="events" className="training-workspace">
      <header className="history-heading">
        <div>
          <h3>{t('training.navEvents')}</h3>
          <p>{t('teacherlab.library.groupedEvents')}</p>
        </div>
        <span className="history-count">
          {groups.size} {t('teacherlab.library.attempts')}
        </span>
      </header>
      <div className="history-toolbar">
        <label>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('teacherlab.history.searchRecords')}
            placeholder={t('teacherlab.history.searchRecords')}
          />
        </label>
        <select
          aria-label={t('teacherlab.history.filterTraining')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t('teacherlab.history.allTrainings')}</option>
          {[...groups].map(([id, items]) => (
            <option key={id} value={id}>
              {label(items[0].scenarioId, items[0].scenarioVersion)} · {id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      {!events.length ? (
        <div className="history-empty">
          <MessageCircle size={26} />
          <h4>{t('training.eventsEmpty')}</h4>
          <p>{t('teacherlab.history.eventsEmptyHint')}</p>
          <button onClick={onStart}>
            {t('training.hallStart')}
            <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <ul className="history-records">
          {visible.map(([id, unsorted]) => {
            const items = [...unsorted].sort(
              (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id),
            );
            const latest = items[0],
              limit = limits[id] ?? 20;
            return (
              <li key={id} className="history-group">
                <details key={`${id}:${filter}`} open={filter === id || undefined}>
                  <summary className="history-group-summary">
                    <div>
                      <strong>{label(latest.scenarioId, latest.scenarioVersion)}</strong>
                      <p className="history-muted">
                        {items.length} {t('teacherlab.history.activities')} ·{' '}
                        {items.filter((e) => e.type === 'user-message').length}{' '}
                        {t('teacherlab.library.messages')} · {t('teacherlab.library.expand')}
                      </p>
                    </div>
                    <time>{new Date(latest.createdAt).toLocaleString(locale)}</time>
                  </summary>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Link className="text-primary underline" href={`/classroom/training/${id}`}>
                      {t('teacherlab.history.openTraining')}
                    </Link>
                    <LibraryRemoveButton
                      kind="training"
                      itemKey={id}
                      title={label(latest.scenarioId, latest.scenarioVersion)}
                    />
                  </div>
                  <ol className="history-timeline mt-4">
                    {items.slice(0, limit).map((event) => {
                      const key = eventKeys[event.type] ?? 'activity';
                      return (
                        <li key={event.id}>
                          <div className="history-timeline-row">
                            <span className="history-dot" aria-hidden="true" />
                            <div className="history-timeline-body">
                              <div className="history-event-heading">
                                <strong>{t('teacherlab.history.eventLabels.' + key)}</strong>
                                <time dateTime={new Date(event.createdAt).toISOString()}>
                                  {new Date(event.createdAt).toLocaleString(locale)}
                                </time>
                              </div>
                              <p className="history-muted">
                                {t('teacherlab.history.eventHints.' + key)}
                              </p>
                              <details className="history-identifiers">
                                <summary>{t('teacherlab.history.identifiers')}</summary>
                                <p>
                                  {event.type} · {event.trainingId}
                                </p>
                              </details>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {items.length > limit && (
                    <button
                      onClick={() => setLimits((previous) => ({ ...previous, [id]: limit + 20 }))}
                    >
                      {t('teacherlab.library.more')}
                    </button>
                  )}
                </details>
              </li>
            );
          })}
          {!visible.length && (
            <li className="history-notice">{t('teacherlab.history.noMatches')}</li>
          )}
        </ul>
      )}
    </div>
  );
}
