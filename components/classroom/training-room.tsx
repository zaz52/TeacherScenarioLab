'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Settings,
  School,
  ShieldCheck,
  Users,
  BookOpen,
  Volume2,
  Square,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ClipboardList,
} from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useASRAvailable } from '@/lib/hooks/use-asr-available';
import { SpeechButton } from '@/components/audio/speech-button';
import { SettingsDialog } from '@/components/settings';
import { playBrowserTTSPreview, isBrowserTTSAbortError } from '@/lib/audio/browser-tts-preview';
import {
  characterLabel,
  characterRole,
  characterAvatar,
  type PresentableCharacter,
} from '@/lib/training/character-presentation';
import {
  MESSAGEABLE_STATES,
  TRAINING_STATES,
  nextStates,
  isTrainingState,
} from '@/lib/training/state-machine';
import { trainingStateLabel } from '@/lib/training/state-label';
import { cn } from '@/lib/utils';
import type { SettingsSection } from '@/lib/types/settings';
import { modelSettingsClient } from '@/lib/model-settings/client';

interface Training {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  state: string;
}
interface Scenario {
  title: string;
  setting: string;
  goal: string;
  rules: string[];
  learnerRole: string;
  characters: PresentableCharacter[];
}
interface Message {
  id: string;
  role: string;
  characterId: string | null;
  content: string;
}
interface Evaluation {
  dimensions: Array<{ dimension: string; score: number; comment: string; evidence: string[] }>;
  summary: string;
  suggestions: string[];
}
class RoomError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success)
    throw new RoomError(
      typeof data?.error === 'object' && data.error
        ? (data.error.code ?? 'REQUEST_FAILED')
        : (data?.error ?? 'REQUEST_FAILED'),
      response.status,
    );
  return data as T;
}
const button =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';

