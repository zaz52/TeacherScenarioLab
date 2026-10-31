import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { stopLocalWorker } from './stop-local-worker.mjs';

const require = createRequire(import.meta.url);
const wrangler = path.join(
  path.dirname(require.resolve('wrangler/package.json')),
  'bin/wrangler.js',
);
const child = spawn(
  process.execPath,
  [
    wrangler,
    'dev',
    '--local',
    '--config',
    'tests/workers/images/wrangler.jsonc',
    '--ip',
    '127.0.0.1',
    '--port',
    '8789',
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
  let result;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (child.exitCode !== null) throw new Error('Image contract worker exited before readiness');
    try {
      const response = await fetch('http://127.0.0.1:8789', { signal: AbortSignal.timeout(10000) });
      result = await response.json();
      assert.equal(response.status, 200, JSON.stringify(result));
      break;
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      await setTimeout(1000);
    }
  }
  assert.equal(result?.passed, true, 'Images workerd contract did not complete');
  console.log(JSON.stringify({ check: 'workerd-images', ...result }));
} finally {
  stopLocalWorker(child);
}
