import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { modelKey, policySchema, PoolError, type ModelPolicy } from '@/lib/training/models/types';
import {
  finishCall,
  poolDatabase,
  readPoolState,
  reserveCall,
  saveCatalog,
  savePolicy,
  saveQualification,
  withModelLease,
  poolOverview,
} from '@/lib/training/models/store';
import { getTrainingStore } from '@/lib/training/server';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';
import {
  createTraining,
  startTraining,
  appendUserMessage,
  transitionTraining,
} from '@/lib/training/store';
import { generateCharacterReply } from '@/lib/training/roleplay';
import {
  EVALUATION_DIMENSIONS,
  generateEvaluation,
  getEvaluation,
} from '@/lib/training/evaluation';
import { setDeploymentConfigForTests } from '@/lib/server/model-config/runtime';
const transport = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('@/lib/server/model-config/llm', () => ({
  languageModelFor: async () => ({ model: {}, thinkingConfig: { mode: 'disabled' } }),
}));
vi.mock('@/lib/ai/llm', () => ({ callLLM: transport.call }));
const url = process.env.PG_CONTRACT_URL;
if (url) process.env.DATABASE_URL = url;
const suite = url ? describe : describe.skip;
const make = (provider: 'glm' | 'google' = 'glm') =>
  policySchema.parse({
    provider,
    modelId: provider === 'glm' ? 'glm-4.7-flash' : 'gemini-3.8-flash',
    enabled: true,
    tasks: ['roleplay', 'evaluation'],
    free: provider === 'glm' ? 'zero-price' : 'free-plan',
    privacyReviewed: true,
    accountVerifiedUntil: Date.now() + 86400000,
    observedAt: Date.now(),
    remaining: 50,
    total: 50,
    quotaSource: 'admin-entered',
    rpm: 100,
    rpd: 100,
    tpm: 1000000,
    concurrency: 1,
  });
