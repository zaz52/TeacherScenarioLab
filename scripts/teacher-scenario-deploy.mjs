import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

let secrets;
try {
  secrets = JSON.parse(process.env.TEACHERLAB_WORKER_SECRETS_JSON ?? '{}');
} catch {
  throw new Error('Production secret bundle is invalid JSON');
}
assert.ok(process.env.CLOUDFLARE_API_TOKEN, 'Cloudflare deployment credential is missing');
assert.ok(process.env.CLOUDFLARE_ACCOUNT_ID, 'Cloudflare account is missing');
assert.ok(secrets.DATABASE_URL, 'Production database is missing');
let database;
try {
  database = new URL(secrets.DATABASE_URL);
} catch {
  throw new Error('Production database URL is invalid');
}
assert.ok(
  database.hostname.endsWith('.neon.tech'),
  'Production deployment requires the selected Neon database',
);
assert.equal(database.pathname, '/teacherlab');
assert.ok(
  secrets.ACCESS_CODE && secrets.OPENMAIC_SECRET_KEY,
  'Production identity secrets are missing',
);
const values = [
  ...Object.values(secrets),
  process.env.CLOUDFLARE_API_TOKEN,
  decodeURIComponent(database.password),
].filter((v) => typeof v === 'string' && v.length > 6);
const redact = (text) => values.reduce((s, value) => s.split(value).join('[REDACTED]'), text);
const file = `/dev/shm/teacherlab-secrets-${process.pid}.json`;
await writeFile(file, JSON.stringify(secrets), { mode: 0o600, flag: 'wx' });
try {
  const env = {
    ...process.env,
    WRANGLER_LOG_PATH: '/dev/null',
    WRANGLER_SEND_METRICS: 'false',
    NO_COLOR: '1',
    CI: 'true',
  };
  delete env.TEACHERLAB_WORKER_SECRETS_JSON;
  const child = spawn(
    process.execPath,
    [
      resolve('node_modules/wrangler/bin/wrangler.js'),
      'deploy',
      '--secrets-file',
      file,
      '--tag',
      process.env.TEACHERLAB_DEPLOY_SHA ?? 'teacherlab',
    ],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });
  const code = await new Promise((resolveCode, reject) => {
    child.once('error', reject);
    child.once('close', resolveCode);
  });
  output = redact(output);
  await writeFile('cloudflare-deploy.log', output);
  console.log(output);
  assert.equal(code, 0, `Cloudflare deployment exited ${code}; see sanitized deployment log`);
  const urls = [...new Set(output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/g) ?? [])];
  assert.ok(urls.length > 0, 'Deployment did not return its workers.dev URL');
  await writeFile(
    'cloudflare-deployment.json',
    JSON.stringify(
      { sha: process.env.TEACHERLAB_DEPLOY_SHA, urls, deployed: true, dnsChanged: false },
      null,
      2,
    ),
  );
} finally {
  await rm(file, { force: true });
}
