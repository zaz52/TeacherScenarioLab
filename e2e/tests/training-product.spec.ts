import { createHash, randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { Pool } from 'pg';

import { EPIDEMIC_SCENARIO_V1_DRAFT } from '../../lib/training/scenarios/epidemic-v1';
import { supportedLocales } from '../../lib/i18n/locales';

const ADMIN_ID = 'acct:00000000-0000-4000-8000-000000000e2e';
const version = randomInt(100_000, 2_000_000_000);
const title = `浏览器验收情境 ${version}`;
const draft = { ...EPIDEMIC_SCENARIO_V1_DRAFT, version, title, publishedAt: null };
const scenarioPath = `/api/training/admin/scenarios/epi-class-fever/versions/${version}`;
let admin: APIRequestContext;
let adminSessionToken: string;
const trainingCopy = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(`lib/i18n/locales/${locale}.json`, 'utf8')).training;

// The fixture creates test rows in the same isolated database as the app.
// Actual requests still authenticate a hashed session and pass the admin gate.
test.describe.configure({ mode: 'serial' });
test.use({ locale: 'zh-CN' });

test.beforeAll(async ({ playwright, baseURL }) => {
  if (!process.env.DATABASE_URL) throw new Error('Product E2E requires an isolated DATABASE_URL');
  const { PgTrainingStore, ensureTrainingSchema } = await import('@openmaic/storage/training/pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const token = randomBytes(32).toString('base64url');
  adminSessionToken = token;
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
  const copy = trainingCopy('zh-CN');
  await page.goto('/training/hall');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await card.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.waitForURL(/\/training\/[0-9a-f-]{36}$/);
  const trainingId = new URL(page.url()).pathname.split('/').at(-1)!;
  const path = `/api/training/trainings/${trainingId}`;
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(
    page.getByText(`${copy.state}: ${copy.stateBriefing}`, { exact: true }),
  ).toBeVisible();
  await page.getByLabel('选择对话角色').selectOption('parent-1');
  await page
    .getByPlaceholder('输入你想说的话...')
    .fill('家长您好，我会先核实情况并及时向校医报告。');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByText('班里现在到底有几个孩子发烧了', { exact: false })).toBeVisible();
  expect((await page.request.get(path)).status()).toBe(200);
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
    page.getByText(`${copy.reviewState}：${copy.stateEvaluation}`, { exact: true }),
  ).toBeVisible();
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
  await expect(page.getByRole('main').getByText('浏览器验收学员', { exact: false })).toBeVisible();
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
  const href = (await reference.getAttribute('href'))!;
  const response = await page.request.get(`/api${href}`);
  expect(response.status()).toBe(200);
  const { reference: citation } = await response.json();
  await expect(reference).toHaveText(`${citation.title}（${citation.year}）`);
  await reference.click();
  await page.waitForURL(`**${href}`);
  await expect(page.getByRole('heading', { name: citation.title, exact: true })).toBeVisible();
});

test('admin forms create, edit, delete and freeze published versions in the browser', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(60_000);
  const copy = trainingCopy('zh-CN');
  await page
    .context()
    .addCookies([
      { name: 'training_session', value: adminSessionToken, url: baseURL!, httpOnly: true },
    ]);
  const scenarioId = `e2e-editor-${version}`;
  await page.goto('/training/admin/scenarios/new');
  await page.getByLabel(copy.adminFormScenarioId).fill(scenarioId);
  await page.getByLabel(copy.adminFormTitle).fill('浏览器表单创建');
  await page.getByLabel(copy.adminFormSetting).fill('家长与教师在学校沟通。');
  await page.getByLabel(copy.adminFormGoal).fill('核实信息并共同制定后续沟通安排。');
  await page.getByLabel(copy.adminFormRules).fill('保护学生隐私。');
  await page.getByLabel(copy.adminFormLearnerRole).fill('教师');
  await page.getByPlaceholder('id', { exact: true }).fill('parent-1');
  await page.getByPlaceholder('name', { exact: true }).fill('测试家长');
  await page.locator('select').selectOption('parent');
  await page.getByRole('button', { name: copy.adminFormSave, exact: true }).click();
  await expect(page.getByText(copy.adminFormSaveDone, { exact: true })).toBeVisible();

  await page.goto('/training/admin');
  const row = () => page.getByRole('listitem').filter({ hasText: scenarioId });
  await row().getByRole('link', { name: copy.adminEditDraft, exact: true }).click();
  await page.getByLabel(copy.adminFormTitle).fill('浏览器表单编辑后');
  await page.getByRole('button', { name: copy.adminFormSave, exact: true }).click();
  await expect(page.getByText(copy.adminFormSaveDone, { exact: true })).toBeVisible();
  const stored = await page.request.get(`/api/training/admin/scenarios/${scenarioId}/versions/1`);
  expect(stored.status()).toBe(200);
  expect((await stored.json()).scenario.title).toBe('浏览器表单编辑后');
  await page.goto('/training/admin');
  await row().getByRole('button', { name: copy.adminDeleteDraft, exact: true }).click();
  await expect(page.getByText(copy.adminDeleteDone, { exact: true })).toBeVisible();
  await expect(row()).toHaveCount(0);

  const frozenId = `${scenarioId}-frozen`;
  expect(
    (
      await admin.post('/api/training/admin/scenarios', {
        data: { ...draft, scenarioId: frozenId, version: 1 },
      })
    ).status(),
  ).toBe(201);
  await page.reload();
  const frozen = page.getByRole('listitem').filter({ hasText: frozenId });
  await frozen.getByRole('button', { name: copy.adminPublish, exact: true }).click();
  await expect(frozen.getByText(copy.adminPublished, { exact: true })).toBeVisible();
  await expect(frozen.getByRole('link', { name: copy.adminEditDraft, exact: true })).toHaveCount(0);
  await expect(
    frozen.getByRole('button', { name: copy.adminDeleteDraft, exact: true }),
  ).toHaveCount(0);
  await page.goto(`/training/admin/scenarios/${frozenId}/versions/1/edit`);
  await expect(page.getByText(copy.adminPublishedNote, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.adminFormSave, exact: true })).toHaveCount(0);

  const outsider = await browser.newContext({ locale: 'zh-CN' });
  try {
    const outsidePage = await outsider.newPage();
    await outsidePage.goto(`${baseURL}/training/admin`);
    await expect(outsidePage.getByText(copy.adminRequired, { exact: true })).toBeVisible();
  } finally {
    await outsider.close();
  }
});

for (const { code } of supportedLocales) {
  test.describe(`training pages in ${code}`, () => {
    test.use({ locale: code });
    test('renders localized homepage, records and navigation', async ({ page }) => {
      const copy = trainingCopy(code);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await expect(
        page.getByRole('heading', { level: 1, name: copy.homeTitle, exact: true }),
      ).toBeVisible();
      await page.locator('a[href="/training/records"]').first().click();
      await expect(
        page.getByRole('heading', { level: 1, name: copy.recordsTitle, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: 'training' }).getByRole('link', {
          name: copy.navHall,
          exact: true,
        }),
      ).toBeVisible();
    });
  });
}
