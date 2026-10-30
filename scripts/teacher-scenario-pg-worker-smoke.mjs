import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { stopLocalWorker } from './stop-local-worker.mjs';

const url = new URL(process.env.DATABASE_URL ?? '');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.pathname, '/teacher_scenario_runtime');
const vars = 'tests/workers/postgres/.dev.vars';
await writeFile(vars, `DATABASE_URL=${JSON.stringify(process.env.DATABASE_URL)}\n`, { flag: 'wx' });
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
const child = spawn(
  process.execPath,
  [
    cli,
    'dev',
    '--local',
    '--config',
    'tests/workers/postgres/wrangler.jsonc',
    '--ip',
    '127.0.0.1',
    '--port',
    '8790',
    '--inspector-port',
    '0',
  ],
  {
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (child.exitCode !== null) throw new Error('PostgreSQL contract worker exited');
    try {
      ready = (await fetch('http://127.0.0.1:8790/health', { signal: AbortSignal.timeout(3000) }))
        .ok;
      if (ready) break;
    } catch {
      /* Wait for the bounded startup deadline. */
    }
    await setTimeout(1000);
  }
  assert.ok(ready, 'PostgreSQL contract worker did not start');
  const check = async () => {
    const response = await fetch('http://127.0.0.1:8790/', { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.passed, true);
    return data;
  };
  const sequential = [await check(), await check()];
  const concurrent = await Promise.all([check(), check(), check()]);
  assert.equal(new Set([...sequential, ...concurrent].map((value) => value.backendId)).size, 5);
  console.log(
    JSON.stringify({
      check: 'workerd-postgres',
      passed: true,
      sequential: 2,
      concurrent: 3,
      transactionRollback: true,
    }),
  );
} finally {
  stopLocalWorker(child);
  await unlink(vars);
}
