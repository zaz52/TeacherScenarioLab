import { createHash, randomBytes, randomInt } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { Pool } from 'pg';

import { EPIDEMIC_SCENARIO_V1_DRAFT } from '../../lib/training/scenarios/epidemic-v1';

const ADMIN_ID = 'acct:00000000-0000-4000-8000-000000000e2e';
const version = randomInt(100_000, 2_000_000_000);
const title = `浏览器验收情境 ${version}`;
const draft = { ...EPIDEMIC_SCENARIO_V1_DRAFT, version, title, publishedAt: null };
const scenarioPath = `/api/training/admin/scenarios/epi-class-fever/versions/${version}`;
let admin: APIRequestContext;

// The fixture creates test rows in the same isolated database as the app.
// Actual requests still authenticate a hashed session and pass the admin gate.
test.describe.configure({ mode: 'serial' });
test.use({ locale: 'zh-CN' });

test.beforeAll(async ({ playwright, baseURL }) => {
  if (!process.env.DATABASE_URL) throw new Error('Product E2E requires an isolated DATABASE_URL');
  const { PgTrainingStore, ensureTrainingSchema } = await import('@openmaic/storage/training/pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const token = randomBytes(32).toString('base64url');
  try {
    const client = await pool.connect();
    try {
      await ensureTrainingSchema(client);
    } finally {
      client.release();
    }
    const store = new PgTrainingStore(pool, {
      withTransaction: async (body) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await body(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
    });
    if (!(await store.getAccount(ADMIN_ID))) {
      await store.createAccount({
        accountId: ADMIN_ID,
        displayName: 'E2E 管理员',
        roles: [],
        createdAt: Date.now(),
      });
    }
    await store.createSession({
      tokenHash: createHash('sha256').update(token).digest('hex'),
      accountId: ADMIN_ID,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3_600_000,
    });
  } finally {
    await pool.end();
  }
  admin = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { cookie: `training_session=${token}` },
  });
});

test.afterAll(async () => {
  await admin?.dispose();
});

test('admin draft CRUD, publishing and frozen versions enforce their boundaries', async ({
  request,
}) => {
  expect((await request.get('/api/training/admin/scenarios')).status()).toBe(403);
  expect((await admin.post('/api/training/admin/scenarios', { data: draft })).status()).toBe(201);
  const publicPath = `/api/training/scenarios/epi-class-fever/versions/${version}`;
  expect((await request.get(publicPath)).status()).toBe(404);
  expect(
    (
      await admin.put(scenarioPath, { data: { ...draft, goal: `${draft.goal} 浏览器回归。` } })
    ).status(),
  ).toBe(200);
  expect((await admin.post(`${scenarioPath}/publish`)).status()).toBe(200);
  const published = await (await request.get(publicPath)).json();
  expect(published.scenario.title).toBe(title);
  expect(published.scenario).not.toHaveProperty('facts');
  expect(published.scenario).not.toHaveProperty('disclosureConditions');
  expect((await admin.put(scenarioPath, { data: draft })).status()).toBe(409);
  expect((await admin.delete(scenarioPath)).status()).toBe(409);
  const disposable = { ...draft, scenarioId: `e2e-disposable-${version}` };
  expect((await admin.post('/api/training/admin/scenarios', { data: disposable })).status()).toBe(
    201,
  );
  expect(
    (
      await admin.delete(
        `/api/training/admin/scenarios/${disposable.scenarioId}/versions/${version}`,
      )
    ).status(),
  ).toBe(200);
});

test('hall, scripted room, records, owner isolation, account claim and logout work together', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await page.goto('/training/hall');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await card.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.waitForURL(/\/training\/[^/]+$/);
  const trainingId = new URL(page.url()).pathname.split('/').at(-1)!;
  const path = `/api/training/trainings/${trainingId}`;
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.getByLabel('选择对话角色').selectOption('parent-1');
  await page
    .getByPlaceholder('输入你想说的话...')
    .fill('家长您好，我会先核实情况并及时向校医报告。');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByText('班里现在到底有几个孩子发烧了', { exact: false })).toBeVisible();
  const stranger = await browser.newContext();
  try {
    expect((await stranger.request.get(`http://localhost:3002${path}`)).status()).toBe(404);
  } finally {
    await stranger.close();
  }
  for (const to of ['fact-checking', 'coordination', 'proposal', 'evaluation']) {
    expect((await page.request.post(`${path}/transition`, { data: { to } })).status()).toBe(200);
  }
  await page.goto('/training/records');
  await expect(page.locator(`a[href="/training/${trainingId}"]`)).toBeVisible();
  await page.goto(`/training/${trainingId}/review`);
  await expect(page.getByRole('heading', { name: '训练复盘' })).toBeVisible();
  await expect(
    page.getByText('家长您好，我会先核实情况并及时向校医报告。', { exact: true }),
  ).toBeVisible();
  expect(
    (
      await page.request.post('/api/training/accounts', { data: { displayName: '浏览器验收学员' } })
    ).status(),
  ).toBe(201);
  const claimed = await page.request.post('/api/training/claim');
  expect(claimed.status()).toBe(200);
  expect((await claimed.json()).claimed).toBe(1);
  expect((await page.request.get(path)).status()).toBe(200);
  await page.goto('/training/account');
  await expect(page.getByText('浏览器验收学员', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect.poll(async () => (await page.request.get(path)).status()).toBe(404);
});

test('Chinese homepage, shared navigation and reference keyword/detail pages render', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '教师情境实训实验室', exact: true }),
  ).toBeVisible();
  await page.goto('/training/references');
  await expect(
    page.getByRole('navigation', { name: 'training' }).locator('a[href="/training/hall"]'),
  ).toBeVisible();
  await page.getByPlaceholder('搜索标题、作者或主题…').fill('Epstein');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const reference = page.locator('a[href^="/training/references/"]').first();
  await expect(reference).toBeVisible();
  const referenceTitle = await reference.innerText();
  await reference.click();
  await expect(page.getByRole('heading', { name: referenceTitle, exact: true })).toBeVisible();
});
