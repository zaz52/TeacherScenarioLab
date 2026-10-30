import { beforeEach, describe, expect, test, vi } from 'vitest';
import { policySchema, modelKey, PoolError } from '@/lib/training/models/types';
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  reserve: vi.fn(),
  finish: vi.fn(),
  call: vi.fn(),
}));
vi.mock('@/lib/training/models/store', () => ({
  readPoolState: mocks.read,
  reserveCall: mocks.reserve,
  finishCall: mocks.finish,
}));
vi.mock('@/lib/server/model-config/llm', () => ({
  languageModelFor: vi.fn(async () => ({ model: {}, thinkingConfig: { mode: 'disabled' } })),
}));
vi.mock('@/lib/training/models/providers', () => ({
  providerConnection: () => ({ apiKey: 'test-key' }),
  poolTarget: () => ({}),
  poolFetch: () => vi.fn(),
}));
vi.mock('@/lib/ai/llm', () => ({ callLLM: mocks.call }));
import { routeTrainingModel } from '@/lib/training/models/runtime';
const now = Date.now();
const policies = ['glm', 'google'].map((provider) =>
  policySchema.parse({
    provider,
    modelId: provider === 'glm' ? 'glm-4.7-flash' : 'gemini-3.8-flash',
    enabled: true,
    tasks: ['roleplay', 'evaluation'],
    free: provider === 'glm' ? 'zero-price' : 'free-plan',
    privacyReviewed: true,
    accountVerifiedUntil: now + 86400000,
    remaining: 50,
    quotaSource: 'admin-entered',
    observedAt: now,
  }),
);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({
    policies,
    qualifications: policies.flatMap((p) =>
      ['roleplay', 'evaluation'].map((task) => ({
        key: modelKey(p),
        task,
        passed: true,
        checkedAt: now,
        source: 'real',
        suiteVersion: 1,
      })),
    ),
    routing: { roleplay: null, evaluation: null },
  });
  mocks.reserve.mockImplementation(async (p, task, trainingId, tokens, purpose) => ({
    id: modelKey(p),
    key: modelKey(p),
    task,
    trainingId,
    startedAt: Date.now(),
    reservedTokens: tokens,
    purpose,
  }));
  mocks.finish.mockResolvedValue(undefined);
  mocks.call.mockResolvedValue({
    text: '角色中文回答',
    finishReason: 'stop',
    usage: { inputTokens: 5, outputTokens: 6 },
    response: { headers: {} },
  });
});
const run = (task: 'roleplay' | 'evaluation' = 'roleplay', validate = () => {}) =>
  routeTrainingModel({
    task,
    trainingId: 'fictional-training',
    system: '虚构角色',
    prompt: '老师您好',
    pinned: null,
    validate,
  });
describe('integrated pool runtime with mock transport (no real-provider claim)', () => {
  test('uses task default through callLLM with global and attached fallbacks disabled', async () => {
    const result = await run();
    expect(result.selection.provider).toBe('glm');
    expect(mocks.call.mock.calls[0][4]).toEqual({ enabled: false, serverManaged: true });
  });
  test('temporary upstream failure retries once then switches', async () => {
    mocks.call
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockRejectedValueOnce({ statusCode: 503 });
    const result = await run();
    expect(mocks.call).toHaveBeenCalledTimes(3);
    expect(result.selection.provider).toBe('google');
  });
  test('account exhaustion never retries exhausted model', async () => {
    mocks.call.mockRejectedValueOnce({ statusCode: 429, responseBody: '1113 余额不足' });
    expect((await run()).selection.provider).toBe('google');
    expect(mocks.call).toHaveBeenCalledTimes(2);
  });
  test.each(['safety', 'privacy', 'evidence'] as const)(
    'does not switch providers after %s',
    async (kind) => {
      await expect(
        run('roleplay', () => {
          throw new PoolError(kind);
        }),
      ).rejects.toMatchObject({ kind });
      expect(mocks.call).toHaveBeenCalledTimes(1);
    },
  );
  test('content-filter finish reason cannot trigger fallback', async () => {
    mocks.call.mockResolvedValueOnce({ text: '', finishReason: 'content-filter', usage: {} });
    await expect(run()).rejects.toMatchObject({ kind: 'safety' });
    expect(mocks.call).toHaveBeenCalledTimes(1);
  });
  test('evaluation format gets exactly one repair then the qualified backup', async () => {
    let n = 0;
    const result = await run('evaluation', () => {
      if (n++ < 2) throw new PoolError('json');
    });
    expect(mocks.call).toHaveBeenCalledTimes(3);
    expect(result.selection.provider).toBe('glm');
  });
  test('empty output fails and cannot create successful attempt', async () => {
    mocks.call.mockResolvedValue({ text: '', finishReason: 'stop', usage: {} });
    await expect(run()).rejects.toMatchObject({ kind: 'unavailable' });
    expect(mocks.finish.mock.calls.every(([c]) => c.status === 'failed')).toBe(true);
  });
  test('privacy rejection happens before reservation or transport', async () => {
    await expect(
      routeTrainingModel({
        task: 'roleplay',
        trainingId: 't',
        system: '虚构',
        prompt: '姓名：真实学生',
        pinned: null,
        validate: () => {},
      }),
    ).rejects.toMatchObject({ kind: 'privacy' });
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.call).not.toHaveBeenCalled();
  });
});
