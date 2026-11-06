import { knowledgePrompt } from './knowledge/catalog';
import { practiceFromEvents, practiceSummary } from './practice-config';
import { applyPracticeScenario } from './practice-context';
import { emergencyEvaluationContext } from './emergency-plan';
/**
 * TeacherScenarioLab — five-dimension training evaluation (server only).
 *
 * After the conversation, the teacher is scored on five dimensions, each
 * with concrete dialogue evidence (teacher message ids) and a comment,
 * plus a summary and improvement suggestions. The model returns JSON;
 * historical narrative-plus-JSON output remains accepted by the parser.
 * and only a fully parsed, citation-verified evaluation is ever persisted:
 * unparsable output, wrong shapes, and evidence pointing at unknown or
 * non-teacher messages are all rejected with 502 and nothing is stored.
 */
import { randomUUID } from 'node:crypto';
import { priorSelection, routeTrainingModel, type ModelSelection } from './models/runtime';
import { withModelLease } from './models/store';
import { PoolError } from './models/types';

import type {
  TrainingEvaluationRecord,
  TrainingMessageRecord,
} from '@openmaic/storage/training/pg';

import type { ScenarioVersion } from './scenario';
import { toScenarioVersion } from './scenario';
import { getTrainingStore } from './server';
import { TrainingServiceError } from './store';

export const EVALUATION_DIMENSIONS = [
  'communication',
  'fact-checking',
  'judgment',
  'coordination',
  'responsibility',
] as const;

export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number];

export interface DimensionScore {
  dimension: EvaluationDimension;
  score: number;
  evidence: string[];
  comment: string;
}

export interface TrainingEvaluation {
  trainingId: string;
  dimensions: DimensionScore[];
  summary: string;
  suggestions: string[];
  createdAt: number;
}

const DIMENSION_RUBRICS: Record<EvaluationDimension, string> = {
  communication: '是否回应情绪并清晰说明已知情况、当前措施、待核实事项和下次反馈安排。',
  'fact-checking': '是否区分已确认信息、待核实线索和传言，核对来源与时间，不编造未确认的信息。',
  judgment:
    '是否根据情境先考虑人员安全及紧急需求，及时寻求校医等专业支持；不擅自诊断、开药或决定停复课。',
  coordination:
    '是否及时作校内报告并明确接收人；是否避免等待确诊或上级指示后才校内报告；是否明确校医、负责人、教师的职责与反馈节点。',
  responsibility:
    '是否保护学生隐私、不透露他人信息、对外口径以学校为准；当学生问及同桌等他人病情时，是否既保护他人健康隐私（不透露姓名与病情细节）又回应提问学生的担忧。',
};

