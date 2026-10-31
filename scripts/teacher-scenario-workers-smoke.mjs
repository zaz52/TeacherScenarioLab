import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

assert.equal(new URL(process.env.DATABASE_URL ?? '').hostname, '127.0.0.1');
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/teacher_scenario_runtime');
const base = 'http://127.0.0.1:8787';
let ready = false;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(30000) });
    const body = await response.json();
    if (response.ok && (body.data ?? body).status === 'ok') {
      ready = true;
      break;
    }
  } catch {
    // Give workerd time to start; the readiness deadline remains bounded.
  }
  await delay(1000);
}
assert.ok(ready, 'Workers /api/health did not become ready');
assert.ok(process.env.ACCESS_CODE, 'Workers smoke requires the isolated fixture access code');
const gate = await fetch(`${base}/api/access-code/verify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ code: process.env.ACCESS_CODE }),
  signal: AbortSignal.timeout(10000),
});
assert.equal(gate.status, 200);
const gateCookie = gate.headers
  .getSetCookie()
  .find((value) => value.startsWith('openmaic_access='));
assert.ok(gateCookie, 'Workers gate omitted its cookie');
const headers = { cookie: gateCookie.split(';')[0] };
const coldCatalog = await Promise.all(
  Array.from({ length: 3 }, async () => {
    const response = await fetch(`${base}/api/training/scenarios`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, 'Workers concurrent cold catalog request');
    return response.json();
  }),
);
assert.equal(coldCatalog.length, 3);
// Independent requests expose request-scope socket reuse failures.
for (let attempt = 0; attempt < 3; attempt++) {
  const response = await fetch(`${base}/api/training/scenarios`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, `Workers training catalog request ${attempt + 1}`);
  await response.json();
}
const home = await fetch(base, { signal: AbortSignal.timeout(10000) });
assert.equal(home.status, 200);
assert.match(await home.text(), /TeacherScenarioLab/);
console.log(
  JSON.stringify({
    workersSmoke: 'success',
    health: true,
    concurrentColdCatalogRequests: 3,
    catalogRequests: 3,
    home: true,
  }),
);
