import { z } from 'zod';

export const taskSchema = z.enum(['roleplay', 'evaluation']);
export type ModelTask = z.infer<typeof taskSchema>;
export const providerIds = [
  'glm',
  'google',
  'groq',
  'mistral',
  'cloudflare',
  'openrouter',
  'nvidia',
] as const;
export type PoolProviderId = (typeof providerIds)[number];
export const policySchema = z
  .object({
    provider: z.enum(providerIds),
    modelId: z
      .string()
      .min(1)
      .max(180)
      .regex(/^[a-zA-Z0-9@_.:/-]+$/),
    enabled: z.boolean().default(false),
    tasks: z.array(taskSchema).min(1).max(2),
    free: z.enum(['unknown', 'zero-price', 'free-plan', 'credit', 'paid']).default('unknown'),
    accountVerifiedUntil: z.number().int().nonnegative().nullable().default(null),
    quotaKind: z
      .enum(['unknown', 'one-time', 'expiring', 'daily', 'monthly', 'zero-price', 'paid'])
      .default('unknown'),
    quotaUnit: z.enum(['requests', 'tokens', 'neurons', 'usd']).default('requests'),
    total: z.number().nonnegative().nullable().default(null),
    remaining: z.number().nonnegative().nullable().default(null),
    quotaScope: z.enum(['local-budget', 'provider-balance']).default('local-budget'),
    quotaSource: z.enum(['unavailable', 'admin-entered', 'official-api']).default('unavailable'),
    observedAt: z.number().int().nonnegative().nullable().default(null),
    resetAt: z.number().int().nonnegative().nullable().default(null),
    expiresAt: z.number().int().nonnegative().nullable().default(null),
    rpm: z.number().int().min(1).max(10000).default(5),
    tpm: z.number().int().positive().max(10000000).default(20000),
    rpd: z.number().int().min(1).max(100000).default(50),
    concurrency: z.number().int().min(1).max(20).default(1),
    maxOutputTokens: z.number().int().min(128).max(8192).default(2048),
    timeoutMs: z.number().int().min(1000).max(90000).default(45000),
    warningPercent: z.number().min(1).max(100).default(20),
    // Upper bound in quota units for every request, including failed requests.
    reservePerCall: z.number().positive().nullable().default(null),
    nvidiaAuthorized: z.boolean().default(false),
    dailyBudgetUsd: z.number().nonnegative().max(100).default(0),
    perCallBudgetUsd: z.number().nonnegative().max(10).default(0),
    inputUsdPerMillion: z.number().nonnegative().nullable().default(null),
    outputUsdPerMillion: z.number().nonnegative().nullable().default(null),
    privacyReviewed: z.boolean().default(false),
  })
  .strict();
export type ModelPolicy = z.infer<typeof policySchema>;
export type FailureKind =
  | 'rpm'
  | 'tpm'
  | 'rpd'
  | 'rate-limit'
  | 'quota'
  | 'auth'
  | 'missing-model'
  | 'server'
  | 'timeout'
  | 'network'
  | 'json'
  | 'evidence'
  | 'safety'
  | 'privacy'
  | 'empty';
export interface Failure {
  kind: FailureKind;
  httpStatus: number | null;
  retryAt: number | null;
  retry: boolean;
  terminal: boolean;
}
export interface CallRecord {
  id: string;
  key: string;
  task: ModelTask;
  trainingId: string | null;
  startedAt: number;
  durationMs: number;
  status: 'reserved' | 'success' | 'failed';
  kind: FailureKind | null;
  httpStatus: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reservedTokens: number;
  reservedUnits: number;
  reservedUsd: number;
  purpose: 'training' | 'qualification';
  jsonValid: boolean | null;
  // Nonstreaming calls do not measure time to first token.
  ttftMs: null;
}
export interface Qualification {
  key: string;
  task: ModelTask;
  passed: boolean;
  checkedAt: number;
  cases: number;
  successes: number;
  failures: number;
  jsonValid: number;
  skipped?: number;
  failureKind?: string | null;
  failureCase?: number;
  blockedFactIds?: string[];
  samples?: { caseIndex: number; output: string; truncated: boolean }[];
  runtimeFailure?: { kind: 'json' | 'privacy' | 'evidence'; callId: string; at: number };
  qualityChecks: Record<string, boolean>;
  durationsMs: number[];
  source: 'real';
  suiteVersion: 1 | 2;
}
export interface RoutingSettings {
  roleplay: string | null;
  evaluation: string | null;
}
export const modelKey = (p: Pick<ModelPolicy, 'provider' | 'modelId'>) =>
  `${p.provider}:${p.modelId}`;
export class PoolError extends Error {
  constructor(
    readonly kind: FailureKind | 'unavailable' | 'busy',
    message = 'training model unavailable',
    readonly factIds?: readonly string[],
  ) {
    super(message);
  }
}
