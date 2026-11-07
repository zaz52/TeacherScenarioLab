/**
 * TeacherScenarioLab — PostgreSQL training store.
 *
 * Owns the `training` migration set (baseline v1, scenarios v2) and the
 * PgTrainingStore class. Conventions mirror the document backend
 * (`document/pg.ts`):
 * TEXT ids, DOUBLE PRECISION epoch-millisecond timestamps, JSONB payloads,
 * idempotent DDL guarded by IF NOT EXISTS, and a store constructed over a
 * Queryable plus a withTransaction hook that pins a fresh connection per
 * transaction.
 *
 * Layering note: the record types below are deliberately defined here,
 * not imported from `@/lib/training`. This package must stay independent
 * of app code (its only cross-package dependency is `@openmaic/dsl`).
 * The shapes are structurally identical to the app-domain types in
 * `lib/training/training.ts`; the task-2 service maps between them.
 *
 * Owner scoping (P1): a store bound with `ownerId` only ever reads or
 * writes that owner's trainings. Reads of a foreign training behave as
 * not-found (no existence oracle); writes to a foreign or missing training
 * throw TrainingNotFoundError (same error for both cases, no oracle).
 * An unbound store lists trainings only with explicit
 * `includeAllOwners: true` — admin-only construction, enforced at the
 * call site, never in a user route.
 */

import { applySchemaMigrations, type SchemaMigrationSet } from '../pg-migrations.js';
import type { Queryable, WithTransaction } from '../runtime/pg.js';

export type { QueryResult, Queryable, WithTransaction } from '../runtime/pg.js';

export interface TrainingRecord {
  id: string;
  ownerId: string;
  scenarioId: string;
  scenarioVersion: number;
  state: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface TrainingMessageRecord {
  id: string;
  trainingId: string;
  characterId: string | null;
  role: string;
  content: string;
  idempotencyKey: string | null;
  createdAt: number;
  supersededBy: string | null;
}

export interface TrainingEventRecord {
  id: string;
  trainingId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface TrainingSnapshotRecord {
  id: string;
  trainingId: string;
  data: Record<string, unknown>;
  createdAt: number;
}

/**
 * A training account: an `acct:<uuid>` owner with a display name and roles.
 * Accounts are platform-level rows (like scenarios): account methods ignore
 * any owner binding, because the session token — not the request owner —
 * proves which account a caller speaks for.
 */
export interface TrainingAccountRecord {
  accountId: string;
  displayName: string;
  roles: string[];
  createdAt: number;
}

/**
 * One login session: the SHA-256 hex of a random token (the raw token is
 * never stored), its account, and its expiry. Expired sessions authenticate
 * as invalid, never as anonymous.
 */
export interface TrainingSessionRecord {
  tokenHash: string;
  accountId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * A frozen scenario version, stored as one JSON document. The `data`
 * payload is the full ScenarioVersion (same shape the app domain validates
 * in `lib/training/scenario.ts`); `publishedAt` is mirrored as a column so
 * published/draft filtering never has to scan JSONB. Scenarios are platform
 * content, not owner data: scenario methods ignore any owner binding.
 */
export interface ScenarioVersionRecord {
  scenarioId: string;
  version: number;
  title: string;
  setting: string;
  goal: string;
  rules: string[];
  learnerRole: string;
  characters: ScenarioCharacterRecord[];
  facts: ScenarioFactRecord[];
  disclosureConditions: Record<string, DisclosureConditionRecord>;
  publishedAt: number | null;
}

export interface ScenarioCharacterRecord {
  id: string;
  name: string;
  role: 'student' | 'parent' | 'teacher' | 'principal' | 'other';
}

export interface ScenarioFactRecord {
  id: string;
  content: string;
  category: string;
  visibility: 'public' | 'character-private' | 'hidden';
  ownerCharacterId?: string;
  disclosureConditionId?: string;
}

export type DisclosureConditionRecord =
  | { type: 'userAskedAbout'; topic: string }
  | { type: 'eventOccurred'; event: string }
  | { type: 'stateReached'; state: string };

export interface PgTrainingStoreOptions {
  withTransaction: WithTransaction;
  /** When set, the store is bound to this owner (see header). */
  ownerId?: string;
}

export class TrainingNotFoundError extends Error {
  constructor(trainingId: string) {
    super(`@openmaic/storage: training ${trainingId} was not found`);
    this.name = 'TrainingNotFoundError';
  }
}

/** A session names an account id that has no row. */
export class TrainingAccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`@openmaic/storage: training account ${accountId} was not found`);
    this.name = 'TrainingAccountNotFoundError';
  }
}

