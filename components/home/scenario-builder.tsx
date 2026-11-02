'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Loader2, School, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { ComposerScenario } from './epidemic-composer';

export function ScenarioBuilder({
  open,
  onOpenChange,
  onPublished,
  initialDescription,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onPublished: (scene: ComposerScenario) => void;
  initialDescription: string;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(initialDescription),
    [student, setStudent] = useState('小林'),
    [parent, setParent] = useState('小林家长'),
    [teacher, setTeacher] = useState('陈老师');
  const [draft, setDraft] = useState<ComposerScenario | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const field = 'mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm';
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const scenario = {
        scenarioId: 'epi-' + crypto.randomUUID(),
        version: 1,
        title: title.trim(),
        setting: description.trim(),
        goal: t('teacherlab.simulation.templateGoal'),
        learnerRole: t('teacherlab.simulation.templateLearner'),
        rules: [
          t('teacherlab.simulation.ruleFacts'),
          t('teacherlab.simulation.rulePrivacy'),
          t('teacherlab.simulation.ruleProcedure'),
        ],
        characters: [
          { id: 'student-1', name: student.trim(), role: 'student' },
          { id: 'parent-1', name: parent.trim(), role: 'parent' },
          { id: 'teacher-1', name: teacher.trim(), role: 'teacher' },
          { id: 'doctor-1', name: t('teacherlab.simulation.roles.doctor'), role: 'other' },
          {
            id: 'principal-1',
            name: t('teacherlab.simulation.roles.principal'),
            role: 'principal',
          },
        ],
        facts: [
          {
            id: 'fact-public-setting',
            content: description.trim(),
            category: 'timeline',
            visibility: 'public',
          },
        ],
        disclosureConditions: {},
        publishedAt: null,
      };
      const response = await fetch('/api/training/admin/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw Error();
      setDraft(data.scenario);
    } catch {
      setError(t('teacherlab.simulation.draftError'));
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/training/admin/scenarios/${encodeURIComponent(draft.scenarioId)}/versions/${draft.version}/publish`,
        { method: 'POST' },
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw Error();
      onPublished(data.scenario);
      onOpenChange(false);
    } catch {
      setError(t('teacherlab.simulation.publishError'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <School size={21} />
          {t('teacherlab.simulation.buildScene')}
        </DialogTitle>
        <DialogDescription>{t('teacherlab.simulation.builderHint')}</DialogDescription>
        {draft ? (
          <section className="space-y-4">
            <p className="flex items-center gap-2 text-sm text-violet-600">
              <CheckCircle2 size={16} />
              {t('teacherlab.simulation.draftSaved')}
            </p>
            <h2 className="font-semibold">{draft.title}</h2>
            <p className="whitespace-pre-wrap rounded-xl bg-muted/30 p-4 text-sm leading-7">
              {description}
            </p>
            <p className="text-sm">
              {t('teacherlab.simulation.roles.student')} · {student} /{' '}
              {t('teacherlab.simulation.roles.parent')} · {parent} /{' '}
              {t('teacherlab.simulation.roles.teacher')} · {teacher}
            </p>
            <p className="text-xs leading-6 text-muted-foreground">
              {t('teacherlab.simulation.reviewPublish')}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy}
                onClick={() => void publish()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  t('teacherlab.simulation.publishScene')
                )}
              </button>
              <Link
                href={`/settings/training/scenarios/${draft.scenarioId}/versions/${draft.version}/edit`}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                {t('teacherlab.simulation.advancedScene')}
              </Link>
            </div>
          </section>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm">
              {t('teacherlab.simulation.sceneTitle')}
              <input
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={field}
              />
            </label>
            <label className="block text-sm">
              {t('teacherlab.simulation.publicDescription')}
              <textarea
                required
                rows={5}
                minLength={20}
                maxLength={12000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={field}
                placeholder={t('teacherlab.simulation.scenePlaceholder')}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'studentName', value: student, set: setStudent },
                { label: 'parentName', value: parent, set: setParent },
                { label: 'teacherName', value: teacher, set: setTeacher },
              ].map((item) => (
                <label key={item.label} className="text-sm">
                  {t('teacherlab.simulation.' + item.label)}
                  <input
                    required
                    maxLength={80}
                    value={item.value}
                    onChange={(event) => item.set(event.target.value)}
                    className={field}
                  />
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm text-white"
            >
              {busy && <Loader2 className="animate-spin" size={16} />}{' '}
              {t('teacherlab.simulation.saveScene')}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
