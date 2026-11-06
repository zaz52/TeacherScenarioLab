'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, AlertTriangle, ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAccount } from '@/components/account/account-provider';
import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';
import {
  EMERGENCY_ACTIONS,
  type EmergencyAction,
  type EmergencyBoardData,
  type EmergencyMessage,
} from '@/lib/training/emergency-plan';

const fields = ['confirmed', 'unknown', 'action', 'contact', 'followUp'] as const;
const control =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15';

export function EmergencyIntro() {
  const { t } = useI18n();
  const text = (key: string) => t('teacherlab.emergency.' + key);
  return (
    <section
      data-training-guide="emergency-intro"
      className="mb-4 w-full rounded-2xl border border-border/60 bg-background/85 px-5 py-4 text-left"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle size={17} className="text-amber-600" />
          {text('homeTitle')}
        </h2>
        <span className="text-xs text-muted-foreground">{text('homeScope')}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text('homeIntro')}</p>
      <ol className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        {EMERGENCY_ACTIONS.map((id, index) => (
          <li key={id} className="flex items-center gap-1.5">
            <span className="text-violet-600">{index + 1}.</span>
            {text('tasks.' + id + '.short')}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EmergencyBoard(props: {
  trainingId: string;
  refreshKey?: string;
  messages: EmergencyMessage[];
  review?: boolean;
  onDecisionSaved?: () => void;
}) {
  const { account } = useAccount();
  return (
    <EmergencyBoardView
      key={(account?.ownerId ?? '') + ':' + props.trainingId}
      {...props}
      enabled={Boolean(account?.authenticated)}
    />
  );
}
function EmergencyBoardView({
  trainingId,
  refreshKey,
  messages,
  review = false,
  enabled,
  onDecisionSaved,
}: {
  trainingId: string;
  refreshKey?: string;
  messages: EmergencyMessage[];
  review?: boolean;
  enabled: boolean;
  onDecisionSaved?: () => void;
}) {
  const { t, locale } = useI18n();
  const text = (key: string) => t('teacherlab.emergency.' + key);
  const [board, setBoard] = useState<EmergencyBoardData | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [selected, setSelected] = useState<EmergencyAction>('safety');
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({
    choiceId: '',
    confirmed: '',
    unknown: '',
    action: '',
    contact: '',
    followUp: '',
    evidenceMessageIds: [] as string[],
  });
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`/api/training-practice/${trainingId}/emergency`, {
        cache: 'no-store',
        signal,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw Error();
      if (mounted.current && !signal?.aborted) {
        setBoard(data.board);
        setError('');
      }
    },
    [trainingId],
  );
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal)
      .catch(() => {
        if (!controller.signal.aborted) setError('loadError');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, load, refreshKey]);
  const task = board?.tasks.find((item) => item.id === selected);
  const teacherMessages = messages.filter((m) => m.role === 'user').slice(-20);
  function edit() {
    const r = task?.record;
    setDraft({
      choiceId: r?.choiceId ?? '',
      confirmed: r?.confirmed ?? '',
      unknown: r?.unknown ?? '',
      action: r?.action ?? '',
      contact: r?.contact ?? '',
      followUp: r?.followUp ?? '',
      evidenceMessageIds:
        r?.evidenceMessageIds.filter((id) => teacherMessages.some((m) => m.id === id)) ?? [],
    });
    setNotice('');
    setOpen(true);
  }
  async function save() {
    if (!task || saving || board?.readOnly) return;
    const body = { actionId: task.id, ...draft },
      signature = JSON.stringify(body);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: crypto.randomUUID() };
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch(`/api/training-practice/${trainingId}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, requestId: pending.current.id }),
      });
      if (!response.ok) {
        setNotice(response.status === 409 ? 'conflict' : 'saveError');
        return;
      }
      if (!mounted.current) return;
      setOpen(false);
      setNotice('saved');
      pending.current = null;
      onDecisionSaved?.();
      await load().catch(() => setError('loadError'));
    } catch {
      if (mounted.current) setNotice('saveError');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  if (!enabled) return null;
  return (
    <section
      data-training-guide="emergency"
      className="mb-5 min-w-0 rounded-2xl border border-border/70 bg-background p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList size={18} />
            {text(review ? 'reviewTitle' : 'title')}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {text(board?.profile === 'preparedness' ? 'preparedness' : 'intro')}
          </p>
        </div>
        {board && (
          <span className="text-sm tabular-nums">
            {text('submitted')} {board.submitted}/6
          </span>
        )}
      </header>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{text('simulationScope')}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-700">
          {text(error)}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void load().catch(() => setError('loadError'));
            }}
          >
            {text('reload')}
          </button>
        </p>
      )}
      {loading && !board && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          <Loader2 size={15} className="animate-spin" />
          {text('loading')}
        </p>
      )}
      {board && (
        <>
          {!review && (
            <>
              <div
                className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6"
                role="group"
                aria-label={text('tasksLabel')}
              >
                {board.tasks.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    aria-pressed={selected === item.id}
                    className={cn(
                      'rounded-xl border px-2 py-2.5 text-left text-xs transition focus-visible:ring-2 focus-visible:ring-violet-500',
                      selected === item.id
                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {item.record ? <CheckCircle2 size={13} /> : <span>{index + 1}.</span>}
                      {text('tasks.' + item.id + '.short')}
                    </span>
                    <span
                      className={cn(
                        'mt-1 block text-[11px]',
                        item.needsReview
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-muted-foreground',
                      )}
                    >
                      {text(
                        item.record
                          ? item.needsReview
                            ? 'needsReview'
                            : 'recorded'
                          : item.available
                            ? 'toDo'
                            : 'later',
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {task && (
                <div className="mt-4 flex flex-col justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{text('tasks.' + task.id + '.title')}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {text('tasks.' + task.id + '.prompt')}
                    </p>
                    {!task.available && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {text('unlock').replace('{rounds}', String(task.afterRounds))}
                      </p>
                    )}
                    {task.record && (
                      <p
                        className={cn(
                          'mt-2 text-xs leading-6',
                          task.needsReview
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-muted-foreground',
                        )}
                      >
                        {text('feedback.' + task.record.choiceId)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={edit}
                    disabled={!task.available || board.readOnly || Boolean(error)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm text-white hover:bg-violet-700 disabled:opacity-40"
                  >
                    {text(task.record ? 'edit' : 'act')}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
              {board.state === 'proposal' && board.missing.length > 0 && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  {text('advanceWarning')}
                </p>
              )}
              {board.readOnly && (
                <p className="mt-3 text-xs text-muted-foreground">{text('readOnly')}</p>
              )}
              {notice === 'saved' && (
                <p role="status" className="mt-3 text-xs text-violet-600">
                  {text('saved')}
                </p>
              )}
            </>
          )}
          {review && (
            <div className="mt-4 space-y-3">
              {!board.records.length && (
                <p className="text-sm text-muted-foreground">{text('noRecords')}</p>
              )}
              <p className="text-sm">
                {text('gaps')}{' '}
                {board.missing.map((id) => text('tasks.' + id + '.short')).join('、') ||
                  text('none')}
              </p>
              {board.records.length > 0 && (
                <details className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {text('sequence')}
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">{text('sequenceScope')}</p>
                  <ol className="mt-3 space-y-2 text-sm">
                    {board.records.map((r, index) => (
                      <li key={r.eventId}>
                        {index + 1}. {text('tasks.' + r.actionId + '.short')} ·{' '}
                        {new Date(r.recordedAt).toLocaleString(locale)}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {board.tasks.map((item) => (
                <details key={item.id} className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {text('tasks.' + item.id + '.short')} ·{' '}
                    {text(
                      item.record ? (item.needsReview ? 'needsReview' : 'recorded') : 'missing',
                    )}
                  </summary>
                  {item.record && (
                    <div className="mt-3 space-y-3 text-sm leading-6">
                      <p className="text-muted-foreground">
                        {new Date(item.record.recordedAt).toLocaleString(locale)} ·{' '}
                        {text('choices.' + item.record.choiceId)}
                      </p>
                      <p className="rounded-lg bg-muted/40 p-3">
                        {text('feedback.' + item.record.choiceId)}
                      </p>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        {fields.map((key) => (
                          <div key={key}>
                            <dt className="font-medium">{text('fields.' + key)}</dt>
                            <dd className="whitespace-pre-wrap break-words text-muted-foreground">
                              {item.record![key]}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        {item.record.evidenceMessageIds.map((id) => (
                          <a
                            key={id}
                            href={'#msg-' + id}
                            className="text-xs text-violet-600 underline"
                          >
                            {messages.find((m) => m.id === id)?.content.slice(0, 60) ??
                              text('evidenceChanged')}
                          </a>
                        ))}
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer">{text('revisions')}</summary>
                        <ol className="mt-2 space-y-2">
                          {board.records
                            .filter((r) => r.actionId === item.id)
                            .map((r) => (
                              <li key={r.eventId} className="whitespace-pre-wrap border-l-2 pl-3">
                                <p>
                                  {new Date(r.recordedAt).toLocaleString(locale)} ·{' '}
                                  {text('choices.' + r.choiceId)}
                                </p>
                                <p>{r.action}</p>
                              </li>
                            ))}
                        </ol>
                      </details>
                    </div>
                  )}
                </details>
              ))}
              <p className="text-xs leading-6 text-muted-foreground">{text('feedbackScope')}</p>
            </div>
          )}
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle>{text('tasks.' + selected + '.title')}</DialogTitle>
          <DialogDescription>{text('formIntro')}</DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={saving} className="space-y-4">
              <label className="block text-sm font-medium">
                {text('choose')}
                <select
                  required
                  value={draft.choiceId}
                  onChange={(e) => setDraft({ ...draft, choiceId: e.target.value })}
                  className={cn(control, 'mt-2')}
                >
                  <option value="">{text('choosePlaceholder')}</option>
                  {task?.choices.map((id) => (
                    <option key={id} value={id}>
                      {text('choices.' + id)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((key) => (
                  <label
                    key={key}
                    className={cn('block text-sm font-medium', key === 'action' && 'sm:col-span-2')}
                  >
                    {text('fields.' + key)}
                    <textarea
                      required
                      minLength={key === 'action' ? 10 : 2}
                      maxLength={key === 'contact' ? 200 : key === 'followUp' ? 400 : 800}
                      rows={key === 'action' ? 3 : 2}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      placeholder={text('placeholders.' + key)}
                      className={cn(control, 'mt-2 resize-y font-normal')}
                    />
                  </label>
                ))}
              </div>
              {teacherMessages.length > 0 && (
                <details className="rounded-xl border p-3 text-xs">
                  <summary className="cursor-pointer font-medium">{text('evidence')}</summary>
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                    {teacherMessages.map((m) => (
                      <label key={m.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={draft.evidenceMessageIds.includes(m.id)}
                          disabled={
                            !draft.evidenceMessageIds.includes(m.id) &&
                            draft.evidenceMessageIds.length >= 3
                          }
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              evidenceMessageIds: e.target.checked
                                ? [...draft.evidenceMessageIds, m.id]
                                : draft.evidenceMessageIds.filter((id) => id !== m.id),
                            })
                          }
                        />
                        {m.content.slice(0, 200)}
                      </label>
                    ))}
                  </div>
                </details>
              )}
              {notice && notice !== 'saved' && (
                <p role="alert" className="text-sm text-amber-700">
                  {text(notice)}
                </p>
              )}
              <button
                disabled={saving}
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm text-white disabled:opacity-40"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {text(saving ? 'saving' : 'save')}
              </button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
