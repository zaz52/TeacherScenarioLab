import { test, expect } from '@playwright/test';

test('account form recovers from failure, creates a session and preserves it on reload', async ({
  page,
}) => {
  const gate = await (await page.request.get('/api/access-code/status')).json();
  if (gate.enabled) {
    expect(process.env.TEACHERLAB_ACCOUNT_ACCESS_CODE).toBeTruthy();
    expect(
      (
        await page.request.post('/api/access-code/verify', {
          data: { code: process.env.TEACHERLAB_ACCOUNT_ACCESS_CODE },
        })
      ).status(),
    ).toBe(200);
  }
  await page.goto('/?training=account#training');
  const block = page.getByTestId('training-home-block');
  const create = block.getByTestId('training-account-create');
  await expect(create).toBeVisible();
  await block.getByTestId('training-account-name').fill('账号入口验收');
  await page.route('**/api/training/accounts', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false }),
    });
  });
  await create.click();
  await expect(block.getByText('创建账号失败，请重试', { exact: true })).toBeVisible();
  await expect(create).toBeEnabled();
  await page.unroute('**/api/training/accounts');
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/training/accounts' &&
      response.request().method() === 'POST',
  );
  await create.click();
  const response = await created;
  expect(response.status()).toBe(201);
  const result = await response.json();
  expect(result).not.toHaveProperty('token');
  const accountId = result.account.accountId as string;
  expect(accountId).toMatch(/^acct:[0-9a-f-]{36}$/);
  await expect(block.getByText('账号入口验收', { exact: false })).toBeVisible();
  await expect(block.getByText(accountId, { exact: false })).toBeVisible();
  await expect(create).toHaveCount(0);
  expect((await page.request.get('/api/training/admin/scenarios')).status()).toBe(403);
  await page.reload();
  await expect(block.getByText(accountId, { exact: false })).toBeVisible();
  expect((await (await page.request.get('/api/training/accounts/me')).json()).authenticated).toBe(
    true,
  );
  await block.getByTestId('training-logout').click();
  await expect(create).toBeVisible();
  expect((await (await page.request.get('/api/training/accounts/me')).json()).authenticated).toBe(
    false,
  );
});