export function buildEvaluationPrompt(
  scenario: ScenarioVersion,
  transcript: TrainingMessageRecord[],
): { system: string; prompt: string } {
  const teacherIds = transcript
    .filter((message) => message.role === 'user')
    .map((message) => message.id);
  const example = {
    dimensions: EVALUATION_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 80,
      evidence: teacherIds.slice(0, 1),
      comment: '依据对话中的具体表现评述。',
    })),
    summary: '基于本次对话的评价摘要。',
    suggestions: ['结合对话提出可执行的改进建议。'],
  };
  const system = [
    '你是教师情境训练的评价员。只评价教师（用户）的表现，角色回复只是背景。',
    `情境：${scenario.setting}`,
    `目标：${scenario.goal}`,
    '五个维度与评分标准（每项 0–100 整数）：',
    ...EVALUATION_DIMENSIONS.map((dimension) => `- ${dimension}：${DIMENSION_RUBRICS[dimension]}`),
    '注意：若对话中学生问及同桌等他人病情，须在 responsibility 维度中考查教师是否保护他人健康隐私、同时安抚提问学生。',
    '应急表现按情境判断：检查安全保护、核实与校内报告能否及时并行、职责协同、隐私沟通及持续跟进。普通健康填报场景考查应急准备，不推定已发生突发事件。未观察到的行动应说明证据缺口；学员口头承诺或模拟记录不证明现实处置已经完成。',
    '证据只能引用教师消息的 id，且每条证据 id 必须真实出现在对话记录里；不得引用角色消息，不得编造 id。',
    `合法教师消息 ID：${JSON.stringify(teacherIds)}。evidence 必须从此列表逐字复制完整 ID，保留 UUID 连字符。`,
    '以下实训评价提示可用于检查表现，证据仍以本次教师消息为准：\n' +
      knowledgePrompt(
        'assessor',
        transcript
          .filter((message) => message.role === 'user')
          .map((message) => message.content)
          .join(' ')
          .slice(-8000),
      ),
    '返回一个完整 JSON 对象。五个维度各出现一次，comment 简明具体，suggestions 包含1至3条建议。评分与证据依据实际表现。',
    `结构示例：${JSON.stringify(example)}`,
  ].join('\n');
  const lines = transcript.map((message) => {
    const speaker =
      message.role === 'user'
        ? '教师'
        : (scenario.characters.find((c) => c.id === message.characterId)?.name ??
          message.characterId ??
          '角色');
    return `${speaker} [${message.id}]：${message.content}`;
  });
  const prompt = `对话记录（按时间顺序）：\n${lines.join('\n')}\n\n请按上述要求评价。`;
  return { system, prompt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse the model's narrative + JSON tail; returns null on any shape violation. */
export function parseEvaluation(
  trainingId: string,
  text: string,
  createdAt: number,
): TrainingEvaluation | null {
  const stripped = text.replace(/```json|```/g, '');
  // Let JSON.parse match the boundaries, including braces and escapes inside
  // strings. Earlier prose may also contain braces; only a complete JSON tail
  // is accepted, and the schema and evidence checks still apply below.
  const end = stripped.lastIndexOf('}');
  if (end < 0) return null;
  let parsed: unknown;
  for (let start = stripped.indexOf('{'); start >= 0; start = stripped.indexOf('{', start + 1)) {
    try {
      parsed = JSON.parse(stripped.slice(start, end + 1));
      break;
    } catch {
      // Try the next possible start after a brace in the narrative.
    }
  }
  if (!isRecord(parsed)) return null;
  if (!Array.isArray(parsed.dimensions) || parsed.dimensions.length !== 5) return null;
  if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) return null;
  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.some((s) => typeof s !== 'string')) {
    return null;
  }
  const seen = new Set<string>();
  const dimensions: DimensionScore[] = [];
  for (const entry of parsed.dimensions) {
    if (!isRecord(entry)) return null;
    if (
      typeof entry.dimension !== 'string' ||
      !(EVALUATION_DIMENSIONS as readonly string[]).includes(entry.dimension) ||
      seen.has(entry.dimension)
    ) {
      return null;
    }
    seen.add(entry.dimension);
    if (
      typeof entry.score !== 'number' ||
      !Number.isInteger(entry.score) ||
      entry.score < 0 ||
      entry.score > 100
    ) {
      return null;
    }
    if (!Array.isArray(entry.evidence) || entry.evidence.some((e) => typeof e !== 'string')) {
      return null;
    }
    if (typeof entry.comment !== 'string') return null;
    dimensions.push({
      dimension: entry.dimension as EvaluationDimension,
      score: entry.score,
      evidence: entry.evidence as string[],
      comment: entry.comment,
    });
  }
  return {
    trainingId,
    dimensions,
    summary: parsed.summary,
    suggestions: parsed.suggestions as string[],
    createdAt,
  };
}

/**
 * Every evidence id must be a real teacher message. Problems name the
 * offending id and the reason; an empty list means the citations check out.
 */
export function verifyEvaluationCitations(
  evaluation: TrainingEvaluation,
  transcript: TrainingMessageRecord[],
): string[] {
  const byId = new Map(transcript.map((message) => [message.id, message]));
  const problems: string[] = [];
  for (const dimension of evaluation.dimensions) {
    for (const id of dimension.evidence) {
      const message = byId.get(id);
      if (!message) {
        problems.push(`${dimension.dimension}: unknown evidence id ${id}`);
      } else if (message.role !== 'user') {
        problems.push(`${dimension.dimension}: evidence id ${id} is not a teacher message`);
      }
    }
  }
  return problems;
}

export type GenerateModelEvaluation = (system: string, prompt: string) => Promise<string>;

export interface EvaluateDeps {
  generateModelEvaluation?: GenerateModelEvaluation;
}

function notFound(kind: string, id: string): TrainingServiceError {
  return new TrainingServiceError(404, 'TRAINING_NOT_FOUND', `${kind} ${id} was not found`);
}

/**
 * Evaluate a training in the `evaluation` state. Wrong states fail with
 * 409; model failures, unparsable output, and bad citations fail with
 * 502/503 and persist nothing. The evaluation and its ledger event commit
 * atomically; re-evaluation while still in `evaluation` overwrites.
 */
