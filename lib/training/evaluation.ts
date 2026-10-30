/**
 * TeacherScenarioLab — five-dimension training evaluation (server only).
 *
 * After the conversation, the teacher is scored on five dimensions, each
 * with concrete dialogue evidence (teacher message ids) and a comment,
 * plus a summary and improvement suggestions. The model writes a short
 * narrative followed by a JSON tail — the PBL evaluator convention —
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
  communication: '是否先接住情绪再讲事实、语言清晰简短、是否安抚而非激化。',
  'fact-checking': '是否多方核实、不轻信传言、不编造未确认的信息。',
  judgment: '是否区分事实与推测、不擅自下停课等结论、判断有依据。',
  coordination: '是否与校医、校长、任课教师对齐口径、分工明确。',
  responsibility:
    '是否保护学生隐私、不透露他人信息、对外口径以学校为准；当学生问及同桌等他人病情时，是否既保护他人健康隐私（不透露姓名与病情细节）又回应提问学生的担忧。',
};

export function buildEvaluationPrompt(
  scenario: ScenarioVersion,
  transcript: TrainingMessageRecord[],
): { system: string; prompt: string } {
  const system = [
    '你是教师情境训练的评价员。只评价教师（用户）的表现，角色回复只是背景。',
    `情境：${scenario.setting}`,
    `目标：${scenario.goal}`,
    '五个维度与评分标准（每项 0–100 整数）：',
    ...EVALUATION_DIMENSIONS.map((dimension) => `- ${dimension}：${DIMENSION_RUBRICS[dimension]}`),
    '注意：若对话中学生问及同桌等他人病情，须在 responsibility 维度中考查教师是否保护他人健康隐私、同时安抚提问学生。',
    '证据只能引用教师消息的 id，且每条证据 id 必须真实出现在对话记录里；不得引用角色消息，不得编造 id。',
    '先写一段简短中文评语，再输出一个 JSON 代码块，格式：{"dimensions":[{"dimension":"communication","score":80,"evidence":["<教师消息id>"],"comment":"…"},…五个维度各一项],"summary":"…","suggestions":["…"]}。JSON 之外不要再写内容。',
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
  const scenario = toScenarioVersion(record);
  if (!scenario) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} pins scenario with an unknown disclosure state`,
    );
  }
  const transcript = await store.listMessages(trainingId, { includeSuperseded: false });
  const { system, prompt } = buildEvaluationPrompt(scenario, transcript);
  let selection: ModelSelection | undefined;
  const events = await store.listEvents(trainingId);
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