export function TrainingRoom() {
  const { t, locale } = useI18n(),
    params = useParams<{ id: string }>(),
    id = params.id;
  const [training, setTraining] = useState<Training | null>(null),
    [scenario, setScenario] = useState<Scenario | null>(null),
    [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(''),
    [characterId, setCharacterId] = useState(''),
    [mode, setMode] = useState<'scripted' | 'model'>('scripted');
  const [busy, setBusy] = useState(false),
    [replying, setReplying] = useState(false),
    [error, setError] = useState(''),
    [replyPending, setReplyPending] = useState(false);
  const [speechBusy, setSpeechBusy] = useState(false);
  const [disclosures, setDisclosures] = useState<Array<{ id: string; content: string }>>([]),
    [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false),
    [settingsSection, setSettingsSection] = useState<SettingsSection>('training-routing');
  const [scripted, setScripted] = useState<Set<string>>(new Set()),
    [speaking, setSpeaking] = useState(''),
    [briefingOpen, setBriefingOpen] = useState(true);
  const active = useRef(false),
    pending = useRef<{ content: string; key: string } | null>(null),
    cancelSpeech = useRef<(() => void) | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const asrAvailable = useASRAvailable(),
    draftKey = `tsl-room-draft-${id}`;
  const stateLabel = (state: string) => trainingStateLabel(state, (key) => t(`training.${key}`));
  const sayError = useCallback(
    (value: unknown) => {
      const code = value instanceof RoomError ? value.code : '';
      setError(
        t(
          value instanceof RoomError && [401, 403].includes(value.status)
            ? 'teacherlab.simulation.loginError'
            : value instanceof RoomError && value.status === 503 && code === 'UPSTREAM_ERROR'
              ? 'teacherlab.simulation.modelError'
              : value instanceof RoomError && value.status === 409
                ? 'teacherlab.simulation.conflict'
                : code === 'SCENARIO_NOT_FOUND'
                  ? 'teacherlab.simulation.missingScene'
                  : 'teacherlab.simulation.requestError',
        ),
      );
    },
    [t],
  );
  const refreshMessages = useCallback(async () => {
    const data = await api<{ messages: Message[] }>(`/api/training/trainings/${id}/messages`);
    setMessages(data.messages);
    setReplyPending(data.messages.at(-1)?.role === 'user');
    return data.messages;
  }, [id]);
  const refreshTraining = useCallback(async () => {
    const data = await api<{ training: Training }>(`/api/training/trainings/${id}`);
    setTraining(data.training);
    return data.training;
  }, [id]);
  const refreshFacts = useCallback(async () => {
    const data = await api<{ facts: Array<{ id: string; content: string }> }>(
      `/api/training/trainings/${id}/disclosures`,
    );
    setDisclosures(data.facts);
  }, [id]);
  useEffect(() => {
    let live = true;
    void (async () => {
      const data = await api<{ training: Training }>(`/api/training/trainings/${id}`);
      const info = await api<{ scenario: Scenario }>(
        `/api/training/scenarios/${data.training.scenarioId}/versions/${data.training.scenarioVersion}`,
      );
      if (!live) return;
      setTraining(data.training);
      setScenario(info.scenario);
      await Promise.all([
        refreshMessages(),
        refreshFacts(),
        api<{ evaluation: Evaluation }>(`/api/training/trainings/${id}/evaluation`)
          .then((value) => {
            if (live) setEvaluation(value.evaluation);
          })
          .catch((value) => {
            if (!(value instanceof RoomError && value.status === 404)) throw value;
          }),
      ]);
    })().catch((value) => {
      if (live) sayError(value);
    });
    return () => {
      live = false;
    };
  }, [id, refreshMessages, refreshFacts, sayError]);
  useEffect(() => {
    try {
      const entry = sessionStorage.getItem(`tsl-room-entry-${id}`);
      if (entry) {
        const value = JSON.parse(entry);
        if (typeof value.characterId === 'string') setCharacterId(value.characterId);
        if (value.mode === 'scripted' || value.mode === 'model') setMode(value.mode);
        sessionStorage.removeItem(`tsl-room-entry-${id}`);
      }
      setInput(localStorage.getItem(draftKey) ?? '');
    } catch {
      /* Local draft recovery is optional. */
    }
  }, [id, draftKey]);
  useEffect(() => () => cancelSpeech.current?.(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, replying]);
  useEffect(() => {
    if (!input.trim()) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [input]);
  function updateInput(value: string) {
    setInput(value);
    try {
      localStorage.setItem(draftKey, value);
    } catch {
      /* Optional draft backup. */
    }
  }
  function openSettings(section: SettingsSection) {
    setSettingsSection(section);
    setSettingsOpen(true);
  }
  async function enableSpeech() {
    if (speechBusy) return;
    setSpeechBusy(true);
    setError('');
    try {
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) throw Error();
      const state = await modelSettingsClient.load({ fresh: true }),
        view = state.view;
      if (!view || view.slots.find((slot) => slot.slot === 'asr')?.locked) throw Error();
      let provider = view.providers.find(
        (value) => value.capabilities.asr?.registryId === 'browser-native',
      );
      if (!provider) {
        const preset = view.presets.find(
          (value) => value.capabilities.asr?.registryId === 'browser-native',
        );
        if (!preset) throw Error();
        const providerId = 'teacherlab-speech-' + crypto.randomUUID().slice(0, 8);
        const added = await modelSettingsClient.apply({
          kind: 'provider',
          id: providerId,
          preset: preset.id,
        });
        if (!added.ok) throw Error();
        provider = added.view.providers.find((value) => value.id === providerId);
      }
      if (!provider) throw Error();
      const assigned = await modelSettingsClient.apply({
        kind: 'slots',
        set: { asr: provider.id },
      });
      if (!assigned.ok) throw Error();
    } catch {
      setError(t('teacherlab.simulation.speechError'));
    } finally {
      setSpeechBusy(false);
    }
  }
  async function ensureStarted() {
    if (training?.state !== 'created') return training;
    try {
      const data = await api<{ training: Training }>(`/api/training/trainings/${id}/start`, {});
      setTraining(data.training);
      return data.training;
    } catch (value) {
      if (value instanceof RoomError && value.status === 409) {
        const latest = await refreshTraining();
        if (latest.state !== 'created') return latest;
      }
      throw value;
    }
  }
  async function requestReply() {
    setReplying(true);
    setReplyPending(true);
    try {
      const data = await api<{ message: Message; mode: string }>(
        `/api/training/trainings/${id}/reply`,
        { ...(characterId ? { characterId } : {}), mode },
      );
      if (data.mode === 'scripted') setScripted((value) => new Set(value).add(data.message.id));
      setReplyPending(false);
      await Promise.all([refreshMessages(), refreshFacts()]);
    } finally {
      setReplying(false);
    }
  }
  async function send() {
    if (active.current || !input.trim() || replyPending) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      const latest = await ensureStarted();
      if (!latest || !(MESSAGEABLE_STATES as readonly string[]).includes(latest.state))
        throw new RoomError('TRAINING_STATE_CONFLICT', 409);
      const content = input.trim();
      if (pending.current?.content !== content)
        pending.current = { content, key: crypto.randomUUID() };
      await api(`/api/training/trainings/${id}/messages`, {
        content,
        idempotencyKey: pending.current.key,
      });
      pending.current = null;
      updateInput('');
      setReplyPending(true);
      await refreshMessages();
      await requestReply();
    } catch (value) {
      sayError(value);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function retryReply() {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      const history = await refreshMessages();
      if (history.at(-1)?.role === 'character') {
        setReplyPending(false);
        await refreshFacts();
      } else await requestReply();
    } catch (value) {
      sayError(value);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function move(to: string) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      if (training?.state === 'created') await ensureStarted();
      else {
        const data = await api<{ training: Training }>(`/api/training/trainings/${id}/transition`, {
          to,
        });
        setTraining(data.training);
      }
    } catch (value) {
      sayError(value);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function evaluate() {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      const data = await api<{ evaluation: Evaluation }>(
        `/api/training/trainings/${id}/evaluate`,
        {},
      );
      setEvaluation(data.evaluation);
      const completed = await api<{ training: Training }>(
        `/api/training/trainings/${id}/transition`,
        { to: 'completed' },
      );
      setTraining(completed.training);
    } catch (value) {
      sayError(value);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function read(message: Message) {
    cancelSpeech.current?.();
    if (speaking === message.id) {
      setSpeaking('');
      return;
    }
    const playback = playBrowserTTSPreview({ text: message.content, locale });
    cancelSpeech.current = playback.cancel;
    setSpeaking(message.id);
    try {
      await playback.promise;
    } catch (value) {
      if (!isBrowserTTSAbortError(value)) setError(t('teacherlab.simulation.audioError'));
    } finally {
      setSpeaking((value) => (value === message.id ? '' : value));
    }
  }
  const currentRole = scenario?.characters.find((value) => value.id === characterId);
  const canTalk =
    training?.state === 'created' ||
    (MESSAGEABLE_STATES as readonly string[]).includes(training?.state ?? '');
  const next =
    training && isTrainingState(training.state) ? nextStates(training.state)[0] : undefined;
  const phaseIndex = TRAINING_STATES.indexOf(training?.state as (typeof TRAINING_STATES)[number]);
  return (
    <main className="min-h-dvh bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50/60 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className={button} aria-label={t('training.navHome')}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <Link href="/" className="text-sm font-semibold">
              {t('teacherlab.brand')}
            </Link>
            <p className="text-xs text-muted-foreground">
              TeacherScenarioLab · {t('teacherlab.simulation.room')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/?training=records#training" className={button}>
            <ClipboardList size={15} />
            <span className="max-sm:hidden">{t('training.navRecords')}</span>
          </Link>
          <button onClick={() => openSettings('training-routing')} className={button}>
            <Settings size={15} />
            {t('settings.title')}
          </button>
        </div>
      </header>
      {!training || !scenario ? (
        <section className="mx-auto flex max-w-xl flex-col items-center gap-4 p-16 text-center">
          <School size={40} className="text-violet-500" />
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button className={button} onClick={() => window.location.reload()}>
                <RefreshCw size={16} />
                {t('teacherlab.reload')}
              </button>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin" />
              <p>{t('training.loading')}</p>
            </>
          )}
        </section>
      ) : (
        <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-medium tracking-widest text-violet-600">
                {t('teacherlab.composer.trainingMode')}
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">{scenario.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('teacherlab.simulation.youAre')} · {scenario.learnerRole}
              </p>
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-100/60 px-4 py-2 text-xs text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
              {stateLabel(training.state)}
            </span>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
            <aside className="rounded-2xl border border-border/60 bg-background/85 p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users size={16} />
                {t('teacherlab.simulation.participants')}
              </h2>
              <p className="mb-3 text-xs leading-5 text-muted-foreground">
                {t('teacherlab.simulation.roleHint')}
              </p>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                <button
                  className={cn(
                    button,
                    'justify-start',
                    !characterId &&
                      'border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-950',
                  )}
                  disabled={busy}
                  onClick={() => setCharacterId('')}
                >
                  <MessageCircle size={18} />
                  {t('training.directorChoice')}
                </button>
                {scenario.characters.map((character) => (
                  <button
                    key={character.id}
                    disabled={busy}
                    onClick={() => setCharacterId(character.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-2 text-left transition hover:border-violet-300',
                      characterId === character.id
                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/50'
                        : 'border-transparent',
                    )}
                  >
                    <img
                      src={characterAvatar(character)}
                      alt=""
                      className="h-11 w-11 rounded-full bg-violet-100"
                    />
                    <span>
                      <strong className="block text-sm font-medium">
                        {t(`teacherlab.simulation.roles.${characterRole(character)}`)}
                      </strong>
                      <span className="text-xs text-muted-foreground">{character.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <section className="flex min-h-[650px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/90 shadow-sm">
              <div className="border-b border-border/60 bg-gradient-to-br from-violet-50/80 to-blue-50/60 p-5 dark:from-violet-950/25 dark:to-blue-950/25">
                <button
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setBriefingOpen((value) => !value)}
                >
                  <span className="flex items-center gap-3">
                    <span className="rounded-2xl bg-background p-3 text-violet-500 shadow-sm">
                      <School size={26} />
                    </span>
                    <span>
                      <strong className="block text-sm">{t('teacherlab.simulation.scene')}</strong>
                      <span className="text-xs text-muted-foreground">
                        {t('teacherlab.simulation.sceneHint')}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn('transition', briefingOpen && 'rotate-180')}
                  />
                </button>
                {briefingOpen && (
                  <div className="mt-4 space-y-3">
                    <p className="whitespace-pre-wrap text-sm leading-7">{scenario.setting}</p>
                    <p className="rounded-xl border border-border/50 bg-background/70 p-3 text-xs leading-6">
                      <strong>{t('training.goal')}：</strong>
                      {scenario.goal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('teacherlab.simulation.simulationNotice')}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
                <span className="text-sm font-medium">
                  {currentRole ? characterLabel(currentRole, t) : t('training.directorChoice')}
                </span>
                <select
                  value={mode}
                  disabled={busy}
                  onChange={(event) => setMode(event.target.value as 'scripted' | 'model')}
                  className="rounded-full border bg-transparent px-3 py-1 text-xs"
                >
                  <option value="scripted">{t('training.modeScripted')}</option>
                  <option value="model">{t('training.modeModel')}</option>
                </select>
              </div>
              <div
                aria-live="polite"
                role="log"
                className="flex max-h-[65dvh] min-h-64 flex-1 flex-col gap-5 overflow-y-auto p-5"
              >
                {messages.length === 0 && (
                  <div className="my-auto rounded-2xl border border-dashed p-6 text-center">
                    <MessageCircle className="mx-auto mb-3 text-violet-400" size={28} />
                    <h2 className="mb-2 font-medium">{t('teacherlab.simulation.welcome')}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {t('teacherlab.simulation.welcomeHint')}
                    </p>
                  </div>
                )}
                {messages.map((message) => {
                  const character = scenario.characters.find(
                    (value) => value.id === message.characterId,
                  );
                  const user = message.role === 'user';
                  return (
                    <article
                      id={message.id}
                      key={message.id}
                      className={cn(
                        'flex max-w-[92%] gap-3',
                        user ? 'ml-auto flex-row-reverse' : 'mr-auto',
                      )}
                    >
                      <img
                        src={character ? characterAvatar(character) : '/avatars/user.png'}
                        alt=""
                        className="h-9 w-9 rounded-full bg-violet-100"
                      />
                      <div className="min-w-0">
                        <p
                          className={cn('mb-1 text-xs text-muted-foreground', user && 'text-right')}
                        >
                          {user
                            ? scenario.learnerRole
                            : character
                              ? characterLabel(character, t)
                              : t('teacherlab.simulation.roles.other')}
                          {scripted.has(message.id) && ` · ${t('training.scriptedBadge')}`}
                        </p>
                        <div
                          className={cn(
                            'whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7',
                            user
                              ? 'rounded-tr-sm bg-violet-600 text-white'
                              : 'rounded-tl-sm border border-border/60 bg-muted/35',
                          )}
                        >
                          {message.content}
                        </div>
                        {!user && (
                          <button
                            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"
                            onClick={() => void read(message)}
                          >
                            {speaking === message.id ? <Square size={12} /> : <Volume2 size={13} />}{' '}
                            {t(
                              speaking === message.id
                                ? 'teacherlab.simulation.stopAudio'
                                : 'teacherlab.simulation.readAudio',
                            )}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {replying && (
                  <div className="flex items-center gap-2 text-sm text-violet-600">
                    <Loader2 className="animate-spin" size={16} />
                    {t('training.replying')}
                  </div>
                )}
                <div ref={bottom} />
              </div>
              <div className="border-t border-border/60 bg-background p-4">
                {error && (
                  <div
                    role="alert"
                    className="mb-3 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    {error}
                    {replyPending && canTalk && (
                      <p className="mt-1 text-xs">{t('teacherlab.simulation.messageSaved')}</p>
                    )}
                  </div>
                )}
                {replyPending && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button disabled={busy} className={button} onClick={() => void retryReply()}>
                      <RefreshCw size={14} />
                      {t('teacherlab.simulation.retryReply')}
                    </button>
                    {mode === 'model' && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() => {
                          setMode('scripted');
                          setError('');
                        }}
                      >
                        {t('teacherlab.simulation.useScript')}
                      </button>
                    )}
                  </div>
                )}
                {canTalk ? (
                  <>
                    <textarea
                      rows={3}
                      maxLength={20000}
                      value={input}
                      onChange={(event) => updateInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      disabled={busy || replyPending}
                      placeholder={t('teacherlab.simulation.inputHint')}
                      className="w-full resize-none rounded-xl border border-border/70 bg-muted/15 p-3 text-sm outline-none focus:border-violet-400"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <SpeechButton
                          disabled={busy || replyPending}
                          size="md"
                          onTranscription={(text) => updateInput(input + (input ? ' ' : '') + text)}
                        />
                        {!asrAvailable && (
                          <button
                            onClick={() => void enableSpeech()}
                            disabled={speechBusy || busy}
                            className="text-xs text-muted-foreground underline"
                          >
                            {speechBusy
                              ? t('teacherlab.working')
                              : t('teacherlab.simulation.speechSetup')}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => void send()}
                        disabled={busy || replyPending || !input.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40"
                      >
                        {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}{' '}
                        {t('training.send')}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    {t('teacherlab.simulation.dialogueClosed')}{' '}
                    {evaluation && (
                      <Link href={`/eval/training/${id}`} className="text-violet-600 underline">
                        {t('training.reviewTitle')}
                      </Link>
                    )}
                  </p>
                )}
              </div>
            </section>
            <aside className="space-y-4 lg:col-span-2 xl:col-span-1">
              <section className="rounded-2xl border border-border/60 bg-background/85 p-4 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <ClipboardList size={16} />
                  {t('teacherlab.simulation.progress')}
                </h2>
                <ol className="space-y-3">
                  {TRAINING_STATES.map((state, index) => (
                    <li
                      key={state}
                      className={cn(
                        'flex items-center gap-3 text-xs',
                        index === phaseIndex
                          ? 'font-semibold text-violet-600'
                          : index < phaseIndex
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border',
                          index === phaseIndex
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                            : 'border-border',
                        )}
                      >
                        {index < phaseIndex ? <CheckCircle2 size={13} /> : index + 1}
                      </span>
                      {stateLabel(state)}
                    </li>
                  ))}
                </ol>
                {next && training.state !== 'evaluation' && (
                  <button
                    disabled={busy || replyPending}
                    onClick={() => void move(next)}
                    className={cn(
                      button,
                      'mt-5 w-full border-violet-200 text-violet-700 dark:text-violet-200',
                    )}
                  >
                    {stateLabel(next)}
                    <ArrowRight size={14} />
                  </button>
                )}
                {training.state === 'evaluation' && (
                  <button
                    disabled={busy}
                    onClick={() => (evaluation ? void move('completed') : void evaluate())}
                    className={cn(
                      button,
                      'mt-5 w-full border-violet-200 text-violet-700 dark:text-violet-200',
                    )}
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <ClipboardList size={14} />
                    )}{' '}
                    {evaluation ? t('teacherlab.simulation.finish') : t('training.evaluate')}
                  </button>
                )}
              </section>
              <section className="rounded-2xl border border-border/60 bg-background/85 p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck size={16} />
                  {t('training.disclosures')}
                </h2>
                {disclosures.length ? (
                  <ul className="space-y-2">
                    {disclosures.map((fact) => (
                      <li key={fact.id} className="rounded-lg bg-muted/40 p-3 text-xs leading-6">
                        {fact.content}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs leading-6 text-muted-foreground">
                    {t('teacherlab.simulation.noFacts')}
                  </p>
                )}
              </section>
              <details className="rounded-2xl border border-border/60 bg-background/85 p-4 text-xs">
                <summary className="cursor-pointer font-semibold">{t('training.rules')}</summary>
                <ul className="mt-3 list-disc space-y-2 pl-4 leading-6 text-muted-foreground">
                  {scenario.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </details>
              <Link href="/courseware/references" className={cn(button, 'w-full')}>
                <BookOpen size={15} />
                {t('training.referencesTitle')}
              </Link>
            </aside>
          </div>
          {evaluation && (
            <section className="mt-5 rounded-2xl border border-border/60 bg-background/85 p-5">
              <h2 className="mb-3 font-semibold">{t('training.evaluationTitle')}</h2>
              <p className="mb-4 text-sm leading-7">{evaluation.summary}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {evaluation.dimensions.map((dimension) => (
                  <article key={dimension.dimension} className="rounded-xl border p-4">
                    <h3 className="text-sm font-medium">
                      {t(
                        'training.dim' +
                          dimension.dimension
                            .split('-')
                            .map((part) => part[0].toUpperCase() + part.slice(1))
                            .join(''),
                      )}
                    </h3>
                    <p className="my-2 text-2xl font-semibold text-violet-600">{dimension.score}</p>
                    <p className="text-xs leading-6 text-muted-foreground">{dimension.comment}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {dimension.evidence.map((evidence, index) => (
                        <button
                          key={evidence}
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            document
                              .getElementById(evidence)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        >
                          {t('teacherlab.simulation.evidence')} {index + 1}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <Link href={`/eval/training/${id}`} className={cn(button, 'mt-4')}>
                {t('training.reviewTitle')}
                <ArrowRight size={14} />
              </Link>
            </section>
          )}
        </div>
      )}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSection={settingsSection}
      />
    </main>
  );
}