async function generateEvaluationInner(
  ownerId: string,
  trainingId: string,
  deps: EvaluateDeps = {},
): Promise<TrainingEvaluation> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  if (training.state !== 'evaluation') {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} is in state ${training.state}, cannot evaluate`,
    );
  }
  const record = await store.getScenarioVersion(training.scenarioId, training.scenarioVersion);
  if (!record) throw notFound('scenario', `${training.scenarioId} v${training.scenarioVersion}`);
  const baseScenario = toScenarioVersion(record);
  if (!baseScenario) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} pins scenario with an unknown disclosure state`,
    );
  }
  const events = await store.listEvents(trainingId);
  const practice = practiceFromEvents(events);
  const configuredScenario = applyPracticeScenario(baseScenario, practice);
  const scenario = practice
    ? {
        ...configuredScenario,
        goal: configuredScenario.goal + ' 本次练习设置：' + practiceSummary(practice),
      }
    : configuredScenario;
  const transcript = await store.listMessages(trainingId, { includeSuperseded: false });
  const built = buildEvaluationPrompt(scenario, transcript);
  const system = built.system;
  const prompt = built.prompt + emergencyEvaluationContext(events);
  let selection: ModelSelection | undefined;
  const generate =
    deps.generateModelEvaluation ??
    (async (system: string, prompt: string) => {
      const result = await routeTrainingModel({
        task: 'evaluation',
        trainingId,
        system,
        prompt,
        pinned: priorSelection(events, 'evaluation'),
        names: scenario.characters.map((c) => c.name),
        validate: (text) => {
          const parsed = parseEvaluation(trainingId, text, Date.now());
          if (!parsed) throw new PoolError('json');
          if (verifyEvaluationCitations(parsed, transcript).length) throw new PoolError('evidence');
          if (
            parsed.dimensions.some((d) => !d.evidence.length || !d.comment.trim()) ||
            !parsed.suggestions.length
          )
            throw new PoolError('json');
        },
      });
      selection = result.selection;
      return result.text;
    });
  let text: string;
  try {
    text = (await generate(system, prompt)).trim();
  } catch {
    throw new TrainingServiceError(503, 'UPSTREAM_ERROR', 'evaluation model is not available');
  }
  if (!text) {
    throw new TrainingServiceError(503, 'UPSTREAM_ERROR', 'evaluation model returned empty text');
  }
  const now = Date.now();
  const evaluation = parseEvaluation(trainingId, text, now);
  if (!evaluation) {
    throw new TrainingServiceError(
      502,
      'UPSTREAM_ERROR',
      'evaluation model output could not be parsed',
    );
  }
  const problems = verifyEvaluationCitations(evaluation, transcript);
  if (problems.length > 0) {
    console.error(
      `training ${trainingId}: blocked evaluation with bad citations: ${problems.join('; ')}`,
    );
    throw new TrainingServiceError(
      502,
      'UPSTREAM_ERROR',
      'evaluation model cited unknown or non-teacher messages',
    );
  }
  const stored: TrainingEvaluationRecord = {
    trainingId,
    dimensions: evaluation.dimensions,
    summary: evaluation.summary,
    suggestions: evaluation.suggestions,
    createdAt: now,
  };
  await store.withTransaction(async (tx) => {
    const current = await tx.getTraining(trainingId);
    if (!current || current.state !== 'evaluation')
      throw new TrainingServiceError(
        409,
        'TRAINING_STATE_CONFLICT',
        'training changed while the model was evaluating',
      );
    await tx.saveEvaluation(stored);
    if (selection)
      await tx.appendEvent({
        id: randomUUID(),
        trainingId,
        type:
          selection.previous && selection.previous !== selection.key
            ? 'model-switched'
            : 'model-selected',
        payload: { ...selection },
        createdAt: now,
      });
    await tx.appendEvent({
      id: randomUUID(),
      trainingId,
      type: 'evaluation-completed',
      payload: {},
      createdAt: now,
    });
  });
  return evaluation;
}

export async function getEvaluation(
  ownerId: string,
  trainingId: string,
): Promise<TrainingEvaluation | null> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  const record = await store.getEvaluation(trainingId);
  if (!record) return null;
  return {
    trainingId: record.trainingId,
    dimensions: record.dimensions.map((d) => ({
      dimension: d.dimension as EvaluationDimension,
      score: d.score,
      evidence: d.evidence,
      comment: d.comment,
    })),
    summary: record.summary,
    suggestions: record.suggestions,
    createdAt: record.createdAt,
  };
}

export async function generateEvaluation(...args: Parameters<typeof generateEvaluationInner>) {
  if (args[2]?.generateModelEvaluation) return generateEvaluationInner(...args);
  try {
    return await withModelLease(`training:${args[1]}:evaluation`, () =>
      generateEvaluationInner(...args),
    );
  } catch (error) {
    if (error instanceof PoolError)
      throw new TrainingServiceError(
        error.kind === 'busy' ? 409 : 503,
        'UPSTREAM_ERROR',
        'evaluation model pool is not available',
      );
    throw error;
  }
}
