'use client';

/**
 * TeacherScenarioLab — single-role simulation room.
 *
 * Client-only page: all data comes from the training API (owner resolved
 * from the browser's cookies). Flow: load training → start (created →
 * briefing) → send a message → request one character reply. The reply mode
 * defaults to scripted (works without model keys); switch to model mode
 * when a roleplay model is configured. An unsent draft is backed up to
 * localStorage so leaving the room (including via the training nav) does
 * not silently drop what the teacher typed.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';
import { trainingStateLabel } from '@/lib/training/state-label';
import { MESSAGEABLE_STATES } from '@/lib/training/state-machine';

interface Training {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  state: string;
}

interface ScenarioCharacter {
  id: string;
  name: string;
  role: string;
}

interface ScenarioInfo {
  title: string;
  setting: string;
  goal: string;
  rules: string[];
  characters: ScenarioCharacter[];
}

interface ChatMessage {
  id: string;
  role: string;
  characterId: string | null;
  content: string;
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function TrainingRoomPage() {
  const params = useParams<{ id: string }>();
  const trainingId = params.id;
  const [training, setTraining] = useState<Training | null>(null);
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [characterId, setCharacterId] = useState('');
  const [mode, setMode] = useState<'scripted' | 'model'>('scripted');
  const [input, setInput] = useState('');
  // Unsent draft backup (see header comment). Sent messages are already
  // server-persisted; only the draft needs this client-side copy.
  const draftKey = `tsl-room-draft-${trainingId}`;
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) setInput(saved);
    } catch {
      // Private mode or blocked storage: draft backup is best-effort.
    }
  }, [draftKey]);
  useEffect(() => {
    if (!input.trim()) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [input]);
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState('');
  const [scriptedIds, setScriptedIds] = useState<Set<string>>(new Set());
  const [directorNote, setDirectorNote] = useState('');
  const [disclosures, setDisclosures] = useState<Array<{ id: string; content: string }>>([]);
  const [evaluation, setEvaluation] = useState<{
    dimensions: Array<{
      dimension: string;
      score: number;
      evidence: string[];
      comment: string;
    }>;
    summary: string;
    suggestions: string[];
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/training/trainings/${trainingId}/messages`);
    const data = await res.json();
    if (data.success) setMessages(data.messages);
  }, [trainingId]);

  const loadDisclosures = useCallback(async () => {
    const res = await fetch(`/api/training/trainings/${trainingId}/disclosures`);
    const data = await res.json();
    if (data.success) setDisclosures(data.facts);
  }, [trainingId]);

  const loadEvaluation = useCallback(async () => {
    const res = await fetch(`/api/training/trainings/${trainingId}/evaluation`);
    const data = await res.json();
    if (data.success) setEvaluation(data.evaluation);
  }, [trainingId]);

  const handleEvaluate = async () => {
    if (evaluating) return;
    setEvaluating(true);
    setError('');
    try {
      const res = await fetch(`/api/training/trainings/${trainingId}/evaluate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEvaluation(data.evaluation);
    } catch {
      setError(t('evaluateFailed'));
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/training/trainings/${trainingId}`);
      const data = await res.json();
      if (!data.success) {
        setError(t('loadFailed'));
        return;
      }
      setTraining(data.training);
      const scenarioRes = await fetch(
        `/api/training/scenarios/${data.training.scenarioId}/versions/${data.training.scenarioVersion}`,
      );
      const scenarioData = await scenarioRes.json();
      if (scenarioData.success) {
        setScenario(scenarioData.scenario);
      }
      await loadMessages();
      await loadDisclosures();
      await loadEvaluation();
    })().catch(() => setError(t('loadFailed')));
  }, [trainingId, loadMessages, loadDisclosures, loadEvaluation]);

  const handleStart = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/training/trainings/${trainingId}/start`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTraining(data.training);
    } catch {
      setError(t('startFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || busy || replying) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/training/trainings/${trainingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setInput('');
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // Best-effort only.
      }
      await loadMessages();
      setReplying(true);
      try {
        const replyRes = await fetch(`/api/training/trainings/${trainingId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(characterId ? { characterId } : {}),
            mode,
          }),
        });
        const replyData = await replyRes.json();
        if (!replyData.success) throw new Error(replyData.error);
        if (replyData.mode === 'scripted') {
          setScriptedIds((prev) => new Set(prev).add(replyData.message.id));
        }
        if (replyData.director) {
          const picked = scenario?.characters.find((c) => c.id === replyData.director.characterId);
          setDirectorNote(
            `${t('directorPicked')}: ${picked?.name ?? replyData.director.characterId} — ${replyData.director.reason}`,
          );
        } else {
          setDirectorNote('');
        }
        await loadMessages();
        await loadDisclosures();
      } catch {
        setError(t('replyFailed'));
      } finally {
        setReplying(false);
      }
    } catch {
      setError(t('sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (!training) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>{error || t('loading')}</p>
      </main>
    );
  }

  const characterName = (id: string | null): string => {
    if (!id) return '';
    return scenario?.characters.find((c) => c.id === id)?.name ?? id;
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{scenario?.title ?? t('title')}</h1>
      <p className="text-sm text-gray-600">
        {t('state')}: {trainingStateLabel(training.state, t)}
      </p>
      {scenario && (
        <section className="rounded border p-4">
          <h2 className="font-medium">{t('briefing')}</h2>
          <p className="mt-2 text-sm">{scenario.setting}</p>
          <h3 className="mt-3 font-medium">{t('goal')}</h3>
          <p className="mt-1 text-sm">{scenario.goal}</p>
          <h3 className="mt-3 font-medium">{t('rules')}</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {scenario.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      )}
      {training.state === 'created' && (
        <button
          type="button"
          onClick={handleStart}
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {t('start')}
        </button>
      )}
      <section className="flex flex-col gap-2">
        {messages.length === 0 && <p className="text-sm text-gray-500">{t('emptyMessages')}</p>}
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'self-end text-right' : 'self-start'}
          >
            {message.role !== 'user' && (
              <p className="text-xs text-gray-500">
                {characterName(message.characterId)}
                {scriptedIds.has(message.id) ? ` · ${t('scriptedBadge')}` : ''}
              </p>
            )}
            <p className="whitespace-pre-wrap rounded border px-3 py-2 text-sm">
              {message.content}
            </p>
          </div>
        ))}
        {replying && <p className="text-sm text-gray-500">{t('replying')}</p>}
        {directorNote && <p className="text-xs text-gray-500">{directorNote}</p>}
      </section>
      {disclosures.length > 0 && (
        <section className="rounded border p-4">
          <h2 className="font-medium">{t('disclosures')}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {disclosures.map((fact) => (
              <li key={fact.id}>{fact.content}</li>
            ))}
          </ul>
        </section>
      )}
      {training.state === 'evaluation' && (
        <section className="rounded border p-4">
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {evaluating ? t('evaluating') : t('evaluate')}
          </button>
        </section>
      )}
      {evaluation && (
        <section className="rounded border p-4">
          <h2 className="font-medium">{t('evaluationTitle')}</h2>
          <p className="mt-2 text-sm">{evaluation.summary}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {evaluation.dimensions.map((dimension) => (
              <li key={dimension.dimension} className="text-sm">
                <span className="font-medium">
                  {t(
                    `dim${dimension.dimension
                      .split('-')
                      .map((part) => part[0].toUpperCase() + part.slice(1))
                      .join('')}`,
                  )}
                  ：{dimension.score}
                </span>
                <span> — {dimension.comment}</span>
                {dimension.evidence.length > 0 && (
                  <span className="block text-xs text-gray-500">
                    {dimension.evidence
                      .map((id) => messages.find((m) => m.id === id)?.content.slice(0, 40) ?? id)
                      .join('；')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {evaluation.suggestions.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {evaluation.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm">
            <Link href={`/training/${trainingId}/review`}>{t('reviewTitle')}</Link>
          </p>
        </section>
      )}
      {(MESSAGEABLE_STATES as readonly string[]).includes(training.state) && (
        <section className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col text-sm">
              {t('selectCharacter')}
              <select
                value={characterId}
                onChange={(event) => setCharacterId(event.target.value)}
                className="rounded border px-2 py-2"
              >
                <option value="">{t('directorChoice')}</option>
                {(scenario?.characters ?? []).map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              {t('mode')}
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as 'scripted' | 'model')}
                className="rounded border px-2 py-2"
              >
                <option value="scripted">{t('modeScripted')}</option>
                <option value="model">{t('modeModel')}</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                try {
                  window.localStorage.setItem(draftKey, event.target.value);
                } catch {
                  // Best-effort only.
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSend();
              }}
              placeholder={t('inputPlaceholder')}
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={busy || replying || !input.trim()}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? t('sending') : t('send')}
            </button>
          </div>
        </section>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
