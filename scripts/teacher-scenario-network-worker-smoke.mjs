import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { stopLocalWorker } from './stop-local-worker.mjs';

const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
const child = spawn(
  process.execPath,
  [
    cli,
    'dev',
    '--local',
    '--config',
    'tests/workers/network/wrangler.jsonc',
    '--ip',
    '127.0.0.1',
    '--port',
    '8793',
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
    if (child.exitCode !== null) throw new Error('Network contract worker exited');
    try {
      ready = (await fetch('http://127.0.0.1:8793/health', { signal: AbortSignal.timeout(3000) }))
        .ok;
      if (ready) break;
    } catch {
      /* bounded readiness */
    }
    await setTimeout(1000);
  }
  assert.ok(ready, 'Network contract worker did not start');
  const response = await fetch('http://127.0.0.1:8793/', { signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  console.log(JSON.stringify({ check: 'workerd-public-dns', ...result }));
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.passed, true);
} finally {
  stopLocalWorker(child);
}
