import { retrieveKnowledge } from './catalog';
import type { SupportDimension } from './types';
interface Message {
  id: string;
  role: string;
  content: string;
}
const dimensions: SupportDimension[] = [
  'communication',
  'fact-checking',
  'judgment',
  'coordination',
  'responsibility',
];
const risks: Array<{
  id: string;
  dimension: SupportDimension;
  pattern: RegExp;
  topic: string;
  advice: string;
  alternative: string;
}> = [
  {
    id: 'diagnosis',
    dimension: 'judgment',
    pattern: /(?:肯定|一定|确定|就是).{0,8}(?:流感|新冠|传染病|感染)/,
    topic: '判断 核实',
    advice: '请区分已观察到的症状和专业诊断，向合适的专业人员核实。',
    alternative: '目前已经确认的是这些症状，具体病因和医疗处理需要向医生核实。',
  },
  {
    id: 'guarantee',
    dimension: 'judgment',
    pattern: /(?:保证|百分之百|绝对).{0,10}(?:不会传染|安全|没事|没有风险)/,
    topic: '不确定 判断',
    advice: '请说明现有措施、信息边界和后续观察安排，核对绝对保证的依据。',
    alternative: '我们正在落实已经确认的安排，后续有变化会通过约定渠道及时说明。',
  },
  {
    id: 'privacy',
    dimension: 'responsibility',
    pattern: /(?:公布|公开|发到.{0,5}群|群里发).{0,16}(?:姓名|名单|病历|诊断|就医详情)/,
    topic: '隐私 公开',
    advice: '请核对公开范围，个体健康信息适合在私密渠道按职责核实。',
    alternative: '群里先说明总体安排，涉及孩子的具体情况，我们通过私密渠道逐一核实。',
  },
  {
    id: 'closure',
    dimension: 'judgment',
    pattern: /(?:我决定|我宣布|由我决定).{0,10}(?:停课|复课)/,
    topic: '职责 判断',
    advice: '请核对教师权限及学校现行决策流程，向负责人确认正式安排。',
    alternative: '我会把已核实情况及时反馈给学校负责人，相关安排以正式通知为准。',
  },
  {
    id: 'reporting',
    dimension: 'coordination',
    pattern: /等.{0,12}(?:确诊|检查结果|上级指示).{0,8}再.{0,3}(?:报告|汇报|上报)/,
    topic: '协调 核实',
    advice: '请核对本情境的校内报告要求，发现情况后及时联系学校指定责任人。',
    alternative: '我先把目前已经发现的情况向学校指定责任人报告，待核实的信息会继续补充。',
  },
  {
    id: 'dismissal',
    dimension: 'communication',
    pattern: /别烦|别吵|不要大惊小怪|你太矫情|活该|你们家长.{0,6}(?:无理|麻烦)/,
    topic: '情绪 安抚',
    advice: '请回应对方具体担忧，使用尊重和可继续交流的措辞。',
    alternative: '我听到您主要担心的是这件事，我们先把已经确认的信息和下一步安排说明白。',
  },
  {
    id: 'medication',
    dimension: 'judgment',
    pattern: /(?:我建议|我让|我给).{0,12}(?:吃|用).{0,8}(?:抗生素|阿莫西林|奥司他韦)/,
    topic: '职责 就医',
    advice: '请核对专业职责，具体诊疗和用药建议应由合适的医疗专业人员提供。',
    alternative: '具体诊疗和用药请咨询医生，我们配合核实学校需要了解的情况与安排。',
  },
  {
    id: 'stigma',
    dimension: 'responsibility',
    pattern: /(?:就是|都是|别跟|远离).{0,8}(?:传染源|害人精|那家孩子)/,
    topic: '隐私 同伴',
    advice: '请核对可能带来污名的称呼，聚焦已确认事实和可执行支持。',
    alternative: '我们关注已经确认的信息和共同的防护安排，也尊重每个孩子的隐私与正常交往。',
  },
];
const positive: Record<SupportDimension, RegExp> = {
  communication: /理解|担心|听到|感受|您最|您觉得|一起商量/,
  'fact-checking': /核实|确认|来源|症状|就医|何时|什么时候|待确认/,
  judgment: /医生|专业|依据|待核实|尚未|不确定|学校.*流程|负责人.*确认/,
  coordination: /校医|负责人|联系人|安排|约定|回访|分工|通知渠道/,
  responsibility: /隐私|私下|私密|匿名|不公开|尊重|保密|保护/,
};
function source(category: 'tutor' | 'assessor', text: string) {
  return retrieveKnowledge(category, text, 2).map((entry) => ({
    id: entry.id,
    label: entry.label,
    title: entry.reference.title,
    url: entry.reference.url,
  }));
}
function findRisks(message: Message) {
  const clauses = message.content.slice(-16000).split(/[。！？!?\n；;]/);
  return risks
    .filter((rule) =>
      clauses.some((clause) => {
        const match = rule.pattern.exec(clause);
        if (!match) return false;
        const prefix = clause.slice(Math.max(0, match.index - 12), match.index);
        return !/(?:不要|不能|不会|不该|避免|拒绝|不应|别|勿|并非).{0,6}$/.test(prefix);
      }),
    )
    .map((rule) => ({
      id: rule.id,
      messageId: message.id,
      dimension: rule.dimension,
      advice: rule.advice,
      alternative: rule.alternative,
      sources: source('tutor', rule.topic),
    }));
}
export function buildKnowledgeSupport(messages: Message[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  const complete: Message[] = [];
  let pending: Message | null = null;
  for (const message of messages) {
    if (message.role === 'user') pending = message;
    else if (message.role === 'character' && pending) {
      complete.push(pending);
      pending = null;
    }
  }
  const batch = Math.floor(complete.length / 10);
  const window = batch ? complete.slice((batch - 1) * 10, batch * 10) : [];
  const corrections = userMessages.slice(-3).flatMap(findRisks).slice(-6);
  return {
    completedRounds: complete.length,
    threshold: 10,
    nextReportAt: (batch + 1) * 10,
    method: 'rule-supported',
    corrections,
    report: batch
      ? {
          batch,
          roundStart: (batch - 1) * 10 + 1,
          roundEnd: batch * 10,
          dimensions: dimensions.map((dimension) => {
            const evidence = window
              .filter((message) => positive[dimension].test(message.content))
              .map((message) => {
                const match = positive[dimension].exec(message.content);
                const start = Math.max(0, (match?.index ?? 0) - 40);
                return { id: message.id, text: message.content.slice(start, start + 240) };
              })
              .slice(0, 3);
            const concerns = window
              .flatMap(findRisks)
              .filter((risk) => risk.dimension === dimension);
            return {
              dimension,
              status: concerns.length ? 'review' : evidence.length ? 'observed' : 'missing',
              evidence,
              concerns: concerns.map((item) => ({
                messageId: item.messageId,
                advice: item.advice,
              })),
              sources: source('assessor', dimension),
            };
          }),
        }
      : null,
  };
}
export type KnowledgeSupport = ReturnType<typeof buildKnowledgeSupport>;
