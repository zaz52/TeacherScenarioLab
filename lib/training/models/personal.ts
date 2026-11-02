import { randomUUID } from 'node:crypto';
import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';
import { lookupSlot, savedProviderTarget } from '@/lib/server/model-config/runtime';
import { languageModelFor } from '@/lib/server/model-config/llm';
import { callLLM } from '@/lib/ai/llm';
import { readUserRouting } from '../user-model-routing';
import { protectPrompt, classifyFailure } from './policy';
import { poolDatabase } from './store';
import { PoolError, type CallRecord } from './types';
import type { ModelSelection, OutputValidator } from './runtime';

export async function personalTrainingModel(input: {
  trainingId: string;
  task: 'roleplay' | 'evaluation';
  characterId?: string;
  system: string;
  prompt: string;
  validate: OutputValidator;
  pinned: string | null;
}) {
  const { pool } = await getServerPersistenceProvider(process.env.DATABASE_URL ?? '');
  const found = await pool.query('SELECT owner_id FROM trainings WHERE id=$1', [input.trainingId]);
  const ownerId = found.rows[0]?.owner_id as string | undefined;
  if (!ownerId?.startsWith('acct:')) return null;
  const routing = await readUserRouting(ownerId);
  const ref =
    (input.task === 'roleplay' && input.characterId
      ? routing.characters[input.characterId]
      : null) ?? routing[input.task];
  let target;
  if (ref) target = await savedProviderTarget(ref, 'chat', ownerId, { workspaceOnly: true });
  else {
    const slot = await lookupSlot(
      input.task === 'roleplay' ? 'classroom.roleplay' : 'classroom.evaluation',
      ownerId,
    );
    if (slot.status !== 'assigned' || slot.providerSource !== 'workspace') return null;
    target = slot;
  }
  const safe = protectPrompt(input.system, input.prompt);
  const resolved = await languageModelFor(target, { mode: 'disabled' });
  const callId = randomUUID(),
    startedAt = Date.now(),
    key = `workspace:${target.providerId}:${target.modelId}`;
  const ledger = await poolDatabase();
  const record: CallRecord & { ownerId: string } = {
    id: callId,
    key,
    task: input.task,
    trainingId: input.trainingId,
    ownerId,
    startedAt,
    status: 'reserved',
    durationMs: 0,
    kind: null,
    httpStatus: null,
    inputTokens: null,
    outputTokens: null,
    reservedTokens: 0,
    reservedUnits: 0,
    reservedUsd: 0,
    purpose: 'training',
    jsonValid: null,
    ttftMs: null,
  };
  await ledger.query('INSERT INTO training_model_calls VALUES($1,$2,$3,$4)', [
    callId,
    'workspace',
    startedAt,
    record,
  ]);
  try {
    const output = await callLLM(
      {
        model: resolved.model,
        system: safe.system,
        prompt: safe.prompt,
        maxOutputTokens: 4096,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(90000),
      },
      input.task === 'roleplay' ? 'training-roleplay' : 'training-evaluation',
      undefined,
      resolved.thinkingConfig,
      { enabled: false, serverManaged: true },
    );
    if (output.finishReason === 'content-filter') throw new PoolError('safety');
    const text = output.text.trim();
    if (!text) throw new PoolError('empty');
    if (
      /^(?:sorry[,， ]*)?i (?:cannot|can't|am unable to) (?:assist|help|comply)|(?:违反|违背).{0,10}(?:安全政策|安全规则)|抱歉.{0,10}(?:无法|不能)(?:协助|完成|处理)(?:此|该|这个)请求/i.test(
        text,
      )
    )
      throw new PoolError('safety');
    try {
      input.validate(text);
    } catch (error) {
      if (input.task === 'evaluation') record.jsonValid = false;
      throw error;
    }
    record.status = 'success';
    record.inputTokens = output.usage.inputTokens ?? null;
    record.outputTokens = output.usage.outputTokens ?? null;
    record.jsonValid = input.task === 'evaluation' ? true : null;
    const selection: ModelSelection = {
      characterId: input.characterId,
      key,
      provider: target.providerId,
      modelId: target.modelId!,
      task: input.task,
      previous: input.pinned,
      reason: 'personal-workspace',
      callId,
    };
    return { text, selection };
  } catch (error) {
    const failure = classifyFailure(error);
    record.status = 'failed';
    record.kind = failure.kind;
    record.httpStatus = failure.httpStatus;
    if (error instanceof PoolError) throw error;
    throw new PoolError(failure.kind);
  } finally {
    record.durationMs = Date.now() - startedAt;
    await ledger.query('UPDATE training_model_calls SET data=$2 WHERE id=$1', [callId, record]);
  }
}
