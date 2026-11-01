import { expect, test } from '@playwright/test';
import { policySchema } from '../../lib/training/models/types';

test.use({ locale: 'zh-CN' });
const overview = () => ({
  success: true,
  providers: [] as Record<string, unknown>[],
  policies: ['glm-4.7-flash', 'fixture-backup'].map((modelId) =>
    policySchema.parse({ provider: 'glm', modelId, tasks: ['roleplay', 'evaluation'] }),
  ),
  routing: { roleplay: null, evaluation: null, characters: {} } as {
    roleplay: string | null;
    evaluation: string | null;
    characters: Record<string, string | null>;
  },
  qualifications: [],
  catalogs: [],
  metrics: [],
  calls: [],
  audit: [],
  privacy: { source: 'https://docs.bigmodel.cn', verifiedAt: '2026-11-01' },
});

test('custom connection form sends a private key once and clears it after save (mock API)', async ({
  page,
}) => {
  const state = overview();
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/training/admin/scenarios', (route) =>
    route.fulfill({ json: { scenarios: [] } }),
  );
  await page.route('**/api/training/admin/models', async (route) => {
    if (route.request().method() === 'POST') {
      submitted = route.request().postDataJSON().connection;
      const { apiKey: _key, ...publicConnection } = submitted!;
      state.providers = [
        {
          ...publicConnection,
          revision: 1,
          configured: true,
          keyVariable: '',
          policySource: '',
          verifiedAt: '2026-11-01',
        },
      ];
      await route.fulfill({ json: { success: true } });
    } else await route.fulfill({ json: state });
  });
  await page.goto('/settings/training/models/providers');
  await page.getByRole('button', { name: '自定义模型接入', exact: true }).click();
  await page.getByLabel('连接 ID（custom- 开头）').fill('custom-browser-fixture');
  await page.getByLabel('HTTPS API 地址').fill('https://models.example/v1');
  const key = page.getByLabel('API 密钥', { exact: true });
  await expect(key).toHaveAttribute('type', 'password');
  await key.fill('synthetic-browser-key');
  await page.getByLabel('模型 ID（每行一个）').fill('fixture/model-one\nfixture/model-two');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'custom-browser-fixture', exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    id: 'custom-browser-fixture',
    apiKey: 'synthetic-browser-key',
    models: ['fixture/model-one', 'fixture/model-two'],
    revision: null,
  });
  await expect(key).toHaveCount(0);
  await page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'custom-browser-fixture', exact: true }) })
    .getByRole('button', { name: '配置', exact: true })
    .click();
  await expect(page.getByLabel('API 密钥', { exact: true })).toHaveValue('');
  await expect(page.locator('body')).not.toContainText('synthetic-browser-key');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByLabel('API 密钥', { exact: true })).toHaveCount(0);
  expect(Object.keys(submitted!).sort()).toEqual(['baseUrl', 'id', 'models', 'preset', 'revision']);
});

test('character selection preserves the independent evaluation and other characters (mock API)', async ({
  page,
}) => {
  const state = overview();
  state.routing.evaluation = 'glm:glm-4.7-flash';
  state.routing.characters['student-1'] = 'glm:glm-4.7-flash';
  let submitted: unknown;
  await page.route('**/api/training/admin/scenarios', (route) =>
    route.fulfill({
      json: {
        scenarios: [
          {
            characters: [
              { id: 'parent-1', name: '家长示例' },
              { id: 'student-1', name: '学生示例' },
            ],
          },
        ],
      },
    }),
  );
  await page.route('**/api/training/admin/models', async (route) => {
    if (route.request().method() === 'POST') {
      submitted = route.request().postDataJSON().routing;
      state.routing = submitted as typeof state.routing;
      await route.fulfill({ json: { success: true } });
    } else await route.fulfill({ json: state });
  });
  await page.goto('/settings/training/models/routing');
  await page.getByLabel('家长示例 (parent-1)').selectOption('glm:fixture-backup');
  await expect(page.getByLabel('家长示例 (parent-1)')).toHaveValue('glm:fixture-backup');
  expect(submitted).toEqual({
    roleplay: null,
    evaluation: 'glm:glm-4.7-flash',
    characters: { 'student-1': 'glm:glm-4.7-flash', 'parent-1': 'glm:fixture-backup' },
  });
});

test('denied model access keeps the custom connection editor unavailable (mock API)', async ({
  page,
}) => {
  await page.route('**/api/training/admin/models', (route) =>
    route.fulfill({ status: 403, json: { success: false } }),
  );
  await page.goto('/settings/training/models/providers');
  await expect(
    page.getByRole('alert').filter({ hasText: '管理员权限不足或数据加载失败' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '自定义模型接入', exact: true })).toHaveCount(0);
});
