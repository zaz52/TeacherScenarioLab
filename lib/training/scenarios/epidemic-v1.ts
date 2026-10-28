/**
 * TeacherScenarioLab — first scenario, DRAFT (version 1, unpublished).
 *
 * 《班级出现多名学生发热：第一天的沟通》. This module is the source of
 * truth for review: it must NOT be published (publishedAt set) until the
 * user confirms the content. Publishing is an explicit admin action
 * (task 9); until then this draft lives only as code (and in test
 * databases, where tests publish a copy for verification).
 *
 * Content rules honored here: no invented medical diagnosis or cause, no
 * unilateral school-closure decision, no other student's name or health
 * detail disclosed, official school notice is the only outward wording.
 */
import type { ScenarioVersion } from '../scenario';

export const EPIDEMIC_SCENARIO_V1_DRAFT: ScenarioVersion = {
  scenarioId: 'epi-class-fever',
  version: 1,
  title: '班级出现多名学生发热：第一天的沟通',
  setting:
    '某小学三年级，冬春交替的流感高发季。周一早晨，已有 4 名学生因发热请假；家长群里开始流传“班里爆发传染病”的说法。学校晨检、通风消毒等常规措施正在执行；是否上报、是否调整上课安排需按流程决定，不能由班主任擅自宣布。',
  goal:
    '教师在一天内完成：核实事实（请假人数、症状、就医情况）、安抚家长情绪、与校医和学校负责人对齐口径、提出班级处置建议（健康监测、通风消毒、请假学生居家观察、异常情况上报流程），不擅自下停课结论。',
  rules: [
    '不编造医学诊断和病因；涉及医疗判断请对方咨询医生或校医。',
    '不擅自宣布停课或复课；这类决定需按流程由学校和上级部门作出。',
    '不透露其他学生的姓名与病情细节。',
    '对外口径以学校官方通知为准，不私下传播未经核实的消息。',
    '先接住情绪再讲事实；不否认家长的担心。',
  ],
  learnerRole: '小学三年级班主任',
  characters: [
    { id: 'student-1', name: '小雨', role: 'student' },
    { id: 'parent-1', name: '乐乐妈妈', role: 'parent' },
    { id: 'teacher-1', name: '王老师', role: 'teacher' },
    { id: 'doctor-1', name: '校医', role: 'other' },
    { id: 'principal-1', name: '校长', role: 'principal' },
  ],
  facts: [
    {
      id: 'fact-morning-check',
      content: '学校每天执行晨检，学生入校时测温并登记。',
      category: 'policy',
      visibility: 'public',
    },
    {
      id: 'fact-absence-count',
      content: '今日三年级共 4 名学生因发热请假，具体名单由校医处登记。',
      category: 'policy',
      visibility: 'public',
    },
    {
      id: 'fact-ventilation',
      content: '学校已加强教室通风和消毒，这是常规措施。',
      category: 'policy',
      visibility: 'public',
    },
    {
      id: 'fact-home-observation',
      content: '发热学生居家观察是常规做法，返校需符合学校健康管理要求。',
      category: 'policy',
      visibility: 'public',
    },
    {
      id: 'fact-parent-lele',
      content: '乐乐昨晚发烧 39 度，去过社区医院，医生说先居家观察，没有确诊。',
      category: 'student',
      visibility: 'character-private',
      ownerCharacterId: 'parent-1',
    },
    {
      id: 'fact-student-cough',
      content: '小雨今早有点咳嗽，怕被同学笑话，不敢主动跟老师说。',
      category: 'student',
      visibility: 'character-private',
      ownerCharacterId: 'student-1',
    },
    {
      id: 'fact-teacher-absence',
      content: '隔壁班也有 2 名学生请假，那边家长也在问情况。',
      category: 'policy',
      visibility: 'character-private',
      ownerCharacterId: 'teacher-1',
    },
    {
      id: 'fact-doctor-reported',
      content: '校医已把请假登记情况报给学校负责人，正在等进一步指引。',
      category: 'policy',
      visibility: 'character-private',
      ownerCharacterId: 'doctor-1',
    },
    {
      id: 'fact-principal-decision',
      content: '是否调整上课安排需上级部门决定，班主任不得擅自宣布。',
      category: 'policy',
      visibility: 'character-private',
      ownerCharacterId: 'principal-1',
    },
    {
      id: 'fact-rumor',
      content: '家长群里出现“学校瞒报”的不实传言，尚未核实来源。',
      category: 'timeline',
      visibility: 'hidden',
      disclosureConditionId: 'rumor-in-group',
    },
    {
      id: 'fact-travel',
      content: '有家长私下提到孩子上周去过外地，该信息未经核实。',
      category: 'timeline',
      visibility: 'hidden',
      disclosureConditionId: 'ask-travel',
    },
  ],
  disclosureConditions: {
    'rumor-in-group': { type: 'eventOccurred', event: 'rumor-in-group' },
    'ask-travel': { type: 'userAskedAbout', topic: 'travel' },
    'coordination-reached': { type: 'stateReached', state: 'coordination' },
  },
  publishedAt: null,
};
