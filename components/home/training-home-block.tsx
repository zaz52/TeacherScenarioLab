'use client';

/** Scenario hall, training records and event ledger in the unified home. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountPanel } from '@/components/account/account-panel';
import { useAccount } from '@/components/account/account-provider';

import { getClientTranslation } from '@/lib/i18n';
import { characterLabel } from '@/lib/training/character-presentation';
import { hasAdminPermission } from '@/lib/training/admin-permissions';
import { TrainingHistory, TrainingTimeline } from './training-history';

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

interface LedgerEvent {
  id: string;
  trainingId: string;
  scenarioId: string;
  scenarioVersion: number;
  type: string;
  createdAt: number;
}

export function TrainingHomeBlock({
  unified = false,
  onSelectScenario,
  scenarioRevision = 0,
}: {
  unified?: boolean;
  scenarioRevision?: number;
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
  useEffect(() => {
    setTab(
      VALID_TABS.includes(requestedTab as TrainingTab) && !(unified && requestedTab === 'account')
        ? (requestedTab as TrainingTab)
        : 'hall',
    );
  }, [requestedTab, unified]);
  function selectTab(value: TrainingTab) {
    setTab(value);
    const query = new URLSearchParams(searchParams.toString());
    query.set('training', value);
    router.replace(`/?${query.toString()}#training`, { scroll: false });
  }

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
  const [recordsOwner, setRecordsOwner] = useState(''),
    [eventsOwner, setEventsOwner] = useState('');

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
  }, [scenarioRevision]);

  useEffect(() => {
    if (!account?.authenticated || tab !== 'records') return;
    const ownerId = account.ownerId,
      controller = new AbortController();
    setRecordsLoading(true);
    setRecordsError('');
    setRecords([]);
    setTrend([]);
    setRecordsOwner(ownerId);
    void fetch('/api/training/records', { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw Error();
        const data = await res.json();
        if (!controller.signal.aborted) {
          setRecords(data.records ?? []);
          setTrend(data.trend ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecordsError(t('trainingLoadFailed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecordsLoading(false);
      });
    return () => controller.abort();
  }, [account?.authenticated, account?.ownerId, tab]);

  useEffect(() => {
    if (!account?.authenticated || tab !== 'events') return;
    const ownerId = account.ownerId,
      controller = new AbortController();
    setEventsLoading(true);
    setEventsError('');
    setEvents([]);
    setEventsOwner(ownerId);
    void fetch('/api/training/events', { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw Error();
        const data = await res.json();
        if (!controller.signal.aborted) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setEventsError(t('trainingLoadFailed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsLoading(false);
      });
    return () => controller.abort();
  }, [account?.authenticated, account?.ownerId, tab]);

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

  const isAdmin = hasAdminPermission(account?.adminAccess, 'scenarios.manage');
  const tabButton = (id: TrainingTab, label: string) => (
    <button
      key={id}
      type="button"
      data-testid={`training-tab-${id}`}
      role="tab"
      aria-selected={tab === id}
      onClick={() => selectTab(id)}
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
                    {scenario.characters
                      .map((character) => characterLabel(character, getClientTranslation))
                      .join('、')}
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
        <div className="mt-6">
          {!account?.authenticated ? (
            <AccountPanel />
          ) : recordsLoading || recordsOwner !== account.ownerId ? (
            <p className="text-sm">{t('trainingLoading')}</p>
          ) : recordsError ? (
            <p role="alert" className="text-sm">
              {recordsError}
            </p>
          ) : (
            <TrainingHistory
              records={records}
              trend={trend}
              scenarios={scenarios}
              retraining={retraining}
              retrainError={retrainError}
              onRetrain={(record) => void retrain(record)}
              onStart={() => selectTab('hall')}
            />
          )}
        </div>
      )}

      {tab === 'account' && (
        <div className="mt-4">
          <AccountPanel />
        </div>
      )}

      {tab === 'events' && (
        <div className="mt-6">
          {!account?.authenticated ? (
            <AccountPanel />
          ) : eventsLoading || eventsOwner !== account.ownerId ? (
            <p className="text-sm">{t('trainingLoading')}</p>
          ) : eventsError ? (
            <p role="alert" className="text-sm">
              {eventsError}
            </p>
          ) : (
            <TrainingTimeline
              events={events}
              scenarios={scenarios}
              onStart={() => selectTab('hall')}
            />
          )}
        </div>
      )}
    </section>
  );
}