/** A published scenario version is frozen: it can never be overwritten. */
export class TrainingScenarioFrozenError extends Error {
  constructor(scenarioId: string, version: number) {
    super(`@openmaic/storage: scenario ${scenarioId} version ${version} is published and frozen`);
    this.name = 'TrainingScenarioFrozenError';
  }
}

/** Baseline (version 1) of the training schema. */
const TRAINING_PG_BASELINE = `
CREATE TABLE IF NOT EXISTS trainings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  scenario_version INTEGER NOT NULL,
  state TEXT NOT NULL,
  created_at DOUBLE PRECISION NOT NULL,
  updated_at DOUBLE PRECISION NOT NULL,
  completed_at DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS trainings_owner_updated_idx
  ON trainings (owner_id, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS training_messages (
  id TEXT PRIMARY KEY,
  training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  character_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  idempotency_key TEXT,
  created_at DOUBLE PRECISION NOT NULL,
  superseded_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS training_messages_idempotency_uidx
  ON training_messages (training_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS training_messages_training_created_idx
  ON training_messages (training_id, created_at, id);

CREATE TABLE IF NOT EXISTS training_events (
  id TEXT PRIMARY KEY,
  training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS training_events_training_created_idx
  ON training_events (training_id, created_at, id);

CREATE TABLE IF NOT EXISTS training_snapshots (
  id TEXT PRIMARY KEY,
  training_id TEXT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS training_snapshots_training_created_idx
  ON training_snapshots (training_id, created_at, id);
`;

/** Scenario versions (v2): one row per frozen version, JSONB payload. */
const TRAINING_PG_SCENARIOS = `
CREATE TABLE IF NOT EXISTS training_scenarios (
  scenario_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  published_at DOUBLE PRECISION,
  PRIMARY KEY (scenario_id, version)
);

CREATE INDEX IF NOT EXISTS training_scenarios_scenario_idx
  ON training_scenarios (scenario_id, version);
`;

/** Evaluations (v3): one row per training, latest evaluation wins. */
const TRAINING_PG_EVALUATIONS = `
CREATE TABLE IF NOT EXISTS training_evaluations (
  training_id TEXT PRIMARY KEY REFERENCES trainings(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at DOUBLE PRECISION NOT NULL,
  updated_at DOUBLE PRECISION NOT NULL
);
`;

/** Accounts and sessions (v4): the training account system. */
const TRAINING_PG_ACCOUNTS = `
CREATE TABLE IF NOT EXISTS training_accounts (
  account_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  created_at DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS training_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES training_accounts(account_id) ON DELETE CASCADE,
  created_at DOUBLE PRECISION NOT NULL,
  expires_at DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS training_sessions_account_idx
  ON training_sessions (account_id, expires_at);
`;

/** The training backend's migrations, recorded under the store `training`. */
export const TRAINING_PG_MIGRATIONS: SchemaMigrationSet = {
  store: 'training',
  migrations: [
    { version: 1, name: 'baseline', up: TRAINING_PG_BASELINE, transaction: false },
    { version: 2, name: 'scenarios', up: TRAINING_PG_SCENARIOS, transaction: true },
    { version: 3, name: 'evaluations', up: TRAINING_PG_EVALUATIONS, transaction: true },
    { version: 4, name: 'accounts', up: TRAINING_PG_ACCOUNTS, transaction: true },
  ],
};

/** Pinned schema: every training migration's SQL, in order. */
export const TRAINING_PG_SCHEMA = TRAINING_PG_MIGRATIONS.migrations
  .map((migration) => migration.up)
  .join('');

/**
 * Create the training tables, or bring an existing database up to date.
 * Safe to call on every start; a schema change is a new migration.
 */
