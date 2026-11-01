/** Read queue metadata before a Worker host suspends its process timers. */
export interface BackgroundQueueDatabase {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}

const QUEUES = {
  generation_runs: "state NOT IN ('completed', 'ended')",
  agent_sessions: "deleted_at IS NULL AND status IN ('queued', 'running')",
  agent_session_materials: "extraction_status IN ('pending', 'running')",
  owner_material:
    "deleted_at IS NULL AND extraction->>'status' IN ('pending', 'running', 'extracting')",
} as const;

export async function hasPendingBackgroundWork(
  database: BackgroundQueueDatabase,
): Promise<boolean> {
  // Some deployments have never enabled the agent runtime. Missing lazy tables
  // contain no queued work; other schema/database failures must reach the host.
  const tables = await database.query(
    `SELECT ${Object.keys(QUEUES)
      .map((name) => `to_regclass('public.${name}') AS ${name}`)
      .join(', ')}`,
  );
  const row = tables.rows[0];
  if (!row) throw new Error('Background queue metadata is unavailable');
  const checks = Object.entries(QUEUES)
    .filter(([name]) => row[name] !== null && row[name] !== undefined)
    .map(([name, predicate]) => `EXISTS (SELECT 1 FROM public.${name} WHERE ${predicate})`);
  if (checks.length === 0) return false;
  const result = await database.query(`SELECT (${checks.join(' OR ')}) AS pending`);
  const pending = result.rows[0]?.pending;
  if (typeof pending !== 'boolean') throw new Error('Background queue result is invalid');
  // Waiting/paused generation runs still own asset roots and keep-alives.
  return pending;
}
