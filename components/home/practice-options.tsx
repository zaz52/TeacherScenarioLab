'use client';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  PARENT_PROFILES,
  PRACTICE_GRADES,
  SCENARIO_CASES,
  gradeLabel,
  type PracticeCustomField,
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
  function preset(field: PracticeCustomField, value: Partial<typeof p>) {
    const custom = { ...p.custom };
    delete custom[field];
    change({ ...value, custom: Object.keys(custom).length ? custom : undefined });
  }
  function chooseCustom(field: PracticeCustomField) {
    change({
      custom: { ...p.custom, [field]: '' },
      ...(field === 'focus' ? { focus: 'campus' as const } : {}),
      ...(field === 'case' ? { caseId: null } : {}),
    });
  }
  function customInput(field: PracticeCustomField) {
    if (p.custom?.[field] === undefined) return null;
    return (
      <textarea
        rows={field === 'parent' || field === 'case' ? 3 : 2}
        maxLength={600}
        value={p.custom[field]}
        disabled={composer.busy}
        className={selectClass}
        aria-label={t('teacherlab.practice.customLabel')}
        placeholder={t('teacherlab.practice.customPlaceholders.' + field)}
        onChange={(e) => change({ custom: { ...p.custom, [field]: e.target.value } })}
      />
    );
  }
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
            value={p.custom?.focus !== undefined ? '__custom__' : p.focus}
            disabled={composer.busy}
            onChange={(e) =>
              e.target.value === '__custom__'
                ? chooseCustom('focus')
                : preset('focus', { focus: e.target.value as typeof p.focus })
            }
          >
            <option
              value="family"
              disabled={!composer.scenario?.characters.some((c) => c.role === 'parent')}
            >
              {t('teacherlab.practice.family')}
            </option>
            <option value="campus">{t('teacherlab.practice.campus')}</option>
            <option value="__custom__">{t('teacherlab.practice.customLabel')}</option>
          </select>
          {customInput('focus')}
        </label>
        <label className="text-xs text-muted-foreground">
          {t('teacherlab.practice.grade')}
          <select
            className={selectClass}
            value={p.custom?.grade !== undefined ? '__custom__' : p.grade}
            disabled={composer.busy}
            onChange={(e) =>
              e.target.value === '__custom__'
                ? chooseCustom('grade')
                : preset('grade', { grade: e.target.value as typeof p.grade, caseId: null })
            }
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
            <option value="__custom__">{t('teacherlab.practice.customLabel')}</option>
          </select>
          {customInput('grade')}
        </label>
        <label className="text-xs text-muted-foreground">
          {t('teacherlab.practice.channel')}
          <select
            className={selectClass}
            value={p.custom?.channel !== undefined ? '__custom__' : p.channel}
            disabled={composer.busy}
            onChange={(e) =>
              e.target.value === '__custom__'
                ? chooseCustom('channel')
                : preset('channel', { channel: e.target.value as typeof p.channel })
            }
          >
            {(['private', 'phone', 'group'] as const).map((channel) => (
              <option key={channel} value={channel}>
                {t('teacherlab.practice.' + channel)}
              </option>
            ))}
            <option value="__custom__">{t('teacherlab.practice.customLabel')}</option>
          </select>
          {customInput('channel')}
          {p.custom?.channel !== undefined && (
            <span className="mt-2 block">
              {t('teacherlab.practice.baseChannel')}
              <select
                className={selectClass}
                value={p.channel}
                disabled={composer.busy}
                onChange={(e) => change({ channel: e.target.value as typeof p.channel })}
              >
                {(['private', 'phone', 'group'] as const).map((channel) => (
                  <option value={channel} key={channel}>
                    {t('teacherlab.practice.' + channel)}
                  </option>
                ))}
              </select>
            </span>
          )}
        </label>
        <label className="col-span-2 text-xs text-muted-foreground md:col-span-2">
          {t('teacherlab.practice.parentType')}
          <select
            className={selectClass}
            value={p.custom?.parent !== undefined ? '__custom__' : p.parentProfileId}
            disabled={composer.busy}
            onChange={(e) =>
              e.target.value === '__custom__'
                ? chooseCustom('parent')
                : preset('parent', { parentProfileId: e.target.value })
            }
          >
            {PARENT_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
            <option value="__custom__">{t('teacherlab.practice.customLabel')}</option>
          </select>
          {customInput('parent')}
        </label>
        <label className="col-span-2 text-xs text-muted-foreground md:col-span-1">
          {t('teacherlab.practice.case')}
          <select
            className={selectClass}
            value={p.custom?.case !== undefined ? '__custom__' : (p.caseId ?? '')}
            disabled={composer.busy}
            onChange={(e) =>
              e.target.value === '__custom__'
                ? chooseCustom('case')
                : preset('case', { caseId: e.target.value || null })
            }
          >
            <option value="">{t('teacherlab.practice.baseCase')}</option>
            {SCENARIO_CASES.filter((c) => c.grade === band).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.split('｜')[0]}
              </option>
            ))}
            <option value="__custom__">{t('teacherlab.practice.customLabel')}</option>
          </select>
          {customInput('case')}
        </label>
      </div>
      <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
        {p.custom?.parent ??
          PARENT_PROFILES.find((profile) => profile.id === p.parentProfileId)?.signals}
      </p>
      <p className="text-[11px] leading-6 text-muted-foreground">{t('teacherlab.practice.note')}</p>
      <p className="text-[11px] leading-6 text-muted-foreground">
        {t('teacherlab.practice.customHint')}
      </p>
    </details>
  );
}