export async function ensureTrainingSchema(queryable: Queryable): Promise<void> {
  await applySchemaMigrations(queryable, TRAINING_PG_MIGRATIONS);
}

// Row shapes are `type` aliases (not interfaces) so they satisfy
// Queryable's `Record<string, unknown>` row constraint, matching the
// document backend's inline row types.
type TrainingRow = {
  id: string;
  owner_id: string;
  scenario_id: string;
  scenario_version: number;
  state: string;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
};

type TrainingMessageRow = {
  id: string;
  training_id: string;
  character_id: string | null;
  role: string;
  content: string;
  idempotency_key: string | null;
  created_at: number;
  superseded_by: string | null;
};

type TrainingEventRow = {
  id: string;
  training_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: number;
};

type TrainingSnapshotRow = {
  id: string;
  training_id: string;
  data: Record<string, unknown>;
  created_at: number;
};

function mapTrainingRow(row: TrainingRow): TrainingRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    scenarioId: row.scenario_id,
    scenarioVersion: row.scenario_version,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function mapMessageRow(row: TrainingMessageRow): TrainingMessageRecord {
  return {
    id: row.id,
    trainingId: row.training_id,
    characterId: row.character_id,
    role: row.role,
    content: row.content,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    supersededBy: row.superseded_by,
  };
}

