/**
 * TeacherScenarioLab — single-role reply service (server only).
 *
 * One character answers one turn. The prompt admits ONLY what the speaking
 * character may know: public facts plus that character's own private facts.
 * Other characters' private facts and hidden facts are never in the prompt
 * (hidden facts wait for the task-5 disclosure engine; until then they are
 * simply absent). The reply is persisted as a `character` message and
 * ledgered as a `character-reply` event carrying its mode, so a scripted
 * demo reply is always distinguishable from a model reply in the ledger.
 */
import { randomUUID } from 'node:crypto';

import type { TrainingMessageRecord } from '@openmaic/storage/training/pg';

import {
  getCharacterPack,
  getScenarioPacks,
  type RoleplayPack,
} from './character-packs';
import { selectResponder, type DirectorPick } from './director';
import { getDisclosedFacts } from './disclosure';
import { checkDynamicEvents } from './dynamic-events';
import { scanReplyForLeaks } from './leak-scan';
import { toScenarioVersion, type ScenarioVersion, type TrainingFact } from './scenario';
import { getTrainingStore } from './server';
import { TrainingServiceError } from './store';

export type ReplyMode = 'scripted' | 'model';

/** Prompt history cap: the tail of the character-visible transcript. */
export const MAX_PROMPT_MESSAGES = 30;

/** Injectable model call, so tests can stub the model without keys. */
export type GenerateModelReply = (system: string, prompt: string) => Promise<string>;

const MESSAGEABLE_STATES = ['briefing', 'fact-checking', 'coordination', 'proposal'];

/**
 * Build the character prompt. Pure function — unit-tested for the
 * information boundary (own private facts in, others' and hidden out) and
 * for per-role context trimming: the transcript keeps only the teacher's
 * messages and this character's own replies (the fiction is a sequence of
 * 1:1 exchanges, so other characters' replies are not visible here),
 * capped at the most recent MAX_PROMPT_MESSAGES.
 */
export function buildCharacterPrompt(
  scenario: ScenarioVersion,
  pack: RoleplayPack,
  characterName: string,
  history: TrainingMessageRecord[],
  disclosedFacts: TrainingFact[] = [],
): { system: string; prompt: string } {
  const publicFacts = scenario.facts.filter((fact) => fact.visibility === 'public');
  const ownPrivateFacts = scenario.facts.filter(
    (fact) =>
      fact.visibility === 'character-private' &&
      fact.ownerCharacterId === pack.characterId,
  );
  const knownFacts = [...publicFacts, ...ownPrivateFacts];
  const systemLines = [
    `你正在扮演 ${characterName}。`,
    `背景：${pack.background}`,
    `情绪基线：${pack.emotionBaseline}`,
    `说话方式：${pack.communicationStyle}`,
    `情境：${scenario.setting}`,
    `本次沟通的目标：${scenario.goal}`,
    `规则：${scenario.rules.map((rule, index) => `${index + 1}. ${rule}`).join(' ')}`,
    `你知道的事实：${knownFacts.map((fact) => fact.content).join('；')}`,
  ];
  if (disclosedFacts.length > 0) {
    systemLines.push(
      `新披露的事实（教师已知，可提及）：${disclosedFacts.map((fact) => fact.content).join('；')}`,
    );
  }
  systemLines.push(
    '只扮演这个角色。不要透露你不知道的事，不要替其他角色说话，不要编造医学诊断。回复用中文，简短自然，像真人说话。',
  );
  const system = systemLines.join('\n');
  const visibleHistory = history
    .filter(
      (message) =>
        message.role === 'user' ||
        (message.role === 'character' && message.characterId === pack.characterId),
    )
    .slice(-MAX_PROMPT_MESSAGES);
  const transcript = visibleHistory
    .map((message) =>
      message.role === 'user' ? `教师：${message.content}` : `${characterName}：${message.content}`,
    )
    .join('\n');
  const prompt = transcript
    ? `${transcript}\n\n请以 ${characterName} 的身份回复上一条教师消息。`
    : `请以 ${characterName} 的身份说第一句话，向教师反映你的情况。`;
  return { system, prompt };
}

/**
 * Generate and persist one character reply. `characterId` is optional: when
 * omitted, the director picks the responder from the latest user message
 * and the pick is returned alongside the message. `generateModelReply`
 * defaults to the training-roleplay stage model call; pass a stub in tests.
 */
