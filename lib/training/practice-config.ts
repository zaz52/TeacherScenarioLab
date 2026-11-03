import profiles from './knowledge/parent-profiles.json';
import cases from './knowledge/scenario-cases.json';
import type { ParentProfile, ScenarioCase } from './knowledge/types';
export const PARENT_PROFILES: ParentProfile[] = profiles;
export const SCENARIO_CASES: ScenarioCase[] = cases;
export const PRACTICE_CHANNELS = ['private', 'phone', 'group'] as const;
export const PRACTICE_FOCUSES = ['family', 'campus'] as const;
export const PRACTICE_GRADES = [
  'g1',
  'g2',
  'g3',
  'g4',
  'g5',
  'g6',
  'g7',
  'g8',
  'g9',
  'g10',
  'g11',
  'g12',
  'scenario',
] as const;
export type PracticeGrade = (typeof PRACTICE_GRADES)[number];
export interface PracticeConfig {
  parentProfileId: string;
  grade: PracticeGrade;
  channel: (typeof PRACTICE_CHANNELS)[number];
  focus: (typeof PRACTICE_FOCUSES)[number];
  caseId: string | null;
}
export const DEFAULT_PRACTICE: PracticeConfig = {
  parentProfileId: 'health-confirm',
  grade: 'g3',
  channel: 'private',
  focus: 'family',
  caseId: null,
};
export function gradeLabel(grade: PracticeGrade) {
  if (grade === 'scenario') return '按原情境年级';
  const n = Number(grade.slice(1));
  return n <= 6
    ? '小学' + ['一', '二', '三', '四', '五', '六'][n - 1] + '年级'
    : n <= 9
      ? '初中' + ['一', '二', '三'][n - 7] + '年级'
      : '高中' + ['一', '二', '三'][n - 10] + '年级';
}
export function parsePractice(value: unknown): PracticeConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    !PARENT_PROFILES.some((p) => p.id === v.parentProfileId) ||
    !(PRACTICE_GRADES as readonly unknown[]).includes(v.grade) ||
    !(PRACTICE_CHANNELS as readonly unknown[]).includes(v.channel) ||
    !(PRACTICE_FOCUSES as readonly unknown[]).includes(v.focus) ||
    (v.caseId !== null && !SCENARIO_CASES.some((c) => c.id === v.caseId)) ||
    Object.keys(v).some(
      (key) => !['parentProfileId', 'grade', 'channel', 'focus', 'caseId'].includes(key),
    )
  )
    return null;
  return v as unknown as PracticeConfig;
}
export function practiceFromEvents(
  events: Array<{ type: string; payload: unknown }>,
): PracticeConfig | null {
  const configured = events.find((event) => event.type === 'practice-configured');
  return configured ? parsePractice(configured.payload) : null;
}
export function practiceText(text: string, practice: PracticeConfig | null, scenarioId: string) {
  if (!practice || practice.grade === 'scenario' || scenarioId !== 'epi-class-fever') return text;
  return text.replace(/(?:某)?小学三年级|三年级/g, gradeLabel(practice.grade));
}
export function practiceSummary(practice: PracticeConfig) {
  const parent = PARENT_PROFILES.find((item) => item.id === practice.parentProfileId)!;
  const selected = SCENARIO_CASES.find((item) => item.id === practice.caseId);
  const channel = { private: '一对一文字沟通', phone: '电话沟通练习', group: '家长群公开沟通' }[
    practice.channel
  ];
  return (
    gradeLabel(practice.grade) +
    '；' +
    channel +
    '；' +
    parent.label +
    (selected ? '；本次练习重点：' + selected.task : '') +
    '。'
  );
}