function mapEventRow(row: TrainingEventRow): TrainingEventRecord {
  return {
    id: row.id,
    trainingId: row.training_id,
    type: row.type,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function mapSnapshotRow(row: TrainingSnapshotRow): TrainingSnapshotRecord {
  return {
    id: row.id,
    trainingId: row.training_id,
    data: row.data,
    createdAt: row.created_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505'
  );
}

export class PgTrainingStore {
  private readonly queryable: Queryable;
  private readonly transactionHook: WithTransaction;
  private readonly ownerId: string | null;

  constructor(queryable: Queryable, options: PgTrainingStoreOptions) {
    if (typeof options?.withTransaction !== 'function') {
      throw new Error(
        '@openmaic/storage: withTransaction is required and must pin a fresh connection and ' +
          'transaction for every call; reusing a shared client lets concurrent transactions ' +
          'interleave',
      );
    }
    this.queryable = queryable;
    this.transactionHook = options.withTransaction;
    this.ownerId = options.ownerId ?? null;
  }

  /** Bind this store to one trusted owner. */
  forOwner(ownerId: string): PgTrainingStore {
    return new PgTrainingStore(this.queryable, {
      withTransaction: this.transactionHook,
      ownerId,
    });
  }

  /** Run `body` with a store pinned to one transaction's connection. */
  async withTransaction<T>(body: (store: PgTrainingStore) => Promise<T>): Promise<T> {
    return this.transactionHook(async (queryable) => {
      const store = new PgTrainingStore(queryable, {
        withTransaction: this.transactionHook,
        ...(this.ownerId === null ? {} : { ownerId: this.ownerId }),
      });
      return body(store);
    });
  }

  private async loadTrainingRow(trainingId: string): Promise<TrainingRow | null> {
    const result = await this.queryable.query<TrainingRow>(
      `SELECT id, owner_id, scenario_id, scenario_version, state,
              created_at, updated_at, completed_at
         FROM trainings WHERE id = $1`,
      [trainingId],
    );
    const row = result.rows[0] ?? null;
    if (row && this.ownerId !== null && row.owner_id !== this.ownerId) {
      return null;
    }
    return row;
  }

  async createTraining(input: {
    id: string;
    ownerId: string;
    scenarioId: string;
    scenarioVersion: number;
    state: string;
    now: number;
  }): Promise<TrainingRecord> {
    if (this.ownerId !== null && input.ownerId !== this.ownerId) {
      throw new TrainingNotFoundError(input.id);
    }
    const result = await this.queryable.query<TrainingRow>(
      `INSERT INTO trainings
         (id, owner_id, scenario_id, scenario_version, state, created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6, NULL)
       RETURNING id, owner_id, scenario_id, scenario_version, state,
                 created_at, updated_at, completed_at`,
      [input.id, input.ownerId, input.scenarioId, input.scenarioVersion, input.state, input.now],
    );
    const row = result.rows[0];
    if (!row) throw new TrainingNotFoundError(input.id);
    return mapTrainingRow(row);
  }

  async getTraining(trainingId: string): Promise<TrainingRecord | null> {
    const row = await this.loadTrainingRow(trainingId);
    return row ? mapTrainingRow(row) : null;
  }

  async listTrainings(options?: { includeAllOwners?: boolean }): Promise<TrainingRecord[]> {
    if (this.ownerId !== null) {
      const result = await this.queryable.query<TrainingRow>(
        `SELECT id, owner_id, scenario_id, scenario_version, state,
                created_at, updated_at, completed_at
           FROM trainings WHERE owner_id = $1
          ORDER BY updated_at DESC, id`,
        [this.ownerId],
      );
      return result.rows.map(mapTrainingRow);
    }
    if (options?.includeAllOwners !== true) {
      throw new Error(
        '@openmaic/storage: PgTrainingStore without ownerId requires ' +
          'includeAllOwners: true to list trainings',
      );
    }
    const result = await this.queryable.query<TrainingRow>(
      `SELECT id, owner_id, scenario_id, scenario_version, state,
              created_at, updated_at, completed_at
         FROM trainings ORDER BY updated_at DESC, id`,
    );
    return result.rows.map(mapTrainingRow);
  }

  /**
   * Compare-and-swap state transition. Returns true only if exactly one
   * row moved from `from` to `to` (concurrent writers lose, they do not
   * overwrite). `completed_at` is set when entering `completed`.
   */
  async transitionState(
    trainingId: string,
    from: string,
    to: string,
    now: number,
  ): Promise<boolean> {
    const params: unknown[] = [to, now, trainingId, from];
    let sql = `UPDATE trainings
                  SET state = $1, updated_at = $2,
                      completed_at = CASE WHEN $1 = 'completed' THEN $2 ELSE completed_at END
                WHERE id = $3 AND state = $4`;
    if (this.ownerId !== null) {
      sql += ` AND owner_id = $5`;
      params.push(this.ownerId);
    }
    sql += ` RETURNING id`;
    const result = await this.queryable.query<{ id: string }>(sql, params);
    return result.rows.length === 1;
  }

  /**
   * Append a message. When `idempotencyKey` is set, a second submission
   * with the same key returns the first message with `deduped: true`
   * instead of inserting a duplicate (pre-check plus unique-index catch
   * for concurrent duplicates).
   */
  async appendMessage(input: {
    id: string;
    trainingId: string;
    characterId: string | null;
    role: string;
    content: string;
    idempotencyKey: string | null;
    createdAt: number;
  }): Promise<{ message: TrainingMessageRecord; deduped: boolean }> {
    const training = await this.loadTrainingRow(input.trainingId);
    if (!training) throw new TrainingNotFoundError(input.trainingId);
    if (input.idempotencyKey) {
      const existing = await this.queryable.query<TrainingMessageRow>(
        `SELECT id, training_id, character_id, role, content,
                idempotency_key, created_at, superseded_by
           FROM training_messages
          WHERE training_id = $1 AND idempotency_key = $2`,
        [input.trainingId, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        return { message: mapMessageRow(existing.rows[0]), deduped: true };
      }
    }
    try {
      const result = await this.queryable.query<TrainingMessageRow>(
        `INSERT INTO training_messages
           (id, training_id, character_id, role, content, idempotency_key, created_at, superseded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
         RETURNING id, training_id, character_id, role, content,
                   idempotency_key, created_at, superseded_by`,
        [
          input.id,
          input.trainingId,
          input.characterId,
          input.role,
          input.content,
          input.idempotencyKey,
          input.createdAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new TrainingNotFoundError(input.trainingId);
      return { message: mapMessageRow(row), deduped: false };
    } catch (error) {
      if (isUniqueViolation(error) && input.idempotencyKey) {
        const existing = await this.queryable.query<TrainingMessageRow>(
          `SELECT id, training_id, character_id, role, content,
                  idempotency_key, created_at, superseded_by
             FROM training_messages
            WHERE training_id = $1 AND idempotency_key = $2`,
          [input.trainingId, input.idempotencyKey],
        );
        if (existing.rows[0]) {
          return { message: mapMessageRow(existing.rows[0]), deduped: true };
        }
      }
      throw error;
    }
  }

  /** Mark a message superseded by a newer message (edit = new message + mark). */
  async markSuperseded(
    trainingId: string,
    messageId: string,
    supersededBy: string,
  ): Promise<boolean> {
    const training = await this.loadTrainingRow(trainingId);
    if (!training) throw new TrainingNotFoundError(trainingId);
    const result = await this.queryable.query<{ id: string }>(
      `UPDATE training_messages SET superseded_by = $1
        WHERE id = $2 AND training_id = $3 AND superseded_by IS NULL
        RETURNING id`,
      [supersededBy, messageId, trainingId],
    );
    return result.rows.length === 1;
  }

  async listMessages(
    trainingId: string,
    options?: { includeSuperseded?: boolean },
  ): Promise<TrainingMessageRecord[]> {
    const training = await this.loadTrainingRow(trainingId);
    if (!training) return [];
    const sql =
      options?.includeSuperseded === true
        ? `SELECT id, training_id, character_id, role, content,
                  idempotency_key, created_at, superseded_by
             FROM training_messages WHERE training_id = $1
            ORDER BY created_at, id`
        : `SELECT id, training_id, character_id, role, content,
                  idempotency_key, created_at, superseded_by
             FROM training_messages
            WHERE training_id = $1 AND superseded_by IS NULL
            ORDER BY created_at, id`;
    const result = await this.queryable.query<TrainingMessageRow>(sql, [trainingId]);
    return result.rows.map(mapMessageRow);
  }

  async appendEvent(input: {
    id: string;
    trainingId: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: number;
  }): Promise<TrainingEventRecord> {
    const training = await this.loadTrainingRow(input.trainingId);
    if (!training) throw new TrainingNotFoundError(input.trainingId);
    const result = await this.queryable.query<TrainingEventRow>(
      `INSERT INTO training_events (id, training_id, type, payload, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, training_id, type, payload, created_at`,
      [input.id, input.trainingId, input.type, input.payload, input.createdAt],
    );
    const row = result.rows[0];
    if (!row) throw new TrainingNotFoundError(input.trainingId);
    return mapEventRow(row);
  }

  async listEvents(trainingId: string): Promise<TrainingEventRecord[]> {
    const training = await this.loadTrainingRow(trainingId);
    if (!training) return [];
    const result = await this.queryable.query<TrainingEventRow>(
      `SELECT id, training_id, type, payload, created_at
         FROM training_events WHERE training_id = $1
        ORDER BY created_at, id`,
      [trainingId],
    );
    return result.rows.map(mapEventRow);
  }

  async saveSnapshot(input: {
    id: string;
    trainingId: string;
    data: Record<string, unknown>;
    createdAt: number;
  }): Promise<TrainingSnapshotRecord> {
    const training = await this.loadTrainingRow(input.trainingId);
    if (!training) throw new TrainingNotFoundError(input.trainingId);
    const result = await this.queryable.query<TrainingSnapshotRow>(
      `INSERT INTO training_snapshots (id, training_id, data, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, training_id, data, created_at`,
      [input.id, input.trainingId, input.data, input.createdAt],
    );
    const row = result.rows[0];
    if (!row) throw new TrainingNotFoundError(input.trainingId);
    return mapSnapshotRow(row);
  }

  async getSnapshot(snapshotId: string): Promise<TrainingSnapshotRecord | null> {
    const params: unknown[] = [snapshotId];
    let sql = `SELECT s.id, s.training_id, s.data, s.created_at
                 FROM training_snapshots s
                 JOIN trainings t ON t.id = s.training_id
                WHERE s.id = $1`;
    if (this.ownerId !== null) {
      sql += ` AND t.owner_id = $2`;
      params.push(this.ownerId);
    }
    const result = await this.queryable.query<TrainingSnapshotRow>(sql, params);
    return result.rows[0] ? mapSnapshotRow(result.rows[0]) : null;
  }

  async listSnapshots(trainingId: string): Promise<TrainingSnapshotRecord[]> {
    const training = await this.loadTrainingRow(trainingId);
    if (!training) return [];
    const result = await this.queryable.query<TrainingSnapshotRow>(
      `SELECT id, training_id, data, created_at
         FROM training_snapshots WHERE training_id = $1
        ORDER BY created_at, id`,
      [trainingId],
    );
    return result.rows.map(mapSnapshotRow);
  }

  /**
   * Scenario versions are platform content, not owner data: these methods
   * ignore any owner binding. A published version is frozen — saving over
   * it throws TrainingScenarioFrozenError, enforced both by a pre-check and
   * by the upsert's WHERE clause so concurrent publishes cannot slip past.
   */
  async saveScenarioVersion(record: ScenarioVersionRecord): Promise<ScenarioVersionRecord> {
    const existing = await this.getScenarioVersion(record.scenarioId, record.version);
    if (existing && existing.publishedAt !== null) {
      throw new TrainingScenarioFrozenError(record.scenarioId, record.version);
    }
    const result = await this.queryable.query<TrainingScenarioRow>(
      `INSERT INTO training_scenarios (scenario_id, version, data, published_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (scenario_id, version) DO UPDATE
         SET data = EXCLUDED.data, published_at = EXCLUDED.published_at
         WHERE training_scenarios.published_at IS NULL
       RETURNING scenario_id, version, data, published_at`,
      [record.scenarioId, record.version, record, record.publishedAt],
    );
    if (result.rows[0]) return mapScenarioRow(result.rows[0]);
    const raced = await this.getScenarioVersion(record.scenarioId, record.version);
    if (raced && raced.publishedAt !== null) {
      throw new TrainingScenarioFrozenError(record.scenarioId, record.version);
    }
    throw new Error(
      `@openmaic/storage: could not save scenario ${record.scenarioId} version ${record.version}`,
    );
  }

  async getScenarioVersion(
    scenarioId: string,
    version: number,
  ): Promise<ScenarioVersionRecord | null> {
    const result = await this.queryable.query<TrainingScenarioRow>(
      `SELECT scenario_id, version, data, published_at
         FROM training_scenarios WHERE scenario_id = $1 AND version = $2`,
      [scenarioId, version],
    );
    return result.rows[0] ? mapScenarioRow(result.rows[0]) : null;
  }

  async listScenarioVersions(scenarioId: string): Promise<ScenarioVersionRecord[]> {
    const result = await this.queryable.query<TrainingScenarioRow>(
      `SELECT scenario_id, version, data, published_at
         FROM training_scenarios WHERE scenario_id = $1
        ORDER BY version ASC`,
      [scenarioId],
    );
    return result.rows.map(mapScenarioRow);
  }

  /**
   * Every scenario version in the library, drafts included, for admin
   * review. Admin-only by construction: the only call site is the admin
   * service, which runs behind the admin role check. Learner routes use
   * {@link getScenarioVersion} and treat drafts as not-found.
   */
  async listAllScenarioVersions(): Promise<ScenarioVersionRecord[]> {
    const result = await this.queryable.query<TrainingScenarioRow>(
      `SELECT scenario_id, version, data, published_at
         FROM training_scenarios
        ORDER BY scenario_id ASC, version ASC`,
    );
    return result.rows.map(mapScenarioRow);
  }

  /**
   * Create a scenario version, and only create it: a single INSERT with
   * no ON CONFLICT fallback, so two concurrent creates for the same
   * (scenarioId, version) cannot overwrite each other — PostgreSQL
   * resolves the PK race and exactly one insert wins. Returns the
   * created row, or null when a row (draft or published) already
   * exists; the service layer maps null to a 409. A unique violation
   * (23505) carries the conflict; the query surface exposes no
   * rowCount, so the RETURNING row carries the success signal.
   */
  async createScenarioVersion(
    record: ScenarioVersionRecord,
  ): Promise<ScenarioVersionRecord | null> {
    try {
      const result = await this.queryable.query<TrainingScenarioRow>(
        `INSERT INTO training_scenarios (scenario_id, version, data, published_at)
         VALUES ($1, $2, $3, $4)
         RETURNING scenario_id, version, data, published_at`,
        [record.scenarioId, record.version, record, record.publishedAt],
      );
      return result.rows[0] ? mapScenarioRow(result.rows[0]) : null;
    } catch (error) {
      if (error instanceof Error && (error as { code?: unknown }).code === '23505') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a draft scenario version. Published versions are never deleted:
   * the WHERE clause only matches drafts, so deleting a published version
   * (or a version that became published concurrently) deletes nothing and
   * returns false; the service layer maps that to a conflict. The query
   * surface exposes no rowCount, so RETURNING carries the signal.
   */
  async deleteScenarioVersion(scenarioId: string, version: number): Promise<boolean> {
    const result = await this.queryable.query<{ scenario_id: string }>(
      `DELETE FROM training_scenarios
        WHERE scenario_id = $1 AND version = $2 AND published_at IS NULL
        RETURNING scenario_id`,
      [scenarioId, version],
    );
    return result.rows.length > 0;
  }

  /**
   * Evaluations are owner data: the upsert only fires when the training
   * belongs to the bound owner (or when unbound), and reads join trainings
   * for the same check. The service layer loads the training first, so a
   * failed upsert here surfaces as TrainingNotFoundError, never as a
   * silent no-op.
   */
  async saveEvaluation(record: TrainingEvaluationRecord): Promise<TrainingEvaluationRecord> {
    const ownerClause = this.ownerId !== null ? ` AND t.owner_id = $5` : '';
    const params: unknown[] = [
      record.trainingId,
      record,
      record.createdAt,
      record.createdAt,
      ...(this.ownerId !== null ? [this.ownerId] : []),
    ];
    const result = await this.queryable.query<TrainingEvaluationRow>(
      `INSERT INTO training_evaluations (training_id, data, created_at, updated_at)
       SELECT $1, $2, $3, $4 FROM trainings t WHERE t.id = $1${ownerClause}
       ON CONFLICT (training_id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
       RETURNING training_id, data, created_at, updated_at`,
      params,
    );
    if (result.rows[0]) return mapEvaluationRow(result.rows[0]);
    throw new TrainingNotFoundError(record.trainingId);
  }

  async getEvaluation(trainingId: string): Promise<TrainingEvaluationRecord | null> {
    const ownerClause = this.ownerId !== null ? ` AND t.owner_id = $2` : '';
    const params: unknown[] = [trainingId, ...(this.ownerId !== null ? [this.ownerId] : [])];
    const result = await this.queryable.query<TrainingEvaluationRow>(
      `SELECT e.training_id, e.data, e.created_at, e.updated_at
         FROM training_evaluations e
         JOIN trainings t ON t.id = e.training_id
        WHERE e.training_id = $1${ownerClause}`,
      params,
    );
    return result.rows[0] ? mapEvaluationRow(result.rows[0]) : null;
  }

  /**
   * Accounts and sessions are platform-level rows, not owner data: these
   * methods ignore any owner binding. The session token proves the account;
   * the request owner never does. `claimTrainings` is the deliberate
   * exception to owner scoping — it moves rows across owners — so its only
   * call site is the claim route, which validates both sides first.
   */
  async createAccount(record: TrainingAccountRecord): Promise<TrainingAccountRecord> {
    const result = await this.queryable.query<TrainingAccountRow>(
      `INSERT INTO training_accounts (account_id, display_name, roles, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING account_id, display_name, roles, created_at`,
      [record.accountId, record.displayName, record.roles, record.createdAt],
    );
    if (!result.rows[0]) {
      throw new Error(`@openmaic/storage: could not create training account ${record.accountId}`);
    }
    return mapAccountRow(result.rows[0]);
  }

  async getAccount(accountId: string): Promise<TrainingAccountRecord | null> {
    const result = await this.queryable.query<TrainingAccountRow>(
      `SELECT account_id, display_name, roles, created_at
         FROM training_accounts WHERE account_id = $1`,
      [accountId],
    );
    return result.rows[0] ? mapAccountRow(result.rows[0]) : null;
  }

  async createSession(record: TrainingSessionRecord): Promise<TrainingSessionRecord> {
    const account = await this.getAccount(record.accountId);
    if (!account) throw new TrainingAccountNotFoundError(record.accountId);
    const result = await this.queryable.query<TrainingSessionRow>(
      `INSERT INTO training_sessions (token_hash, account_id, created_at, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING token_hash, account_id, created_at, expires_at`,
      [record.tokenHash, record.accountId, record.createdAt, record.expiresAt],
    );
    if (!result.rows[0]) {
      throw new Error(`@openmaic/storage: could not create training session`);
    }
    return mapSessionRow(result.rows[0]);
  }

  async getSessionByTokenHash(
    tokenHash: string,
  ): Promise<{ session: TrainingSessionRecord; account: TrainingAccountRecord } | null> {
    const result = await this.queryable.query<TrainingSessionJoinRow>(
      `SELECT s.token_hash, s.account_id, s.created_at, s.expires_at,
              a.display_name, a.roles, a.created_at AS account_created_at
         FROM training_sessions s
         JOIN training_accounts a ON a.account_id = s.account_id
        WHERE s.token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      session: {
        tokenHash: row.token_hash,
        accountId: row.account_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      },
      account: {
        accountId: row.account_id,
        displayName: row.display_name,
        roles: row.roles,
        createdAt: row.account_created_at,
      },
    };
  }

  async deleteSession(tokenHash: string): Promise<boolean> {
    const result = await this.queryable.query<TrainingSessionRow>(
      `DELETE FROM training_sessions WHERE token_hash = $1 RETURNING token_hash`,
      [tokenHash],
    );
    return result.rows.length > 0;
  }

  /**
   * Move every training of `fromOwnerId` to `toOwnerId` in one statement
   * (messages, events, snapshots and evaluations follow by training id).
   * Returns the number of trainings moved. After the move, the old owner
   * reads those trainings as not-found through the normal owner binding.
   */
  async claimTrainings(fromOwnerId: string, toOwnerId: string): Promise<number> {
    const result = await this.queryable.query<{ id: string }>(
      `UPDATE trainings SET owner_id = $2 WHERE owner_id = $1 RETURNING id`,
      [fromOwnerId, toOwnerId],
    );
    return result.rows.length;
  }
}

type TrainingAccountRow = {
  account_id: string;
  display_name: string;
  roles: string[];
  created_at: number;
};

type TrainingSessionRow = {
  token_hash: string;
  account_id: string;
  created_at: number;
  expires_at: number;
};

type TrainingSessionJoinRow = TrainingSessionRow & {
  display_name: string;
  roles: string[];
  account_created_at: number;
};

function mapAccountRow(row: TrainingAccountRow): TrainingAccountRecord {
  return {
    accountId: row.account_id,
    displayName: row.display_name,
    roles: row.roles,
    createdAt: row.created_at,
  };
}

function mapSessionRow(row: TrainingSessionRow): TrainingSessionRecord {
  return {
    tokenHash: row.token_hash,
    accountId: row.account_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

type TrainingScenarioRow = {
  scenario_id: string;
  version: number;
  data: ScenarioVersionRecord;
  published_at: number | null;
};

export type TrainingEvaluationDimensionRecord = {
  dimension: string;
  score: number;
  evidence: string[];
  comment: string;
};

export type TrainingEvaluationRecord = {
  trainingId: string;
  dimensions: TrainingEvaluationDimensionRecord[];
  summary: string;
  suggestions: string[];
  createdAt: number;
};

type TrainingEvaluationRow = {
  training_id: string;
  data: TrainingEvaluationRecord;
  created_at: number;
  updated_at: number;
};

function mapEvaluationRow(row: TrainingEvaluationRow): TrainingEvaluationRecord {
  return {
    trainingId: row.training_id,
    dimensions: row.data.dimensions,
    summary: row.data.summary,
    suggestions: row.data.suggestions,
    createdAt: row.created_at,
  };
}

function mapScenarioRow(row: TrainingScenarioRow): ScenarioVersionRecord {
  return {
    ...row.data,
    scenarioId: row.scenario_id,
    version: row.version,
    publishedAt: row.published_at,
  };
}
