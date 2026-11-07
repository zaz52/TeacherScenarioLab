'use client';

/** Scenario hall, training records and event ledger in the unified home. */
import Link from 'next/link';
import { DEFAULT_PRACTICE } from '@/lib/training/practice-config';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountPanel } from '@/components/account/account-panel';
import { useAccount } from '@/components/account/account-provider';

import { getClientTranslation } from '@/lib/i18n';
import { characterLabel } from '@/lib/training/character-presentation';
import { hasAdminPermission } from '@/lib/training/admin-permissions';
import {
  LibraryRemoveButton,
  LibraryTrash,
  TRAINING_LIBRARY_CHANGED,
} from './training-library-actions';
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
  practiceFocus = 'family',
}: {
  unified?: boolean;
  scenarioRevision?: number;
  practiceFocus?: 'family' | 'campus';
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

  const [libraryRevision, setLibraryRevision] = useState(0);
  const [scenarioTitles, setScenarioTitles] = useState<
    Array<{ scenarioId: string; version: number; title: string }>
  >([]);
  useEffect(() => {
    const refresh = () => setLibraryRevision((value) => value + 1);
    window.addEventListener(TRAINING_LIBRARY_CHANGED, refresh);
    return () => window.removeEventListener(TRAINING_LIBRARY_CHANGED, refresh);
  }, []);
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
    const controller = new AbortController();
    setHallLoading(true);
    setHallError('');
    setScenarios([]);
    setScenarioTitles([]);
    void fetch('/api/training/scenarios', { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw Error();
        const data = await res.json();
        if (!controller.signal.aborted) {
          setScenarios(data.scenarios ?? []);
          setScenarioTitles(data.scenarioTitles ?? data.scenarios ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setHallError(t('trainingLoadFailed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setHallLoading(false);
      });
    return () => controller.abort();
  }, [scenarioRevision, libraryRevision, account?.ownerId]);

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
  }, [account?.authenticated, account?.ownerId, tab, libraryRevision]);

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
  }, [account?.authenticated, account?.ownerId, tab, libraryRevision]);

  async function startTraining(scenarioId: string, scenarioVersion: number) {
    setStarting(scenarioId);
    setHallError('');
    try {
      const res = await fetch('/api/training-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          scenarioVersion,
          practice: {
            ...DEFAULT_PRACTICE,
            grade: scenarioId === 'epi-class-fever' ? DEFAULT_PRACTICE.grade : 'scenario',
            focus: scenarios
              .find((s) => s.scenarioId === scenarioId && s.version === scenarioVersion)
              ?.characters.some((c) => c.role === 'parent')
              ? 'family'
              : 'campus',
          },
        }),
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
      const res = await fetch('/api/training-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTrainingId: record.training.id,
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
      <div data-training-guide="history" role="tablist" className="mt-4 flex flex-wrap gap-2">
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
        <div data-motion-panel className="mt-4" data-training-guide="scenarios">
          <div className="mb-3 flex justify-end">
            <LibraryTrash kind="scenario" />
          </div>
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
                  className="teacherlab-motion-card rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{scenario.title}</h3>
                    <LibraryRemoveButton
                      kind="scenario"
                      itemKey={`${scenario.scenarioId}@${scenario.version}`}
                      title={scenario.title}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{scenario.setting}</p>
                  <p className="mt-1 text-sm">{scenario.goal}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {scenario.characters
                      .filter(
                        (character) =>
                          practiceFocus !== 'family' ||
                          !scenario.characters.some((c) => c.role === 'parent') ||
                          character.role === 'parent',
                      )
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
        <div data-motion-panel className="mt-6">
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
              scenarios={scenarioTitles}
              retraining={retraining}
              retrainError={retrainError}
              onRetrain={(record) => void retrain(record)}
              onStart={() => selectTab('hall')}
            />
          )}
        </div>
      )}

      {tab === 'account' && (
        <div data-motion-panel className="mt-4">
          <AccountPanel />
        </div>
      )}

      {tab === 'events' && (
        <div data-motion-panel className="mt-6">
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
              scenarios={scenarioTitles}
              onStart={() => selectTab('hall')}
            />
          )}
        </div>
      )}
    </section>
  );
}
