import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

// Observe at least two background scans after the HTTP smoke checks finish.
await setTimeout(2200);
const log = (await readFile('cloudflare-runtime.log', 'utf8')).replace(/\u001b\[[0-9;]*m/g, '');
const errors = log
  .split('\n')
  .filter((line) =>
    /\[ERROR\]|PostgreSQL operation is outside an active Worker request|Cannot perform I\/O on behalf/.test(
      line,
    ),
  );
console.log(JSON.stringify({ workerBackgroundRuntimeErrors: errors.length }));
assert.equal(errors.length, 0, 'Workers runtime logged a background or request-lifetime failure');
