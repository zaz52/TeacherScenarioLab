import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

// This writes synthetic accounts only in the job's dedicated PostgreSQL database.
const database = new URL(process.env.DATABASE_URL ?? '');
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.pathname, '/teacher_scenario_runtime');
const baseUrl = 'http://127.0.0.1:3000';
const checks = [];

async function request(path, { cookie, body, method = 'GET', expected = 200 } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, expected, `${method} ${path}`);
  const data = await response.json();
  checks.push(`${method} ${path}: ${expected}`);
  return { response, data };
}

let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const { data } = await request('/api/health');
    assert.equal((data.data ?? data).status, 'ok');
    ready = true;
    break;
  } catch {
    await delay(1000);
  }
}
assert.ok(ready, 'Final image did not become healthy');
const catalog = await request('/api/training/scenarios');
assert.ok(Array.isArray(catalog.data.scenarios));

async function createAccount(displayName) {
  const { response, data } = await request('/api/training/accounts', {
    method: 'POST',
    body: { displayName },
    expected: 201,
  });
  assert.equal(data.success, true);
  const session = response.headers
    .getSetCookie()
    .find((value) => value.startsWith('training_session='));
  assert.ok(session, 'Account response omitted its session cookie');
  assert.match(session, /; HttpOnly/i);
  assert.match(session, /; SameSite=Lax/i);
  assert.match(session, /; Secure/i);
  const cookie = session.split(';')[0];
  const me = await request('/api/training/accounts/me', { cookie });
  assert.equal(me.data.authenticated, true);
  assert.equal(me.data.ownerId, data.account.accountId);
  assert.equal(me.data.displayName, displayName);
  assert.ok(!me.data.roles.includes('admin'));
  return { cookie, accountId: data.account.accountId };
}

const first = await createAccount('Runtime learner A');
const second = await createAccount('Runtime learner B');
assert.notEqual(first.accountId, second.accountId);
const firstAgain = await request('/api/training/accounts/me', { cookie: first.cookie });
assert.equal(firstAgain.data.ownerId, first.accountId);
await request('/api/training/admin/scenarios', { cookie: first.cookie, expected: 403 });
await request('/api/training/admin/scenarios', { expected: 403 });
await request('/api/training/accounts/me', {
  cookie: 'training_session=malformed',
  expected: 401,
});
await request('/api/training/accounts/logout', { method: 'POST', cookie: first.cookie });
await request('/api/training/accounts/me', { cookie: first.cookie, expected: 401 });
const secondAgain = await request('/api/training/accounts/me', { cookie: second.cookie });
assert.equal(secondAgain.data.ownerId, second.accountId);
console.log(JSON.stringify({ runtimeSmoke: 'success', checks, accountsIsolated: true }));
