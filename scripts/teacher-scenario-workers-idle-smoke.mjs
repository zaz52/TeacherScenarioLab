import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';

const url = new URL(process.env.DATABASE_URL ?? '');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.pathname, '/teacher_scenario_runtime');
assert.equal(process.env.TEACHERLAB_IDLE_TIMEOUT_MS, '5000');
assert.equal(process.env.TEACHERLAB_HEARTBEAT_MS, '1000');
assert.equal(process.env.TEACHERLAB_MAINTENANCE_INTERVAL_MS, '15000');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const base = 'http://127.0.0.1:8787';
const sentinel = 'teacherlab-isolated-idle-guard';
const log = async () =>
  (await readFile('cloudflare-runtime.log', 'utf8')).replace(/\u001b\[[0-9;]*m/g, '');
const count = (text, event) => text.split(`[TeacherLabHost] ${event}`).length - 1;
async function waitEvent(event, minimum) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (count(await log(), event) >= minimum) return;
    await delay(250);
  }
  assert.fail(`Workers host did not report ${event}`);
}

try {
  await waitEvent('background schedules paused', 1);
  const activity = async () =>
    (
      await pool.query(`
    SELECT max(query_start)::text AS latest FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
      AND backend_type = 'client backend'
  `)
    ).rows[0].latest;
  const before = await activity();
  await delay(3000);
  const after = await activity();
  assert.ok(after === null || after === before, 'Database polling continued after idle suspension');
  await waitEvent('idle maintenance completed', 1);

  await pool.query(
    `INSERT INTO generation_runs (id, owner_id, input, state)
    VALUES ($1, 'worker-idle-fixture', '{}'::jsonb, 'paused')`,
    [sentinel],
  );
  const initialStarts = ((await log()).match(/generation runner .* started \(scan=/g) ?? []).length;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }),
  );
  await waitEvent('background schedules resumed', 1);
  assert.equal(
    ((await log()).match(/generation runner .* started \(scan=/g) ?? []).length,
    initialStarts + 1,
  );
  const gate = await fetch(`${base}/api/access-code/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: process.env.ACCESS_CODE }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(gate.status, 200);
  await gate.arrayBuffer();
  const cookie = gate.headers.getSetCookie().find((value) => value.startsWith('openmaic_access='));
  assert.ok(cookie);
  const starts = ((await log()).match(/generation runner .* started \(scan=/g) ?? []).length;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      const response = await fetch(`${base}/api/training/scenarios`, {
        headers: { cookie: cookie.split(';')[0] },
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }),
  );
  assert.equal(((await log()).match(/generation runner .* started \(scan=/g) ?? []).length, starts);
  const pauses = count(await log(), 'background schedules paused');
  await delay(8000);
  assert.equal(
    count(await log(), 'background schedules paused'),
    pauses,
    'Waiting generation work lost its resource keep-alives',
  );
  const row = await pool.query('SELECT state FROM generation_runs WHERE id = $1', [sentinel]);
  assert.equal(row.rows[0].state, 'paused');
  await pool.query('DELETE FROM generation_runs WHERE id = $1', [sentinel]);
  await waitEvent('background schedules paused', pauses + 1);
  console.log(
    JSON.stringify({
      workerIdleLifecycle: true,
      emptyHostStopsPolling: true,
      maintenanceWhilePaused: true,
      requestsResumeBackground: true,
      waitingGenerationPreserved: true,
      concurrentRequestsDoNotDuplicateRunners: true,
    }),
  );
} finally {
  await pool.query('DELETE FROM generation_runs WHERE id = $1', [sentinel]);
  await pool.end();
}
