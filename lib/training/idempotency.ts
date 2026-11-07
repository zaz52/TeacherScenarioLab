/**
 * TeacherScenarioLab — idempotency helpers (pure).
 *
 * Every user message submission carries a client-generated UUID. The
 * storage layer enforces uniqueness on (training_id, idempotency_key) with
 * a partial unique index (null keys excluded, for server-generated
 * messages), so a retried submission returns the first result instead of
 * double-booking a message or a model call. These helpers only validate
 * and scope keys; enforcement lives in the migration + store.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether `key` is a well-formed UUID (v4 shape not enforced beyond format). */
export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === 'string' && UUID_RE.test(key);
}

/** Scope string used as the dedupe identity for one training. */
export function idempotencyScope(trainingId: string, key: string): string {
  return `${trainingId}:${key}`;
}