async function configure(p: ModelPolicy) {
  await savePolicy(p, 'test-admin');
  await saveCatalog({
    provider: p.provider,
    checkedAt: Date.now(),
    httpStatus: 200,
    models: [p.modelId],
    error: null,
  });
  for (const task of ['roleplay', 'evaluation'] as const)
    await saveQualification({
      key: modelKey(p),
      task,
      passed: true,
      checkedAt: Date.now(),
      cases: 6,
      successes: 6,
      failures: 0,
      jsonValid: task === 'evaluation' ? 6 : 0,
      qualityChecks: { testFixture: true },
      durationsMs: [],
      source: 'real',
      suiteVersion: 2,
    });
}
suite('model pool PostgreSQL contracts (mock transport, real persistence)', () => {
  beforeAll(async () => {
    await poolDatabase();
  });
  beforeEach(async () => {
    const db = await poolDatabase();
    for (const table of [
      'training_model_calls',
      'training_model_policies',
      'training_model_qualifications',
      'training_model_catalogs',
      'training_model_control',
      'training_model_leases',
      'training_model_audit',
    ])
      await db.query(`DELETE FROM ${table}`);
    process.env.GLM_API_KEY = 'fixture-not-a-secret';
    process.env.GOOGLE_API_KEY = 'fixture-not-a-secret';
    setDeploymentConfigForTests({ layer: null, legacy: false, notices: [] });
    transport.call.mockReset();
    transport.call.mockResolvedValue({
      text: '老师，我会配合您核实情况，请告诉我接下来怎么做。',
      usage: { inputTokens: 10, outputTokens: 20 },
      finishReason: 'stop',
      response: { headers: {} },
    });
  });
  test('atomic provider concurrency allows a single reservation', async () => {
    const p = make();
    await configure(p);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => reserveCall(p, 'roleplay', 't', 100, 'training')),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  test('shared provider budget spans model ids', async () => {
    const p = make('google');
    p.remaining = 1;
    p.concurrency = 5;
    await configure(p);
    const other = { ...p, modelId: 'second-fixture-model' };
    await configure(other);
    await saveCatalog({
      provider: 'google',
      httpStatus: 200,
      checkedAt: Date.now(),
      models: [p.modelId, other.modelId],
      error: null,
    });
    expect(await reserveCall(p, 'roleplay', 't', 100, 'training')).not.toBeNull();
    expect(await reserveCall(other, 'roleplay', 't', 100, 'training')).toBeNull();
  });
  test('expired observations and missing catalog prevent spending', async () => {
    const p = make('google');
    p.resetAt = Date.now() - 1;
    await configure(p);
    expect(await reserveCall(p, 'roleplay', 't', 100, 'training')).toBeNull();
    p.resetAt = null;
    await savePolicy(p, 'test-admin');
    await saveCatalog({
      provider: 'google',
      httpStatus: 404,
      checkedAt: Date.now(),
      models: [],
      error: 'http-404',
    });
    expect(await reserveCall(p, 'roleplay', 't', 100, 'training')).toBeNull();
  });
  test('cooldown recovers while auth and account exhaustion require intervention', async () => {
    const p = make();
    await configure(p);
    const record = (await reserveCall(p, 'roleplay', 't', 100, 'training'))!;
    record.status = 'failed';
    await finishCall(record, {
      kind: 'rpm',
      httpStatus: 429,
      retry: false,
      retryAt: Date.now() - 1,
      terminal: false,
    });
    expect(await reserveCall(p, 'roleplay', 't', 100, 'training')).not.toBeNull();
    const db = await poolDatabase();
    await db.query('DELETE FROM training_model_calls');
    await finishCall(
      { ...record, id: 'nonexisting' },
      { kind: 'auth', httpStatus: 403, retry: false, retryAt: null, terminal: false },
    );
    expect(await reserveCall(p, 'roleplay', 't', 100, 'training')).toBeNull();
  });
  test('NVIDIA upper-bound daily budget is atomic', async () => {
    const p = policySchema.parse({
      provider: 'nvidia',
      modelId: 'verified-fixture',
      tasks: ['roleplay'],
      enabled: true,
      privacyReviewed: true,
      nvidiaAuthorized: true,
      dailyBudgetUsd: 0.003,
      perCallBudgetUsd: 0.003,
      inputUsdPerMillion: 1,
      outputUsdPerMillion: 1,
      maxOutputTokens: 128,
      concurrency: 10,
    });
    await configure(p);
    const calls = await Promise.all(
      Array.from({ length: 6 }, () => reserveCall(p, 'roleplay', 't', 1000, 'training')),
    );
    expect(calls.filter(Boolean)).toHaveLength(2);
  });
  test('training lease excludes competing workers and releases after failure', async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => (release = resolve));
    const first = withModelLease('same-training', async () => {
      await waiting;
      throw new Error('fixture');
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(withModelLease('same-training', async () => 1)).rejects.toBeInstanceOf(PoolError);
    release();
    await expect(first).rejects.toThrow('fixture');
    expect(await withModelLease('same-training', async () => 2)).toBe(2);
  });
  test('case001 multirole fallback, sticky selection, evaluation and owner isolation persist atomically', async () => {
    await configure(make());
    await configure(make('google'));
    const owner = `test-model:${randomUUID()}`;
    const trainingStore = await getTrainingStore();
    if (!(await trainingStore.getScenarioVersion('epi-class-fever', 98765001)))
      await trainingStore.saveScenarioVersion({
        ...EPIDEMIC_SCENARIO_V1_DRAFT,
        version: 98765001,
        publishedAt: 1000,
      });
    const training = await createTraining(owner, {
      scenarioId: 'epi-class-fever',
      scenarioVersion: 98765001,
    });
    await startTraining(owner, training.id);
    const user = await appendUserMessage(owner, training.id, {
      content: '我会先联系校医核实信息，保护学生隐私，再与校长协调分工。',
    });
    transport.call
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockRejectedValueOnce({ statusCode: 503 });
    for (const characterId of ['parent-1', 'student-1', 'doctor-1', 'principal-1'])
      expect(
        (await generateCharacterReply(owner, training.id, { characterId, mode: 'model' })).model
          ?.provider,
      ).toBe('google');
    const scoped = trainingStore.forOwner(owner);
    const events = await scoped.listEvents(training.id);
    expect(events.filter((e) => e.type === 'model-selected')).toHaveLength(4);
    expect(
      (await scoped.listMessages(training.id, { includeSuperseded: false })).filter(
        (m) => m.role === 'character',
      ),
    ).toHaveLength(4);
    const database = await poolDatabase();
    await database.query('DELETE FROM training_model_control WHERE id=$1', [
      'failure:glm:glm-4.7-flash',
    ]);
    transport.call.mockRejectedValueOnce({ statusCode: 403 });
    const switched = await generateCharacterReply(owner, training.id, {
      characterId: 'parent-1',
      mode: 'model',
    });
    expect(switched.model).toMatchObject({ provider: 'glm', switched: true });
    expect(
      (await scoped.listEvents(training.id)).find((e) => e.type === 'model-switched')?.payload,
    ).toMatchObject({
      previous: 'google:gemini-3.8-flash',
      key: 'glm:glm-4.7-flash',
      reason: 'auth',
    });
    await expect(
      generateCharacterReply('another-owner', training.id, { mode: 'model' }),
    ).rejects.toMatchObject({ status: 404 });
    for (const state of ['fact-checking', 'coordination', 'proposal', 'evaluation'] as const)
      await transitionTraining(owner, training.id, state);
    transport.call.mockResolvedValueOnce({
      text: JSON.stringify({
        dimensions: EVALUATION_DIMENSIONS.map((dimension) => ({
          dimension,
          score: 80,
          evidence: [user.message.id],
          comment: '有真实对话依据，沟通清晰。',
        })),
        summary: '训练稳健。',
        suggestions: ['继续核实信息并明确分工。'],
      }),
      usage: { inputTokens: 10, outputTokens: 100 },
      finishReason: 'stop',
      response: { headers: {} },
    });
    expect((await generateEvaluation(owner, training.id)).dimensions).toHaveLength(5);
    expect((await getEvaluation(owner, training.id))?.summary).toBe('训练稳健。');
    await expect(getEvaluation('another-owner', training.id)).rejects.toMatchObject({
      status: 404,
    });
    expect((await poolOverview()).calls.every((c) => !('apiKey' in c))).toBe(true);
  });
  test('blocked provider output leaves messages, evaluations and success events absent', async () => {
    await configure(make());
    const owner = `test-model:${randomUUID()}`;
    const store = await getTrainingStore();
    if (!(await store.getScenarioVersion('epi-class-fever', 98765001)))
      await store.saveScenarioVersion({
        ...EPIDEMIC_SCENARIO_V1_DRAFT,
        version: 98765001,
        publishedAt: 1000,
      });
    const training = await createTraining(owner, {
      scenarioId: 'epi-class-fever',
      scenarioVersion: 98765001,
    });
    await startTraining(owner, training.id);
    transport.call.mockResolvedValue({
      text: EPIDEMIC_SCENARIO_V1_DRAFT.facts.find((f) => f.visibility === 'hidden')!.content,
      usage: {},
      finishReason: 'stop',
    });
    await expect(
      generateCharacterReply(owner, training.id, { characterId: 'student-1' }),
    ).rejects.toMatchObject({ status: 503 });
    const scoped = store.forOwner(owner);
    expect(await scoped.listMessages(training.id, { includeSuperseded: false })).toHaveLength(0);
    expect(
      (await scoped.listEvents(training.id)).filter(
        (e) => e.type === 'model-selected' || e.type === 'character-reply',
      ),
    ).toHaveLength(0);
  });
  test('pool policy bootstrap preserves saved records', async () => {
    const p = make();
    await configure(p);
    expect((await readPoolState()).policies.find((x) => modelKey(x) === modelKey(p))).toEqual(p);
    await poolDatabase();
    expect((await readPoolState()).policies.find((x) => modelKey(x) === modelKey(p))).toEqual(p);
  });
  test('business evidence failures revoke evaluation qualification independently of roleplay', async () => {
    const p = make();
    await configure(p);
    const r = (await reserveCall(p, 'evaluation', 'test-training', 100, 'training'))!;
    r.status = 'failed';
    r.kind = 'evidence';
    await finishCall(r, {
      kind: 'evidence',
      httpStatus: 200,
      retry: false,
      retryAt: null,
      terminal: true,
    });
    const state = await readPoolState();
    expect(
      state.qualifications.find((q) => q.key === modelKey(p) && q.task === 'evaluation')?.passed,
    ).toBe(false);
    expect(
      state.qualifications.find((q) => q.key === modelKey(p) && q.task === 'roleplay')?.passed,
    ).toBe(true);
    expect(await reserveCall(p, 'evaluation', 'test-training', 100, 'training')).toBeNull();
  });
});
