'use client';

/**
 * TeacherScenarioLab — training block on the fork's home page.
 *
 * This is where the old parallel /training tree now lives: the scenario
 * hall, the learner's records, account and event ledger, as tabs inside
 * one section of the restored upstream home page (below the library).
 * Each tab reuses the training APIs the old pages used; only the routes
 * changed: rooms live under /classroom/training/[id], reviews under
 * /eval/training/[id], references under /courseware/references and the
 * admin console under /settings/training.
 *
 * The initial tab follows ?training= (hall | records | account | events)
 * so reviews and other pages can link back to a specific tab; tab clicks
 * stay local state and never rewrite the home page URL.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

export function TrainingHomeBlock() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('training');
  const [tab, setTab] = useState<TrainingTab>(
    VALID_TABS.includes(requestedTab as TrainingTab) ? (requestedTab as TrainingTab) : 'hall',
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

  const [me, setMe] = useState<MeInfo | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState('');
  const [notice, setNotice] = useState('');

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

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch('/api/training/accounts/me');
      const data = (await res.json()) as MeInfo & { success?: boolean };
      if (!res.ok) throw new Error('load failed');
      setMe(data);
    } catch {
      setMeError(t('accountLoadFailed'));
    } finally {
      setMeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

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

  async function logout() {
    setNotice('');
    try {
      const res = await fetch('/api/training/accounts/logout', { method: 'POST' });
      if (!res.ok) {
        setNotice(t('accountClaimFailed'));
        return;
      }
      setNotice(t('accountLogoutDone'));
      await loadMe();
    } catch {
      setNotice(t('accountClaimFailed'));
    }
  }

  async function claim() {
    setNotice('');
    try {
      const res = await fetch('/api/training/claim', { method: 'POST' });
      const data = (await res.json()) as { success?: boolean; claimed?: number };
      if (res.status === 409) {
        setNotice(t('accountClaimNone'));
        return;
      }
      if (!res.ok || !data.success) {
        setNotice(t('accountClaimFailed'));
        return;
      }
      setNotice(`${t('accountClaimSuccess')}：${data.claimed ?? 0}`);
    } catch {
      setNotice(t('accountClaimFailed'));
    }
  }

  const isAdmin = me?.roles.includes('admin') === true;
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
      data-testid="training-home-block"
      className="w-full rounded-xl border border-border bg-background p-6"
    >
      <h2 className="text-lg font-semibold">{t('trainingHomeTitle')}</h2>
      <div role="tablist" className="mt-4 flex flex-wrap gap-2">
        {tabButton('hall', t('navHall'))}
        {tabButton('records', t('navRecords'))}
        {tabButton('account', t('navAccount'))}
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
        {isAdmin && (
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
                    onClick={() => void startTraining(scenario.scenarioId, scenario.version)}
                    disabled={starting !== ''}
                    className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {starting === scenario.scenarioId ? t('hallStarting') : t('hallStart')}
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
          {meLoading && <p className="text-sm">{t('trainingLoading')}</p>}
          {!meLoading && meError && <p className="text-sm">{meError}</p>}
          {!meLoading && !meError && me && (
            <>
              {notice && <p className="text-sm">{notice}</p>}
              {!me.authenticated && <p className="text-sm">{t('accountAnonymous')}</p>}
              {me.authenticated && (
                <>
                  <h3 className="font-medium">{t('accountInfo')}</h3>
                  <p className="mt-1 text-sm">
                    {t('accountDisplayName')}：{me.displayName ?? '—'}
                  </p>
                  <p className="mt-1 text-sm">
                    {t('accountOwnerId')}：{me.ownerId}
                  </p>
                  <p className="mt-1 text-sm">
                    {t('accountRoles')}：{me.roles.length > 0 ? me.roles.join('、') : '—'}
                  </p>
                  <p className="mt-3">
                    <button
                      type="button"
                      data-testid="training-logout"
                      onClick={() => void logout()}
                      className="rounded-md border border-border px-3 py-1.5 text-sm"
                    >
                      {t('accountLogout')}
                    </button>
                  </p>
                  <h3 className="mt-4 font-medium">{t('accountClaimTitle')}</h3>
                  <p className="mt-1 text-sm">{t('accountClaimDesc')}</p>
                  <p className="mt-3">
                    <button
                      type="button"
                      data-testid="training-claim"
                      onClick={() => void claim()}
                      className="rounded-md border border-border px-3 py-1.5 text-sm"
                    >
                      {t('accountClaimButton')}
                    </button>
                  </p>
                </>
              )}
            </>
          )}
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
