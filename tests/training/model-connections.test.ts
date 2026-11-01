import { afterEach, expect, test, vi } from 'vitest';
import { saveCustomConnection, connectionSchema } from '@/lib/training/models/connections';
import { eligible, freeEligible, orderCandidates } from '@/lib/training/models/policy';
import { modelKey, policySchema } from '@/lib/training/models/types';

afterEach(() => vi.unstubAllEnvs());
const connection = {
  id: 'custom-school',
  preset: 'openai-compatible' as const,
  apiKey: 'synthetic-key-fixture',
  models: ['school/private-model'],
  revision: null,
};

test.each([
  'http://models.example/v1',
  'https://user:password@models.example/v1',
  'https://models.example/v1?api_key=synthetic',
  'https://models.example/v1#fragment',
  'https://127.0.0.1/v1',
  'https://169.254.169.254/v1',
  'https://10.1.2.3/v1',
])('refuses unsafe custom endpoint %s even with local-network opt-in', async (baseUrl) => {
  vi.stubEnv('ALLOW_LOCAL_NETWORKS', 'true');
  await expect(
    saveCustomConnection({ ...connection, baseUrl }, 'acct:admin'),
  ).rejects.toBeDefined();
});

test('custom connections have their own namespace and cannot supply proxies or environment keys', () => {
  const good = { ...connection, baseUrl: 'https://models.example/v1' };
  expect(connectionSchema.safeParse(good).success).toBe(true);
  for (const bad of [
    { ...good, id: 'glm' },
    { ...good, proxy: 'http://proxy.example' },
    { ...good, env: 'GLM_API_KEY' },
  ])
    expect(connectionSchema.safeParse(bad).success).toBe(false);
});

test('paid custom models require authorization and budgets and never become automatic fallbacks', () => {
  const p = policySchema.parse({
    provider: 'custom-school',
    modelId: 'school/paid',
    tasks: ['roleplay'],
    enabled: true,
    privacyReviewed: true,
    free: 'paid',
    connectionRevision: 2,
  });
  expect(freeEligible(p, Date.now())).toBe(false);
  const approved = {
    ...p,
    paidAuthorized: true,
    dailyBudgetUsd: 1,
    perCallBudgetUsd: 0.1,
    inputUsdPerMillion: 1,
    outputUsdPerMillion: 1,
  };
  expect(freeEligible(approved, Date.now())).toBe(true);
  expect(orderCandidates([approved], 'roleplay', null, null)).toEqual([]);
  expect(orderCandidates([approved], 'roleplay', null, modelKey(approved))).toEqual([approved]);
  const q = {
    key: modelKey(p),
    task: 'roleplay' as const,
    passed: true,
    checkedAt: Date.now(),
    cases: 6,
    successes: 6,
    failures: 0,
    jsonValid: 0,
    qualityChecks: {},
    durationsMs: [],
    source: 'real' as const,
    suiteVersion: 2 as const,
    connectionRevision: 1,
  };
  expect(eligible(approved, 'roleplay', q, Date.now())).toBe(false);
  expect(eligible(approved, 'roleplay', { ...q, connectionRevision: 2 }, Date.now())).toBe(true);
});
