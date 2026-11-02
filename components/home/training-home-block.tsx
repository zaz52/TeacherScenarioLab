'use client';

/** Scenario hall, training records and event ledger in the unified home. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountPanel } from '@/components/account/account-panel';
import { useAccount } from '@/components/account/account-provider';

import { getClientTranslation } from '@/lib/i18n';
import { trainingStateLabel } from '@/lib/training/state-label';

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

type TrainingTab = 'hall' | 'records' | 'account' | 'events';

const VALID_TABS: readonly TrainingTab[] = ['hall', 'records', 'account', 'events'];

interface HallScenario {
  scenarioId: string;
  version: number;
  title: string;
  setting: string;
  goal: string;
  characters: Array<{ id: string; name: string; role: string }>;
}

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

interface MeInfo {
  authenticated: boolean;
  ownerId: string;
  kind: string;
  roles: string[];
  displayName: string | null;
}

interface LedgerEvent {
  id: string;
  trainingId: string;
  scenarioId: string;
  scenarioVersion: number;
  type: string;
  createdAt: number;
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

export function TrainingHomeBlock({
  unified = false,
  onSelectScenario,
}: {
  unified?: boolean;
  onSelectScenario?: (scenario: HallScenario) => void;
}) {
  const { account } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('training');
  const [tab, setTab] = useState<TrainingTab>(
    VALID_TABS.includes(requestedTab as TrainingTab) && !(unified && requestedTab === 'account')
      ? (requestedTab as TrainingTab)
      : 'hall',
  );

  const [scenarios, setScenarios] = useState<HallScenario[]>([]);
  const [hallLoading, setHallLoading] = useState(true);
  const [hallError, setHallError] = useState('');
  const [starting, setStarting] = useState('');

  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [retraining, setRetraining] = useState('');
  const [retrainError, setRetrainError] = useState('');

  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/scenarios');
        const data = (await res.json()) as { scenarios?: HallScenario[] };
        if (!res.ok) throw new Error('load failed');
        setScenarios(data.scenarios ?? []);
      } catch {
        setHallError(t('trainingLoadFailed'));
      } finally {
        setHallLoading(false);
      }
    })();
  }, []);

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
        setRecordsError(t('trainingLoadFailed'));
      } finally {
        setRecordsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/events');
        const data = (await res.json()) as { events?: LedgerEvent[] };
        if (!res.ok) throw new Error('load failed');
        setEvents(data.events ?? []);
      } catch {
        setEventsError(t('trainingLoadFailed'));
      } finally {
        setEventsLoading(false);
      }
    })();
  }, []);

  async function startTraining(scenarioId: string, scenarioVersion: number) {
    setStarting(scenarioId);
    setHallError('');
    try {
      const res = await fetch('/api/training/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, scenarioVersion }),
      });
      const data = (await res.json()) as { training?: { id: string } };
      if (!res.ok || !data.training) throw new Error('start failed');
      router.push(`/classroom/training/${data.training.id}`);
    } catch {
      setHallError(t('hallStartFailed'));
      setStarting('');
    }
  }

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
      const data = (await res.json()) as { training?: { id: string } };
      if (!res.ok || !data.training) throw new Error('retrain failed');
      router.push(`/classroom/training/${data.training.id}`);
    } catch {
      setRetrainError(t('recordsRetrainFailed'));
      setRetraining('');
    }
  }

  const isAdmin = account?.roles.includes('admin') === true;
  const tabButton = (id: TrainingTab, label: string) => (
    <button
      key={id}
      type="button"
      data-testid={`training-tab-${id}`}
      onClick={() => setTab(id)}
      className={
        tab === id
          ? 'rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground'
          : 'rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
      }
    >
      {label}
    </button>
  );

  return (
    <section
      id="training"
      data-testid="training-home-block"
      className="w-full rounded-xl border border-border bg-background p-6"
    >
      <h2 className="text-lg font-semibold">{t('trainingHomeTitle')}</h2>
      <div role="tablist" className="mt-4 flex flex-wrap gap-2">
        {tabButton('hall', t('navHall'))}
        {tabButton('records', t('navRecords'))}
        {!unified && tabButton('account', t('navAccount'))}
        {tabButton('events', t('navEvents'))}
      </div>
      <p className="mt-4 text-sm">
        <Link
          href="/courseware/references"
          data-testid="training-references-link"
          className="underline"
        >
          {t('referencesTitle')}
        </Link>
        {isAdmin && !unified && (
          <>
            {' · '}
            <Link href="/settings/training" data-testid="training-admin-link" className="underline">
              {t('navAdmin')}
            </Link>
          </>
        )}
      </p>

      {tab === 'hall' && (
        <div className="mt-4">
          {hallLoading && <p className="text-sm">{t('trainingLoading')}</p>}
          {!hallLoading && hallError && <p className="text-sm">{hallError}</p>}
          {!hallLoading && !hallError && scenarios.length === 0 && (
            <p className="text-sm">{t('hallEmpty')}</p>
          )}
          {!hallLoading && !hallError && scenarios.length > 0 && (
            <ul className="flex flex-col gap-4">
              {scenarios.map((scenario) => (
                <li
                  key={`${scenario.scenarioId}-${scenario.version}`}
                  data-testid={`training-scenario-${scenario.scenarioId}`}
                  className="rounded-lg border border-border p-4"
                >
                  <h3 className="font-medium">{scenario.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{scenario.setting}</p>
                  <p className="mt-1 text-sm">{scenario.goal}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {scenario.characters.map((character) => character.name).join('、')}
                  </p>
                  <button
                    type="button"
                    data-testid={`training-start-${scenario.scenarioId}`}
                    onClick={() =>
                      onSelectScenario
                        ? onSelectScenario(scenario)
                        : void startTraining(scenario.scenarioId, scenario.version)
                    }
                    disabled={starting !== ''}
                    className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {onSelectScenario
                      ? getClientTranslation('teacherlab.composer.chooseScenario')
                      : starting === scenario.scenarioId
                        ? t('hallStarting')
                        : t('hallStart')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="mt-4">
          {recordsLoading && <p className="text-sm">{t('trainingLoading')}</p>}
          {!recordsLoading && recordsError && <p className="text-sm">{recordsError}</p>}
          {!recordsLoading && !recordsError && (
            <>
              <h3 className="font-medium">{t('recordsTrend')}</h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {trend.map((entry) => (
                  <li key={entry.dimension}>
                    {t(dimLabelKey(entry.dimension))}：{entry.average}（{entry.count}
                    {t('recordsTrendCount')}）
                  </li>
                ))}
              </ul>
              {records.length === 0 && <p className="mt-4 text-sm">{t('recordsEmpty')}</p>}
              {retrainError && <p className="mt-4 text-sm">{retrainError}</p>}
              <ul className="mt-4 flex flex-col gap-3">
                {records.map((record) => (
                  <li
                    key={record.training.id}
                    data-testid={`training-record-${record.training.id}`}
                    className="rounded-lg border border-border p-4 text-sm"
                  >
                    <p>
                      <Link href={`/classroom/training/${record.training.id}`}>
                        {record.training.scenarioId} v{record.training.scenarioVersion}（
                        {trainingStateLabel(record.training.state, t)}）
                      </Link>{' '}
                      <Link href={`/eval/training/${record.training.id}`}>{t('reviewTitle')}</Link>{' '}
                      <button
                        type="button"
                        data-testid={`training-retrain-${record.training.id}`}
                        onClick={() => void retrain(record)}
                        disabled={retraining === record.training.id}
                        className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
                      >
                        {retraining === record.training.id
                          ? t('recordsRetraining')
                          : t('recordsRetrain')}
                      </button>
                    </p>
                    {record.evaluation ? (
                      <p className="mt-1 text-muted-foreground">
                        {t('recordsEvaluated')}：
                        {record.evaluation.dimensions
                          .map((d) => `${t(dimLabelKey(d.dimension))} ${d.score}`)
                          .join('、')}
                      </p>
                    ) : (
                      <p className="mt-1 text-muted-foreground">{t('recordsUnevaluated')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'account' && (
        <div className="mt-4">
          <AccountPanel />
        </div>
      )}

      {tab === 'events' && (
        <div className="mt-4">
          {eventsLoading && <p className="text-sm">{t('trainingLoading')}</p>}
          {!eventsLoading && eventsError && <p className="text-sm">{eventsError}</p>}
          {!eventsLoading && !eventsError && events.length === 0 && (
            <p className="text-sm">{t('eventsEmpty')}</p>
          )}
          {!eventsLoading && !eventsError && events.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {events.map((event) => (
                <li key={event.id}>
                  {event.type} — {t('eventsTraining')} {event.trainingId}（{event.scenarioId} v
                  {event.scenarioVersion}，{new Date(event.createdAt).toLocaleString()}）
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
