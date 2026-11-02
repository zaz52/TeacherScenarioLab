'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen, Clock3, MessageCircle, Search, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { trainingStateLabel } from '@/lib/training/state-label';
import './training-workspace.css';

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
  const evaluated = records.filter((record) => record.evaluation !== null).length;
  const visible = records.filter(
    (record) =>
      (filter === 'all' ||
        (filter === 'evaluated' ? Boolean(record.evaluation) : !record.evaluation)) &&
      `${label(record.training.scenarioId, record.training.scenarioVersion)} ${record.training.id} ${record.training.scenarioId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="training-workspace">
      <header className="history-heading">
        <div>
          <h3>{t('training.navRecords')}</h3>
          <p>{t('teacherlab.history.recordsIntro')}</p>
        </div>
        <button onClick={onStart}>
          {t('training.navHall')}
          <ArrowRight size={15} />
        </button>
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
            {visible.map((record) => (
              <li
                key={record.training.id}
                data-testid={`training-record-${record.training.id}`}
                className="history-record"
              >
                <div className="history-record-header">
                  <div>
                    <h4>{label(record.training.scenarioId, record.training.scenarioVersion)}</h4>
                    <p className="history-muted">
                      v{record.training.scenarioVersion} ·{' '}
                      {trainingStateLabel(record.training.state, (key) => t('training.' + key))}
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
        </>
      )}
    </div>
  );
}
const eventKeys: Record<string, string> = {
  'training-created': 'created',
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
  const [filter, setFilter] = useState('all');
  const visible = events.filter((event) => filter === 'all' || event.trainingId === filter);
  const trainings = [...new Map(events.map((event) => [event.trainingId, event])).values()];
  return (
    <div className="training-workspace">
      <header className="history-heading">
        <div>
          <h3>{t('training.navEvents')}</h3>
          <p>{t('teacherlab.history.eventsIntro')}</p>
        </div>
        <span className="history-count">
          {visible.length} {t('teacherlab.history.activities')}
        </span>
      </header>
      {events.length ? (
        <>
          <div className="history-toolbar">
            <label className="history-filter-label">
              {t('teacherlab.history.filterTraining')}
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">{t('teacherlab.history.allTrainings')}</option>
                {trainings.map((event) => (
                  <option key={event.trainingId} value={event.trainingId}>
                    {label(event.scenarioId, event.scenarioVersion)} ·{' '}
                    {event.trainingId.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ol className="history-timeline">
            {visible.map((event, index) => {
              const key = eventKeys[event.type] ?? 'activity';
              const day = new Date(event.createdAt).toLocaleDateString(locale);
              const previousDay = index
                ? new Date(visible[index - 1].createdAt).toLocaleDateString(locale)
                : '';
              return (
                <li key={event.id}>
                  {day !== previousDay && <h4 className="history-day">{day}</h4>}
                  <div className="history-timeline-row">
                    <span className="history-dot" aria-hidden="true" />
                    <div className="history-timeline-body">
                      <div className="history-event-heading">
                        <strong>{t('teacherlab.history.eventLabels.' + key)}</strong>
                        <time dateTime={new Date(event.createdAt).toISOString()}>
                          {new Date(event.createdAt).toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                      <p>
                        {label(event.scenarioId, event.scenarioVersion)} · v{event.scenarioVersion}
                      </p>
                      <p className="history-muted">{t('teacherlab.history.eventHints.' + key)}</p>
                      <Link
                        href={
                          event.type === 'evaluation-completed'
                            ? `/eval/training/${event.trainingId}`
                            : `/classroom/training/${event.trainingId}`
                        }
                      >
                        {t(
                          event.type === 'evaluation-completed'
                            ? 'training.reviewTitle'
                            : 'teacherlab.history.openTraining',
                        )}
                        <ArrowRight size={14} />
                      </Link>
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
        </>
      ) : (
        <div className="history-empty">
          <MessageCircle size={26} />
          <h4>{t('training.eventsEmpty')}</h4>
          <p>{t('teacherlab.history.eventsEmptyHint')}</p>
          <button onClick={onStart}>
            {t('training.hallStart')}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
