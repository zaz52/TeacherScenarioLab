'use client';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  PARENT_PROFILES,
  PRACTICE_GRADES,
  SCENARIO_CASES,
  gradeLabel,
} from '@/lib/training/practice-config';
import type { EpidemicComposer } from './epidemic-composer';
export function PracticeOptions({ composer }: { composer: EpidemicComposer }) {
  const { t } = useI18n();
  const p = composer.practice;
  const band =
    Number(p.grade.slice(1)) <= 2
      ? 'g1'
      : Number(p.grade.slice(1)) <= 4
        ? 'g3'
        : Number(p.grade.slice(1)) <= 6
          ? 'g5'
          : Number(p.grade.slice(1)) <= 9
            ? 'g7'
            : 'g10';
  const change = (value: Partial<typeof p>) =>
    composer.setPractice((previous) => ({ ...previous, ...value }));
  const selectClass =
    'mt-1 w-full min-w-0 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-400';
  return (
    <details open className="mx-4 mb-3 rounded-2xl border border-violet-300/40 bg-violet-500/5 p-3">
      <summary className="cursor-pointer text-xs font-medium">
        {t('teacherlab.practice.title')}
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <label className="text-xs text-muted-foreground">
          {t('teacherlab.practice.focus')}
          <select
            className={selectClass}
            value={p.focus}
            disabled={composer.busy}
            onChange={(e) => change({ focus: e.target.value as typeof p.focus })}
          >
            <option
              value="family"
              disabled={!composer.scenario?.characters.some((c) => c.role === 'parent')}
            >
              {t('teacherlab.practice.family')}
            </option>
            <option value="campus">{t('teacherlab.practice.campus')}</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {t('teacherlab.practice.grade')}
          <select
            className={selectClass}
            value={p.grade}
            disabled={composer.busy || composer.scenario?.scenarioId !== 'epi-class-fever'}
            onChange={(e) => change({ grade: e.target.value as typeof p.grade, caseId: null })}
          >
            {PRACTICE_GRADES.filter((g) =>
              composer.scenario?.scenarioId === 'epi-class-fever'
                ? g !== 'scenario'
                : g === 'scenario',
            ).map((g) => (
              <option value={g} key={g}>
                {gradeLabel(g)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {t('teacherlab.practice.channel')}
          <select
            className={selectClass}
            value={p.channel}
            disabled={composer.busy}
            onChange={(e) => change({ channel: e.target.value as typeof p.channel })}
          >
            {(['private', 'phone', 'group'] as const).map((channel) => (
              <option key={channel} value={channel}>
                {t('teacherlab.practice.' + channel)}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-xs text-muted-foreground md:col-span-2">
          {t('teacherlab.practice.parentType')}
          <select
            className={selectClass}
            value={p.parentProfileId}
            disabled={composer.busy}
            onChange={(e) => change({ parentProfileId: e.target.value })}
          >
            {PARENT_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-xs text-muted-foreground md:col-span-1">
          {t('teacherlab.practice.case')}
          <select
            className={selectClass}
            value={p.caseId ?? ''}
            disabled={composer.busy}
            onChange={(e) => change({ caseId: e.target.value || null })}
          >
            <option value="">{t('teacherlab.practice.baseCase')}</option>
            {SCENARIO_CASES.filter((c) => c.grade === band).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.split('｜')[0]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
        {PARENT_PROFILES.find((profile) => profile.id === p.parentProfileId)?.signals}
      </p>
      <p className="text-[11px] leading-6 text-muted-foreground">{t('teacherlab.practice.note')}</p>
    </details>
  );
}
