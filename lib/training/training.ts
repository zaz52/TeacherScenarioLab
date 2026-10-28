/**
 * TeacherScenarioLab — training session entity types.
 *
 * Persistence notes (enforced by the storage module, task 1):
 * - Messages are append-only. Editing produces a new message and marks the
 *   old one `supersededBy`; evaluation citations resolve by `messageId` to
 *   the content as written, so history is never rewritten.
 * - Events are an append-only ledger and the only source of training facts;
 *   progress summaries are derived caches, never the authority.
 * - A snapshot is read-only once written; repeat trainings create a new
 *   training id, never overwrite a snapshot.
 * - Timestamps are epoch milliseconds (DOUBLE PRECISION in Postgres, matching
 *   the storage package's convention).
 */

import type { TrainingState } from './state-machine';

export interface Training {
  id: string;
  ownerId: string;
  scenarioId: string;
  scenarioVersion: number;
  state: TrainingState;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export type TrainingMessageRole = 'user' | 'character' | 'system';

export interface TrainingMessage {
  /** Stable anchor for evaluation citations. */
  id: string;
  trainingId: string;
  /** Null for user and system messages. */
  characterId: string | null;
  role: TrainingMessageRole;
  content: string;
  /** Client-supplied idempotency key for user messages; null for server-generated ones. */
  idempotencyKey: string | null;
  createdAt: number;
  /** Id of the message that replaced this one, or null if current. */
  supersededBy: string | null;
}

export type TrainingEventType =
  | 'training-created'
  | 'message-appended'
  | 'fact-disclosed'
  | 'state-transition'
  | 'proposal-submitted'
  | 'leak-blocked'
  | 'dynamic-event-triggered'
  | 'training-completed';

export interface TrainingEvent {
  id: string;
  trainingId: string;
  type: TrainingEventType;
  /** Structured payload: fact ids, old/new state, proposal id, etc. */
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface TrainingSnapshot {
  id: string;
  trainingId: string;
  training: Training;
  messages: TrainingMessage[];
  events: TrainingEvent[];
  createdAt: number;
}
