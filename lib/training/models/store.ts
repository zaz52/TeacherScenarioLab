import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';
import { withSchemaBootstrapLock } from '@/lib/persistence/schema-bootstrap-lock';
import { defaultPolicies, type Catalog } from './providers';
import { freeEligible, eligible, percentile, budgetForWindow } from './policy';
import {
  modelKey,
  policySchema,
  PoolError,
  type CallRecord,
  type Failure,
  type ModelPolicy,
  type ModelTask,
  type Qualification,
  type RoutingSettings,
} from './types';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS training_model_policies (key text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS training_model_qualifications (key text NOT NULL, task text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(key,task));
CREATE TABLE IF NOT EXISTS training_model_catalogs (provider text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS training_model_control (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS training_model_calls (id text PRIMARY KEY, provider text NOT NULL, started_at double precision NOT NULL, data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS training_model_calls_provider_time ON training_model_calls(provider,started_at);
CREATE TABLE IF NOT EXISTS training_model_leases (key text PRIMARY KEY, token text NOT NULL, expires_at double precision NOT NULL);
CREATE TABLE IF NOT EXISTS training_model_audit (id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, created_at double precision NOT NULL, data jsonb NOT NULL);
`;
let ready: { url: string; promise: Promise<void> } | undefined;
export async function poolDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new PoolError('unavailable');
  const { pool } = await getServerPersistenceProvider(url);
  if (ready?.url !== url) {
    const promise = withSchemaBootstrapLock(pool, async (q) => {
      await q.query(SCHEMA);
    }).then(async () => {
      for (const policy of defaultPolicies())
        await pool.query(
          'INSERT INTO training_model_policies(key,data) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [modelKey(policy), policy],
        );
    });
    ready = { url, promise };
    promise.catch(() => {
      if (ready?.promise === promise) ready = undefined;
    });
  }
  await ready.promise;
  return pool;
}

export async function withPoolTransaction<T>(body: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = await poolDatabase();
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SELECT pg_advisory_xact_lock(hashtext('training-model-budget'))");
    const result = await body(c);
    await c.query('COMMIT');
    return result;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

export async function readPoolState() {
  const pool = await poolDatabase();
  const [p, q, c, s] = await Promise.all([
    pool.query('SELECT data FROM training_model_policies ORDER BY key'),
    pool.query('SELECT data FROM training_model_qualifications'),
    pool.query('SELECT data FROM training_model_catalogs'),
    pool.query("SELECT data FROM training_model_control WHERE id='routing'"),
  ]);
  return {
    policies: p.rows.map((r) => policySchema.parse(r.data)),
    qualifications: q.rows.map((r) => r.data as Qualification),
    catalogs: c.rows.map((r) => r.data as Catalog),
    routing: (s.rows[0]?.data ?? { roleplay: null, evaluation: null }) as RoutingSettings,
  };
}

export async function audit(actor: string, action: string, data: Record<string, unknown>) {
  const pool = await poolDatabase();
  await pool.query('INSERT INTO training_model_audit VALUES($1,$2,$3,$4,$5)', [
    randomUUID(),
    actor,
    action,
    Date.now(),
    data,
  ]);
}
export async function savePolicy(policy: ModelPolicy, actor: string) {
  // API callers cannot inject official measurements or task qualification.
  const p = policySchema.parse(policy);
  if (p.quotaSource === 'official-api')
    throw new PoolError(
      'unavailable',
      'official quota data is written by a verified quota adapter',
    );
  await withPoolTransaction(async (c) => {
    await c.query(
      'INSERT INTO training_model_policies VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data',
      [modelKey(p), p],
    );
    await c.query('INSERT INTO training_model_audit VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      actor,
      'policy-updated',
      Date.now(),
      { key: modelKey(p), policy: p },
    ]);

    await c.query('DELETE FROM training_model_control WHERE id=$1', [`failure:${modelKey(p)}`]);
  });
}
export async function saveCatalog(catalog: Catalog) {
  const pool = await poolDatabase();
  await pool.query(
    'INSERT INTO training_model_catalogs VALUES($1,$2) ON CONFLICT(provider) DO UPDATE SET data=EXCLUDED.data',
    [catalog.provider, catalog],
  );
}
export async function saveQualification(q: Qualification) {
  const pool = await poolDatabase();
  await pool.query(
    'INSERT INTO training_model_qualifications VALUES($1,$2,$3) ON CONFLICT(key,task) DO UPDATE SET data=EXCLUDED.data',
    [q.key, q.task, q],
  );
}
export async function saveRouting(routing: RoutingSettings, actor: string) {
  const state = await readPoolState();
  for (const task of ['roleplay', 'evaluation'] as const) {
    if (!routing[task]) continue;
    const p = state.policies.find((p) => modelKey(p) === routing[task]);
    if (
      !p ||
      p.provider === 'nvidia' ||
      !eligible(
        p,
        task,
        state.qualifications.find((q) => q.key === modelKey(p) && q.task === task),
        Date.now(),
      )
    )
      throw new PoolError('unavailable', 'route requires a qualified eligible free model');
  }
  const pool = await poolDatabase();
  await pool.query(
    "INSERT INTO training_model_control VALUES('routing',$1) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data",
    [routing],
  );
  await audit(actor, 'routing-updated', { ...routing });
}

export async function withModelLease<T>(key: string, body: () => Promise<T>): Promise<T> {
  const pool = await poolDatabase();
  const token = randomUUID();
  const r = await pool.query(
    'INSERT INTO training_model_leases VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET token=EXCLUDED.token,expires_at=EXCLUDED.expires_at WHERE training_model_leases.expires_at<$4 RETURNING key',
    [key, token, Date.now() + 15 * 60000, Date.now()],
  );
  if (!r.rowCount) throw new PoolError('busy');
  try {
    return await body();
  } finally {
    await pool.query('DELETE FROM training_model_leases WHERE key=$1 AND token=$2', [key, token]);
  }
}

export async function reserveCall(
  policy: ModelPolicy,
  task: ModelTask,
  trainingId: string | null,
  tokens: number,
  purpose: CallRecord['purpose'],
): Promise<CallRecord | null> {
  return withPoolTransaction(async (c) => {
    const now = Date.now();
    const key = modelKey(policy);
    const persisted = await c.query('SELECT data FROM training_model_policies WHERE key=$1', [key]);
    if (!persisted.rowCount) return null;
    let p = policySchema.parse(persisted.rows[0].data);
    if (
      JSON.stringify(p) !== JSON.stringify(policy) ||
      !p.enabled ||
      !p.tasks.includes(task) ||
      !p.privacyReviewed ||
      !freeEligible(p, now)
    )
      return null;
    p = budgetForWindow(p, now);
    const cat = await c.query('SELECT data FROM training_model_catalogs WHERE provider=$1', [
      p.provider,
    ]);
    const catalog = cat.rows[0]?.data as Catalog | undefined;
    const documentedFlash = p.provider === 'glm' && p.modelId === 'glm-4.7-flash';
    if (
      !catalog ||
      catalog.httpStatus !== 200 ||
      now - catalog.checkedAt > 86400000 ||
      (!catalog.models.includes(p.modelId) && !documentedFlash)
    )
      return null;
    if (purpose === 'training') {
      const qr = await c.query(
        'SELECT data FROM training_model_qualifications WHERE key=$1 AND task=$2',
        [key, task],
      );
      if (!eligible(p, task, qr.rows[0]?.data, now)) return null;
    }
    const blocked = await c.query('SELECT data FROM training_model_control WHERE id=$1', [
      `failure:${key}`,
    ]);
    const failure = blocked.rows[0]?.data as Failure | undefined;
    if (failure && (failure.retryAt === null || failure.retryAt > now)) return null;
    const since = Math.min(now - 86400000, p.observedAt ?? now);
    const rows = await c.query(
      'SELECT data FROM training_model_calls WHERE provider=$1 AND started_at>=$2',
      [p.provider, since],
    );
    const calls = rows.rows.map((r) => r.data as CallRecord);
    const day = new Date(now).setUTCHours(0, 0, 0, 0);
    const recent = calls.filter((r) => r.startedAt > now - 60000);
    const active = calls.filter((r) => r.status === 'reserved' && r.startedAt > now - 180000);
    if (
      recent.length >= p.rpm ||
      calls.filter((r) => r.startedAt >= day).length >= p.rpd ||
      active.length >= p.concurrency ||
      recent.reduce((n, r) => n + r.reservedTokens, 0) + tokens > p.tpm
    )
      return null;
    const usd =
      (tokens * p.inputUsdPerMillion! + p.maxOutputTokens * (p.outputUsdPerMillion ?? 0)) / 1000000;
    // tokens includes the output cap and therefore over-reserves input cost.
    const units =
      p.quotaUnit === 'requests'
        ? 1
        : p.quotaUnit === 'tokens'
          ? tokens
          : (p.reservePerCall ?? Infinity);
    if (p.provider === 'cloudflare') {
      const rates = p.modelId === '@cf/meta/llama-3.2-1b-instruct' ? [2457, 18252] : [4625, 30475];
      const bound =
        ((tokens - p.maxOutputTokens) * rates[0] + p.maxOutputTokens * rates[1]) / 1000000;
      if (!Number.isFinite(units) || units < bound) return null;
    }
    if (
      p.provider === 'nvidia' &&
      (usd > p.perCallBudgetUsd ||
        calls.filter((r) => r.startedAt >= day).reduce((n, r) => n + r.reservedUsd, 0) + usd >
          p.dailyBudgetUsd)
    )
      return null;
    if (
      (p.free !== 'zero-price' || (p.quotaScope === 'local-budget' && p.remaining !== null)) &&
      p.provider !== 'nvidia'
    ) {
      const consumed = calls
        .filter((r) => r.startedAt >= (p.observedAt ?? now))
        .reduce((n, r) => n + r.reservedUnits, 0);
      if (p.remaining === null || !Number.isFinite(units) || consumed + units > p.remaining)
        return null;
    }
    const record: CallRecord = {
      id: randomUUID(),
      key,
      task,
      trainingId,
      startedAt: now,
      durationMs: 0,
      status: 'reserved',
      kind: null,
      httpStatus: null,
      inputTokens: null,
      outputTokens: null,
      reservedTokens: tokens,
      reservedUnits: Number.isFinite(units) ? units : 0,
      reservedUsd: p.provider === 'nvidia' ? usd : 0,
      purpose,
      jsonValid: null,
      ttftMs: null,
    };
    await c.query('INSERT INTO training_model_calls VALUES($1,$2,$3,$4)', [
      record.id,
      p.provider,
      now,
      record,
    ]);
    return record;
  });
}

export async function finishCall(record: CallRecord, failure?: Failure) {
  await withPoolTransaction(async (c) => {
    await c.query('UPDATE training_model_calls SET data=$2 WHERE id=$1', [record.id, record]);
    if (failure && !failure.terminal)
      await c.query(
        'INSERT INTO training_model_control VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',
        [`failure:${record.key}`, failure],
      );
    else if (!failure)
      await c.query('DELETE FROM training_model_control WHERE id=$1', [`failure:${record.key}`]);
  });
}

export async function poolOverview() {
  const state = await readPoolState();
  const pool = await poolDatabase();
  const now = Date.now();
  const rows = await pool.query(
    'SELECT data FROM training_model_calls ORDER BY started_at DESC LIMIT 1000',
  );
  const calls = rows.rows.map((r) => r.data as CallRecord);
  const controls = await pool.query(
    "SELECT id,data FROM training_model_control WHERE id LIKE 'failure:%'",
  );
  const auditRows = await pool.query(
    'SELECT actor,action,created_at AS "createdAt",data FROM training_model_audit ORDER BY created_at DESC LIMIT 100',
  );
  const metrics = await Promise.all(
    state.policies.map(async (raw) => {
      const p = budgetForWindow(raw, now);
      const key = modelKey(p);
      const own = calls.filter((c) => c.key === key);
      const completed = own.filter((c) => c.status !== 'reserved');
      const successes = completed.filter((c) => c.status === 'success');
      const duration = successes.map((c) => c.durationMs);
      const usedRows = await pool.query(
        "SELECT coalesce(sum((data->>'reservedUnits')::double precision),0) AS used FROM training_model_calls WHERE provider=$1 AND started_at>=$2",
        [p.provider, p.observedAt ?? now],
      );
      const used = Number(usedRows.rows[0].used);
      const todayRows = await pool.query(
        "SELECT count(*) AS requests,sum((data->>'inputTokens')::double precision) AS input,sum((data->>'outputTokens')::double precision) AS output,count(*) FILTER(WHERE data->>'inputTokens' IS NULL OR data->>'outputTokens' IS NULL) AS unknown FROM training_model_calls WHERE data->>'key'=$1 AND started_at>=$2",
        [key, new Date(now).setUTCHours(0, 0, 0, 0)],
      );
      const dayStats = todayRows.rows[0];
      const cooldown = controls.rows.find((r) => r.id === `failure:${key}`)?.data as
        | Failure
        | undefined;
      return {
        key,
        sampleSize: completed.length,
        successes: successes.length,
        failures: completed.length - successes.length,
        successRate: completed.length ? successes.length / completed.length : null,
        averageMs: duration.length ? duration.reduce((a, b) => a + b, 0) / duration.length : null,
        p50Ms: percentile(duration, 0.5),
        p95Ms: percentile(duration, 0.95),
        ttftMs: null,
        jsonRate: completed.filter((c) => c.jsonValid !== null).length
          ? completed.filter((c) => c.jsonValid === true).length /
            completed.filter((c) => c.jsonValid !== null).length
          : null,
        requestsToday: Number(dayStats.requests),
        inputTokens: Number(dayStats.unknown) ? null : Number(dayStats.input ?? 0),
        outputTokens: Number(dayStats.unknown) ? null : Number(dayStats.output ?? 0),
        cooldown,
        remainingEstimate: p.remaining === null ? null : Math.max(0, p.remaining - used),
        usedEstimate: used,
        estimateSource: 'local-estimate',
        lastCall: own[0] ?? null,
        alerts: [
          ...(p.expiresAt && p.expiresAt > now && p.expiresAt < now + 86400000
            ? ['expiringSoon']
            : []),
          ...(p.provider === 'google' &&
          own.some(
            (c) => c.task === 'roleplay' && c.status === 'success' && c.purpose === 'training',
          )
            ? ['geminiTakeover']
            : []),
          ...(!p.enabled ? ['paused'] : []),
          ...(!freeEligible(p, now) ? ['quota-or-authorization-unverified'] : []),
          ...(p.remaining !== null &&
          p.total &&
          ((p.remaining - used) / p.total) * 100 <= p.warningPercent
            ? ['low-quota']
            : []),
          ...(p.expiresAt && p.expiresAt <= now ? ['expired'] : []),
          ...(p.provider === 'nvidia' && !p.nvidiaAuthorized
            ? ['nvidia-authorization-required']
            : []),
        ],
      };
    }),
  );
  return {
    ...state,
    policies: state.policies.map((p) => budgetForWindow(p, now)),
    calls,
    metrics,
    failures: controls.rows,
    audit: auditRows.rows,
    metricsWindow: {
      lastCalls: 1000,
      source: 'real',
      note: 'Bounded recent sample; no provider balance inference.',
    },
  };
}
