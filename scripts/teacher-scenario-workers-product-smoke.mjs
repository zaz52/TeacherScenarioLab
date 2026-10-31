import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const database = new URL(process.env.DATABASE_URL ?? '');
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.pathname, '/teacher_scenario_runtime');
const base = 'http://127.0.0.1:8787';
const checks = [];
let cookie = '';
async function request(path, { method = 'GET', body, expected = 200, credentials = cookie } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { cookie: credentials, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, expected, `${method} ${path}`);
  checks.push({ method, path, status: response.status });
  return response;
}
const gate = await request('/api/access-code/verify', {
  method: 'POST',
  body: { code: process.env.ACCESS_CODE },
});
cookie = gate.headers
  .getSetCookie()
  .find((value) => value.startsWith('openmaic_access='))
  .split(';')[0];
const account = await request('/api/training/accounts', {
  method: 'POST',
  body: { displayName: 'Workers acceptance learner' },
  expected: 201,
});
cookie +=
  '; ' +
  account.headers
    .getSetCookie()
    .find((value) => value.startsWith('training_session='))
    .split(';')[0];
const catalog = await (await request('/api/training/scenarios')).json();
const scenario = catalog.scenarios.find(
  (value) => value.scenarioId === 'epi-class-fever' && value.version === 9999001,
);
assert.ok(scenario, 'Isolated Worker scenario fixture is missing');
assert.equal(Object.hasOwn(scenario, 'facts'), false);
const created = await (
  await request('/api/training/trainings', {
    method: 'POST',
    body: { scenarioId: scenario.scenarioId, scenarioVersion: scenario.version },
    expected: 201,
  })
).json();
const id = created.training.id;
assert.ok(id);
const api = `/api/training/trainings/${id}`;
await request(api, { credentials: cookie.split(';')[0], expected: 404 });
await request(api + '/start', { method: 'POST' });
const message = {
  content: '家长您好，我会先核实情况并及时向校医报告。',
  idempotencyKey: randomUUID(),
};
const first = await (
  await request(api + '/messages', { method: 'POST', body: message, expected: 201 })
).json();
const repeated = await (await request(api + '/messages', { method: 'POST', body: message })).json();
assert.equal(first.message.id, repeated.message.id);
assert.equal(repeated.deduped, true);
const reply = await (
  await request(api + '/reply', {
    method: 'POST',
    body: { characterId: 'parent-1', mode: 'scripted' },
    expected: 201,
  })
).json();
assert.equal(reply.mode, 'scripted');
const messages = await (await request(api + '/messages')).json();
assert.equal(messages.messages.filter((value) => value.role === 'user').length, 1);
assert.ok(messages.messages.some((value) => value.role === 'character'));
for (const to of ['fact-checking', 'coordination', 'proposal', 'evaluation']) {
  await request(api + '/transition', { method: 'POST', body: { to } });
}
// No provider credentials are present in this job. Failure must stay visible and unsaved.
await request(api + '/evaluate', { method: 'POST', expected: 503 });
await request(api + '/evaluation', { expected: 404 });
const final = await (await request(api)).json();
assert.equal(final.training.state, 'evaluation');
const events = await (await request(api + '/events')).json();
assert.equal(events.events.filter((value) => value.type === 'user-message').length, 1);
assert.equal(events.events.filter((value) => value.type === 'training-transition').length, 4);
assert.ok(
  events.events.some(
    (value) => value.type === 'character-reply' && value.payload.mode === 'scripted',
  ),
);
assert.equal(
  events.events.some((value) => value.type === 'evaluation-completed'),
  false,
);
for (const page of [
  '/',
  '/?training=hall',
  `/classroom/training/${id}`,
  `/eval/training/${id}`,
  '/courseware/references',
  '/settings/training',
]) {
  const response = await request(page);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  await response.text();
}
await request('/api/training/admin/scenarios', { expected: 403 });
const references = await (await request('/api/training/references')).json();
assert.equal(references.references.length, 50);
for (const reference of references.references) {
  const detail = await (await request(`/api/training/references/${reference.id}`)).json();
  assert.equal(detail.reference.id, reference.id);
}
console.log(
  JSON.stringify({
    workersProductSmoke: true,
    checks: checks.length,
    pages: 6,
    referenceDetails: 50,
    scriptedDialogue: true,
    messageIdempotency: true,
    ownerIsolation: true,
    ledgerConsistent: true,
    unavailableEvaluationRejected: true,
    realModelEvaluation: 'not executed',
  }),
);
