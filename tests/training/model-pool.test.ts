import { describe, expect, test } from 'vitest';
import {
  budgetForWindow,
  classifyFailure,
  eligible,
  freeEligible,
  orderCandidates,
  percentile,
  protectPrompt,
} from '@/lib/training/models/policy';
import { modelKey, policySchema, type Qualification } from '@/lib/training/models/types';
import { defaultPolicies } from '@/lib/training/models/providers';

const now = Date.now();
const glm = () => defaultPolicies()[0];
const free = (
  provider: 'google' | 'groq' | 'openrouter' | 'cloudflare',
  modelId = provider === 'google' ? 'gemini-3.8-flash' : 'fictional-model',
) =>
  policySchema.parse({
    provider,
    modelId,
    tasks: ['roleplay', 'evaluation'],
    enabled: true,
    free: 'free-plan',
    privacyReviewed: true,
    accountVerifiedUntil: now + 60000,
    remaining: 20,
    total: 50,
    quotaSource: 'admin-entered',
    observedAt: now,
  });
const q = (key: string): Qualification => ({
  key,
  task: 'roleplay',
  passed: true,
  checkedAt: now,
  cases: 6,
  successes: 6,
  failures: 0,
  jsonValid: 0,
  qualityChecks: { complete: true },
  durationsMs: [20, 30],
  source: 'real',
  suiteVersion: 2,
});
describe('training pool free eligibility and order', () => {
  test('known local budgets reset while provider balances require a fresh observation', () => {
    const p = {
      ...free('google'),
      resetAt: now - 1000,
      quotaKind: 'daily' as const,
      total: 20,
      remaining: 0,
    };
    expect(budgetForWindow(p, now).remaining).toBe(20);
    expect(freeEligible(p, now)).toBe(true);
    expect(freeEligible({ ...p, quotaScope: 'provider-balance' }, now)).toBe(false);
    expect(budgetForWindow({ ...p, quotaKind: 'monthly' }, now).resetAt).toBeGreaterThan(now);
  });
  test('requires separate real task qualification', () => {
    const p = glm();
    expect(eligible(p, 'roleplay', undefined, now)).toBe(false);
    expect(eligible(p, 'roleplay', q(modelKey(p)), now)).toBe(true);
    expect(eligible(p, 'roleplay', { ...q(modelKey(p)), suiteVersion: 1 }, now)).toBe(false);
    expect(eligible({ ...p, tasks: ['roleplay'] }, 'evaluation', q(modelKey(p)), now)).toBe(false);
  });
  test.each(['unknown', 'paid'] as const)('refuses %s free status', (freeStatus) =>
    expect(freeEligible({ ...free('groq'), free: freeStatus }, now)).toBe(false),
  );
  test('unknown, depleted, stale, expired and reset quotas fail closed', () => {
    const p = free('google');
    for (const patch of [
      { remaining: null },
      { remaining: 0 },
      { observedAt: now - 86400001 },
      { quotaSource: 'unavailable' as const },
      { accountVerifiedUntil: null },
      { expiresAt: now - 1 },
      { resetAt: now - 1 },
    ])
      expect(freeEligible({ ...p, ...patch }, now)).toBe(false);
    expect(freeEligible(p, now)).toBe(true);
  });
  test('OpenRouter admits only explicit free suffix', () => {
    expect(freeEligible(free('openrouter'), now)).toBe(false);
    expect(freeEligible(free('openrouter', 'some/model:free'), now)).toBe(true);
  });
  test('NVIDIA requires all independent budget controls', () => {
    const p = policySchema.parse({
      provider: 'nvidia',
      modelId: 'verified-model',
      tasks: ['roleplay'],
    });
    expect(freeEligible(p, now)).toBe(false);
    const allowed = {
      ...p,
      nvidiaAuthorized: true,
      dailyBudgetUsd: 1,
      perCallBudgetUsd: 0.01,
      inputUsdPerMillion: 1,
      outputUsdPerMillion: 1,
    };
    expect(freeEligible(allowed, now)).toBe(true);
    expect(freeEligible({ ...allowed, perCallBudgetUsd: 0 }, now)).toBe(false);
  });
  test('expiring free credit precedes default and backup independently', () => {
    const g = free('google');
    const a = { ...free('groq'), expiresAt: now + 100 };
    const b = { ...free('cloudflare'), expiresAt: now + 200 };
    expect(
      orderCandidates([glm(), g, b, a], 'roleplay', null, null).map((p) => p.provider),
    ).toEqual(['groq', 'cloudflare', 'glm', 'google']);
    expect(
      orderCandidates([glm(), g, b, a], 'evaluation', null, null).map((p) => p.provider),
    ).toEqual(['groq', 'cloudflare', 'google', 'glm']);
  });
  test('successful pinned model stays ahead of recovered free candidates', () => {
    expect(
      orderCandidates([glm(), free('google'), free('groq')], 'roleplay', modelKey(glm()), null)[0]
        .provider,
    ).toBe('glm');
  });
  test('NVIDIA cannot be selected manually ahead of free candidates', () => {
    const n = policySchema.parse({
      provider: 'nvidia',
      modelId: 'verified-model',
      tasks: ['roleplay'],
    });
    expect(orderCandidates([n, glm()], 'roleplay', null, modelKey(n))[0].provider).toBe('glm');
  });
});
describe('failure classification', () => {
  test.each([
    [429, '{"code":"1113","message":"余额不足或无可用资源包"}', 'quota'],
    [429, '{"code":"1305","message":"访问量过大"}', 'rate-limit'],
    [429, 'tokens per minute exceeded', 'tpm'],
    [429, 'requests per day exceeded', 'rpd'],
    [401, 'bad key', 'auth'],
    [403, 'permission denied', 'auth'],
    [404, 'model not found', 'missing-model'],
    [500, 'unavailable', 'server'],
    [502, 'unavailable', 'server'],
    [503, 'unavailable', 'server'],
    [400, 'content_filter', 'safety'],
  ])('%s %s => %s', (status, body, kind) =>
    expect(classifyFailure({ statusCode: status, responseBody: body }).kind).toBe(kind),
  );
  test('honors Retry-After seconds and dates', () => {
    expect(
      classifyFailure({ statusCode: 429, responseHeaders: { 'retry-after': '120' } }, now).retryAt,
    ).toBe(now + 120000);
    expect(
      classifyFailure(
        {
          statusCode: 429,
          responseHeaders: { 'retry-after': new Date(now + 120000).toUTCString() },
        },
        now,
      ).retryAt,
    ).toBeGreaterThan(now);
  });
  test('safety, privacy and evidence violations are terminal', () => {
    for (const kind of ['safety', 'privacy', 'evidence'])
      expect(classifyFailure({ kind }).terminal).toBe(true);
  });
  test('timeouts and network failures permit bounded retry', () => {
    expect(classifyFailure({ name: 'TimeoutError' }).kind).toBe('timeout');
    expect(classifyFailure(new Error('fetch failed')).retry).toBe(true);
  });
});
test.each([
  '身份证：123456199001011234',
  '我的电话 13812345678',
  '姓名：真实学生',
  '病历：详细病情',
  '联系 teacher@example.com',
])('blocks sensitive free text %s', (prompt) =>
  expect(() => protectPrompt('fictional scenario', prompt)).toThrow(),
);
test('admits fictional conversational prompts and reports no fabricated TTFT', () => {
  expect(protectPrompt('虚构小学角色', '老师您好')).toEqual({
    system: '虚构小学角色',
    prompt: '老师您好',
  });
  expect(percentile([], 0.95)).toBeNull();
  expect(percentile([40, 10, 30, 20], 0.95)).toBe(40);
});
