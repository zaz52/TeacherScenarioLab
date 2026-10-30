import { languageModelFor } from '@/lib/server/model-config/llm';
import { callLLM } from '@/lib/ai/llm';
import { classifyFailure, eligible, orderCandidates, protectPrompt, minimizeNames } from './policy';
import { providerConnection, poolTarget, poolFetch } from './providers';
import { finishCall, readPoolState, reserveCall } from './store';
import { modelKey, PoolError, type CallRecord, type ModelPolicy, type ModelTask } from './types';

export interface ModelSelection {
  key: string;
  provider: string;
  modelId: string;
  task: ModelTask;
  previous: string | null;
  reason: string;
  callId: string;
}
export type OutputValidator = (text: string) => void;

/** One request uses the existing OpenMAIC adapter, SSRF guard and usage ledger. */
export async function invokePoolModel(
  policy: ModelPolicy,
  task: ModelTask,
  input: {
    system: string;
    prompt: string;
    trainingId: string | null;
    purpose: CallRecord['purpose'];
    validate: OutputValidator;
    deferCooldown?: boolean;
  },
): Promise<{ text: string; callId: string }> {
  const safe = protectPrompt(input.system, input.prompt);
  const tokens = Buffer.byteLength(safe.system + safe.prompt, 'utf8') + policy.maxOutputTokens;
  const reservation = await reserveCall(policy, task, input.trainingId, tokens, input.purpose);
  if (!reservation) throw new PoolError('busy');
  let failure: ReturnType<typeof classifyFailure> | undefined;
  let observedHttpStatus: number | null = null;
  try {
    const resolved = await languageModelFor(
      poolTarget(policy),
      { mode: 'disabled' },
      poolFetch(policy.provider, (status) => {
        observedHttpStatus = status;
      }),
    );
    const result = await callLLM(
      {
        model: resolved.model,
        system: safe.system,
        prompt: safe.prompt,
        maxOutputTokens: policy.maxOutputTokens,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(policy.timeoutMs),
      },
      task === 'roleplay' ? 'training-roleplay' : 'training-evaluation',
      undefined,
      resolved.thinkingConfig,
      { enabled: false, serverManaged: true },
    );
    reservation.httpStatus = observedHttpStatus;
    reservation.inputTokens = result.usage.inputTokens ?? null;
    reservation.outputTokens = result.usage.outputTokens ?? null;
    if (result.finishReason === 'content-filter') throw new PoolError('safety');
    const text = result.text.trim();
    if (!text) throw new PoolError('empty');
    if (
      /^(?:sorry[,， ]*)?i (?:cannot|can't|am unable to) (?:assist|help|comply)|(?:违反|违背).{0,10}(?:安全政策|安全规则)|抱歉.{0,10}(?:无法|不能)(?:协助|完成|处理)(?:此|该|这个)请求/i.test(
        text,
      )
    )
      throw new PoolError('safety');
    try {
      input.validate(text);
      if (task === 'evaluation') reservation.jsonValid = true;
    } catch (error) {
      if (task === 'evaluation') reservation.jsonValid = false;
      // The caller controls the format repair; evidence/privacy errors never repair.
      throw error;
    }
    reservation.status = 'success';
    return { text, callId: reservation.id };
  } catch (error) {
    failure = classifyFailure(error);
    reservation.status = 'failed';
    reservation.kind = failure.kind;
    reservation.httpStatus = failure.httpStatus ?? observedHttpStatus;
    throw Object.assign(
      new PoolError(
        failure.kind,
        undefined,
        error instanceof PoolError ? error.factIds : undefined,
      ),
      { failure },
    );
  } finally {
    reservation.durationMs = Date.now() - reservation.startedAt;
    await finishCall(
      reservation,
      failure?.kind === 'json' || (input.deferCooldown && failure?.retry) ? undefined : failure,
    );
  }
}

export async function routeTrainingModel(input: {
  task: ModelTask;
  trainingId: string;
  system: string;
  prompt: string;
  pinned: string | null;
  validate: OutputValidator;
  names?: readonly string[];
}): Promise<{ text: string; selection: ModelSelection }> {
  if (input.names)
    input = {
      ...input,
      system: minimizeNames(input.system, input.names),
      prompt: minimizeNames(input.prompt, input.names),
    };
  const state = await readPoolState();
  const now = Date.now();
  const ordered = orderCandidates(
    state.policies,
    input.task,
    input.pinned,
    state.routing[input.task],
  );
  let reason = input.pinned ? 'pinned' : 'free-priority';
  for (const policy of ordered) {
    const key = modelKey(policy);
    if (
      !providerConnection(policy.provider).apiKey ||
      !eligible(
        policy,
        input.task,
        state.qualifications.find((q) => q.key === key && q.task === input.task),
        now,
      )
    )
      continue;
    let retries = 0;
    let repaired = false;
    let prompt = input.prompt;
    for (;;) {
      try {
        const result = await invokePoolModel(policy, input.task, {
          ...input,
          prompt,
          purpose: 'training',
          deferCooldown: retries === 0,
        });
        return {
          ...result,
          selection: {
            key,
            provider: policy.provider,
            modelId: policy.modelId,
            task: input.task,
            previous: input.pinned,
            reason,
            callId: result.callId,
          },
        };
      } catch (error) {
        if (error instanceof PoolError && error.kind === 'busy') {
          reason = 'budget-or-cooldown';
          break;
        }
        const failure =
          (error as { failure?: ReturnType<typeof classifyFailure> }).failure ??
          classifyFailure(error);
        if (failure.terminal)
          throw new PoolError(
            failure.kind,
            undefined,
            error instanceof PoolError ? error.factIds : undefined,
          );
        if (failure.kind === 'json' && !repaired) {
          repaired = true;
          prompt = `${input.prompt}\n请重新生成符合要求的完整 JSON 对象，保留真实教师消息 ID。`;
          // A format failure is not a transport outage: a separate call is budgeted.
          continue;
        }
        if (failure.retry && retries++ < 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }
        reason = failure.kind;
        break;
      }
    }
  }
  throw new PoolError('unavailable');
}

export function priorSelection(
  events: { type: string; payload: Record<string, unknown> }[],
  task: ModelTask,
): string | null {
  const e = [...events]
    .reverse()
    .find(
      (e) =>
        (e.type === 'model-selected' || e.type === 'model-switched') &&
        e.payload.task === task &&
        typeof e.payload.key === 'string',
    );
  return typeof e?.payload.key === 'string' ? e.payload.key : null;
}
