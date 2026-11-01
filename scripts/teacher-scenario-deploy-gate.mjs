import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const sha = process.env.TEACHERLAB_DEPLOY_SHA;
assert.match(sha ?? '', /^[a-f0-9]{40}$/);
const repository = 'zaz52/TeacherScenarioLab';
const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'TeacherScenarioLab-deployment',
};
async function get(path) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}${path}${path.includes('?') ? '&' : '?'}_teacherlab=${Date.now()}`,
    { headers, signal: AbortSignal.timeout(30000) },
  );
  assert.ok(response.ok, `GitHub deployment gate HTTP ${response.status}`);
  return response.json();
}
const wanted = ['CI', 'Storage PostgreSQL Contract'];
const deadline = Date.now() + 20 * 60 * 1000;
let verified;
while (Date.now() < deadline) {
  const pr = await get('/pulls/1');
  assert.equal(pr.head.sha, sha, 'PR head changed before deployment');
  assert.equal(pr.head.ref, 'feat/teacher-scenario-lab-product');
  assert.equal(pr.base.ref, 'dev/teacher-scenario-lab');
  assert.equal(pr.draft, true);
  assert.equal(pr.state, 'open');
  const runs = (await get(`/actions/runs?head_sha=${sha}&event=pull_request&per_page=100`))
    .workflow_runs;
  const selected = wanted.map(
    (name) =>
      runs
        .filter((run) => run.name === name && run.head_sha === sha)
        .sort((a, b) => b.id - a.id)[0],
  );
  for (const run of selected) {
    if (run?.status === 'completed')
      assert.equal(run.conclusion, 'success', `${run.name} did not pass`);
  }
  if (selected.every((run) => run?.conclusion === 'success' && run.status === 'completed')) {
    verified = selected.map(({ name, id, html_url, conclusion }) => ({
      name,
      id,
      html_url,
      conclusion,
    }));
    break;
  }
  console.log('Waiting for the exact commit CI and PostgreSQL checks');
  await delay(30000);
}
assert.ok(verified, 'Timed out waiting for exact-commit CI');
await writeFile('cloudflare-deploy-gate.json', JSON.stringify({ sha, checks: verified }, null, 2));
console.log(JSON.stringify({ deploymentGate: true, sha, checks: verified }));
