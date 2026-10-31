/**
 * TeacherScenarioLab — deterministic multi-role director (server only).
 *
 * Picks which character answers the teacher's latest message. Deterministic
 * on purpose: no model is needed, so the multi-role flow is verifiable
 * without keys, and the pick is always explainable (the `reason` string is
 * surfaced in the room UI). Precedence:
 *
 * 1. Explicit mention: the message names a character (乐乐妈妈/小雨/王老师/
 *    校医/校长) — that character answers.
 * 2. Topic keywords, in fixed order: 停课决策 → 家长病情 → 校医登记与
 *    疫情报告 → 隔壁班 → 学生感受.
 * 3. Rotation: the eligible character who spoke least recently (never-spoken
 *    first); ties break by scenario character order.
 *
 * Only characters with a roleplay pack are eligible. A model-based director
 * can later replace step 2–3 behind this same `selectResponder` shape; the
 * Pi director loop was deliberately NOT reused (its agents are classroom
 * tools with model calls and turn caps, and training roles are not Pi
 * agents — coupling would make task 4 unverifiable without keys).
 */
import type { TrainingMessageRecord } from '@openmaic/storage/training/pg';

import type { ScenarioVersion } from './scenario';

export interface DirectorPick {
  characterId: string;
  reason: string;
}

const NAME_MENTIONS: Array<{ names: string[]; characterId: string }> = [
  { names: ['乐乐妈妈'], characterId: 'parent-1' },
  { names: ['小雨'], characterId: 'student-1' },
  { names: ['王老师'], characterId: 'teacher-1' },
  { names: ['校医'], characterId: 'doctor-1' },
  { names: ['校长'], characterId: 'principal-1' },
];

const TOPIC_RULES: Array<{
  keywords: string[];
  characterId: string;
  reason: string;
}> = [
  {
    keywords: ['停课', '复课', '上级', '决定', '学校安排', '通知'],
    characterId: 'principal-1',
    reason: '话题：停课决策与学校安排',
  },
  {
    keywords: ['乐乐', '发烧', '体温', '医院', '病情', '药', '孩子'],
    characterId: 'parent-1',
    reason: '话题：孩子病情',
  },
  {
    keywords: ['登记', '晨检', '消毒', '通风', '测温', '上报', '报告'],
    characterId: 'doctor-1',
    reason: '话题：校医登记、疫情报告与防控措施',
  },
  {
    keywords: ['隔壁班', '其他班', '统一口径', '口径'],
    characterId: 'teacher-1',
    reason: '话题：隔壁班与统一口径',
  },
  {
    keywords: ['咳嗽', '难受', '害怕', '笑话', '口罩', '传染'],
    characterId: 'student-1',
    reason: '话题：学生感受',
  },
];

export function selectResponder(
  scenario: ScenarioVersion,
  eligibleCharacterIds: string[],
  history: TrainingMessageRecord[],
  lastUserMessage: string,
): DirectorPick | null {
  if (eligibleCharacterIds.length === 0) return null;
  const eligible = new Set(eligibleCharacterIds);
  const byId = new Map(scenario.characters.map((character) => [character.id, character]));

  for (const mention of NAME_MENTIONS) {
    if (!eligible.has(mention.characterId)) continue;
    if (mention.names.some((name) => lastUserMessage.includes(name))) {
      return {
        characterId: mention.characterId,
        reason: `点名了${byId.get(mention.characterId)?.name ?? mention.characterId}`,
      };
    }
  }
  for (const rule of TOPIC_RULES) {
    if (!eligible.has(rule.characterId)) continue;
    if (rule.keywords.some((keyword) => lastUserMessage.includes(keyword))) {
      return { characterId: rule.characterId, reason: rule.reason };
    }
  }
  // Rotation: least-recently-spoken eligible character first.
  const lastSpoken = new Map<string, number>();
  history.forEach((message, index) => {
    if (message.role === 'character' && message.characterId) {
      lastSpoken.set(message.characterId, index);
    }
  });
  const ordered = scenario.characters
    .map((character) => character.id)
    .filter((id) => eligible.has(id))
    .sort((a, b) => (lastSpoken.get(a) ?? -1) - (lastSpoken.get(b) ?? -1));
  const picked = ordered[0];
  if (!picked) return null;
  const anyoneSpoke = history.some((message) => message.role === 'character');
  return {
    characterId: picked,
    reason: anyoneSpoke ? '轮换：换一位角色回复' : '轮换：首位角色先回复',
  };
}