export async function generateCharacterReply(
  ownerId: string,
  trainingId: string,
  input: { characterId?: string; mode?: ReplyMode },
  deps: { generateModelReply?: GenerateModelReply } = {},
): Promise<{
  message: TrainingMessageRecord;
  mode: ReplyMode;
  director?: DirectorPick;
}> {
  const mode = input.mode ?? 'model';
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) {
    throw new TrainingServiceError(404, 'TRAINING_NOT_FOUND', `training ${trainingId} was not found`);
  }
  if (!MESSAGEABLE_STATES.includes(training.state)) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} is in state ${training.state}, cannot reply`,
    );
  }
  const record = await store.getScenarioVersion(training.scenarioId, training.scenarioVersion);
  if (!record) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} pins missing scenario ${training.scenarioId} version ${training.scenarioVersion}`,
    );
  }
  const scenario = toScenarioVersion(record);
  if (!scenario) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} pins scenario with an unknown disclosure state`,
    );
  }
  const history = await store.listMessages(trainingId, { includeSuperseded: false });
  const events = await store.listEvents(trainingId);
  let characterId = input.characterId;
  let director: DirectorPick | undefined;
  if (!characterId) {
    const eligible = getScenarioPacks(training.scenarioId).map((pack) => pack.characterId);
    const lastUserMessage =
      [...history].reverse().find((message) => message.role === 'user')?.content ?? '';
    const pick = selectResponder(scenario, eligible, history, lastUserMessage);
    if (!pick) {
      throw new TrainingServiceError(
        400,
        'INVALID_REQUEST',
        `scenario ${training.scenarioId} has no character with a roleplay pack`,
      );
    }
    characterId = pick.characterId;
    director = pick;
  }
  const character = scenario.characters.find((entry) => entry.id === characterId);
  if (!character) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `character ${characterId} is not in scenario ${training.scenarioId}`,
    );
  }
  const pack = getCharacterPack(training.scenarioId, characterId);
  if (!pack) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `character ${characterId} has no roleplay pack`,
    );
  }
  const priorReplies = history.filter(
    (message) => message.role === 'character' && message.characterId === characterId,
  ).length;
  // Dynamic events fire here (pure evaluation against the current ledger),
  // and disclosures are computed with them included, so a reply generated
  // in the same turn may already reference the newly surfaced beat.
  const userMessages = history.filter((m) => m.role === 'user').map((m) => m.content);
  const firedEvents = checkDynamicEvents(training.scenarioId, userMessages.length, events);
  const disclosedFacts = getDisclosedFacts(scenario, {
    state: training.state,
    events: [...events, ...firedEvents.map((type) => ({ type }))],
    userMessages,
  });

  let text: string;
  if (mode === 'scripted') {
    if (pack.scriptedReplies.length === 0) {
      throw new TrainingServiceError(
        400,
        'INVALID_REQUEST',
        `character ${characterId} has no scripted replies`,
      );
    }
    text = pack.scriptedReplies[Math.min(priorReplies, pack.scriptedReplies.length - 1)] as string;
  } else {
    const { system, prompt } = buildCharacterPrompt(
      scenario,
      pack,
      character.name,
      history,
      disclosedFacts,
    );
    const generate = deps.generateModelReply ?? (await buildDefaultModelCall(ownerId));
    try {
      text = (await generate(system, prompt)).trim();
    } catch (error) {
      throw new TrainingServiceError(
        503,
        'UPSTREAM_ERROR',
        `roleplay model is not available: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
    if (!text) {
      throw new TrainingServiceError(503, 'UPSTREAM_ERROR', 'roleplay model returned empty text');
    }
  }

  // Output-side leak scan (both modes): the reply must not reveal other
  // characters' private facts or still-locked hidden facts. Blocked replies
  // are never persisted; only fact ids reach the server log, never content.
  const disclosedIds = new Set(disclosedFacts.map((fact) => fact.id));
  const forbiddenFacts = scenario.facts.filter(
    (fact) =>
      (fact.visibility === 'character-private' &&
        fact.ownerCharacterId !== characterId) ||
      (fact.visibility === 'hidden' && !disclosedIds.has(fact.id)),
  );
  const leaked = scanReplyForLeaks(text, forbiddenFacts);
  if (leaked.length > 0) {
    console.error(
      `training ${trainingId}: blocked character reply leaking facts ${leaked.join(',')}`,
    );
    throw new TrainingServiceError(
      502,
      'UPSTREAM_ERROR',
      'reply blocked: possible information leak',
    );
  }

  const now = Date.now();
  return store.withTransaction(async (tx) => {
    for (const eventType of firedEvents) {
      await tx.appendEvent({
        id: randomUUID(),
        trainingId,
        type: eventType,
        payload: { triggeredBy: 'user-message-count', userMessageCount: userMessages.length },
        createdAt: now,
      });
    }
    const message = await tx.appendMessage({
      id: randomUUID(),
      trainingId,
      characterId: characterId as string,
      role: 'character',
      content: text,
      idempotencyKey: null,
      createdAt: now,
    });
    await tx.appendEvent({
      id: randomUUID(),
      trainingId,
      type: 'character-reply',
      payload: {
        messageId: message.message.id,
        characterId: characterId as string,
        mode,
        director: director ? { characterId: director.characterId, reason: director.reason } : null,
      },
      createdAt: now,
    });
    return { message: message.message, mode, director };
  });
}

async function buildDefaultModelCall(ownerId: string): Promise<GenerateModelReply> {
  const { resolveModel } = await import('@/lib/server/resolve-model');
  const { backgroundWorkspaceId } = await import('@/lib/server/model-config/runtime');
  const { callLLM } = await import('@/lib/ai/llm');
  let resolved: Awaited<ReturnType<typeof resolveModel>> | undefined;
  return async (system: string, prompt: string) => {
    resolved ??= await resolveModel({
      stage: 'training-roleplay',
      workspaceId: await backgroundWorkspaceId(ownerId),
    });
    const result = await callLLM(
      {
        model: resolved.model,
        system,
        prompt,
        maxOutputTokens: resolved.modelInfo?.outputWindow,
        maxRetries: 0,
      },
      'training-roleplay',
      undefined,
      resolved.thinkingConfig,
      { serverManaged: resolved.serverManaged },
    );
    return result.text;
  };
}
