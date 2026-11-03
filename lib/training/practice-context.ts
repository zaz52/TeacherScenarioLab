import type { ScenarioVersion } from './scenario';
import type { RoleplayPack } from './character-packs';
import {
  PARENT_PROFILES,
  practiceText,
  practiceSummary,
  type PracticeConfig,
} from './practice-config';
export function applyPracticeScenario(
  scenario: ScenarioVersion,
  practice: PracticeConfig | null,
): ScenarioVersion {
  if (!practice) return scenario;
  const text = (value: string) => practiceText(value, practice, scenario.scenarioId);
  return {
    ...scenario,
    setting: text(scenario.setting),
    goal: text(scenario.goal),
    learnerRole: text(scenario.learnerRole),
    rules: scenario.rules.map(text),
    facts: scenario.facts.map((fact) => ({ ...fact, content: text(fact.content) })),
  };
}
export function applyPracticePack(
  pack: RoleplayPack,
  scenario: ScenarioVersion,
  practice: PracticeConfig | null,
): RoleplayPack {
  if (!practice) return pack;
  const character = scenario.characters.find((c) => c.id === pack.characterId);
  const parent =
    character?.role === 'parent'
      ? PARENT_PROFILES.find((p) => p.id === practice.parentProfileId)
      : null;
  const group = practice.channel === 'group';
  const channelHint = {
    private: '进行一对一文字沟通，逐个回应问题。',
    phone: '模拟电话交流，使用自然短句、适当停顿，并复述关键约定。',
    group: '模拟家长群公开交流，讨论总体安排；个体症状、姓名、就医细节须转入私密渠道。',
  }[practice.channel];
  return {
    ...pack,
    background: group
      ? '你是本次群聊中的当前角色，依据公开信息并按照自身职责交流。'
      : practiceText(pack.background, practice, scenario.scenarioId),
    emotionBaseline: parent ? (practice.custom?.parent ?? parent.signals) : pack.emotionBaseline,
    communicationStyle:
      (parent
        ? '关注：' +
          (practice.custom?.parent ?? parent.need) +
          '。依据教师的实际回应调整态度，信息不足时继续提问。'
        : pack.communicationStyle) +
      ' ' +
      channelHint +
      ' 自定义设置用于本次模拟的沟通背景和风格；角色所知事实、信息权限、隐私及原情境规则始终约束回应，不从设置中推导未披露事实。 本次设置：' +
      practiceSummary(practice),
    scriptedReplies: parent
      ? [
          practice.custom?.parent
            ? '老师您好，我想先了解已经确认的情况，再一起商量接下来的安排。'
            : parent.opening,
          '请先说明目前已经核实的信息，还有哪些需要继续确认？',
          '我们确认一下下一步由谁联系、通过什么渠道反馈。',
        ]
      : pack.scriptedReplies.map((text) => practiceText(text, practice, scenario.scenarioId)),
  };
}
