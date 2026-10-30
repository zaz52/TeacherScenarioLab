import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  allowed: false,
  read: vi.fn(),
  save: vi.fn(),
  overview: vi.fn(),
  catalog: vi.fn(),
  qualify: vi.fn(),
}));
vi.mock('@/lib/training/with-training-admin', () => ({
  withTrainingAdmin: async (
    _req: unknown,
    fn: (principal: { ownerId: string }) => Promise<Response>,
  ) => (mocks.allowed ? fn({ ownerId: 'acct:admin' }) : new Response('Forbidden', { status: 403 })),
}));
vi.mock('@/lib/training/models/store', () => ({
  readPoolState: mocks.read,
  savePolicy: mocks.save,
  poolOverview: mocks.overview,
  saveCatalog: vi.fn(),
  saveRouting: vi.fn(),
  audit: vi.fn(),
}));
vi.mock('@/lib/training/models/providers', () => ({
  providerSummaries: () => [],
  fetchCatalog: mocks.catalog,
  POLICY_VERIFIED_AT: '2026-10-30',
  PRIVACY_SOURCE: 'https://ai.google.dev/gemini-api/terms',
}));
vi.mock('@/lib/training/models/qualification', () => ({ qualifyModel: mocks.qualify }));
import { GET, POST } from '@/app/api/training/admin/models/route';
import { policySchema } from '@/lib/training/models/types';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed = false;
  mocks.overview.mockResolvedValue({ policies: [], calls: [] });
  mocks.read.mockResolvedValue({ catalogs: [] });
});
const request = (body: unknown, origin = 'https://school.example') =>
  new NextRequest('https://school.example/api/training/admin/models', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  });
describe('model admin API boundary', () => {
  test('anonymous and learner paths are refused before provider or database work', async () => {
    expect(
      (await GET(new NextRequest('https://school.example/api/training/admin/models'))).status,
    ).toBe(403);
    expect((await POST(request({ action: 'catalog', provider: 'google' }))).status).toBe(403);
    expect(mocks.catalog).not.toHaveBeenCalled();
    expect(mocks.overview).not.toHaveBeenCalled();
  });
  test('cross-origin mutation is refused', async () => {
    mocks.allowed = true;
    expect(
      (await POST(request({ action: 'catalog', provider: 'google' }, 'https://attacker.example')))
        .status,
    ).toBe(403);
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
  test('policy cannot contain a secret or invented model id', async () => {
    mocks.allowed = true;
    const p = policySchema.parse({
      provider: 'google',
      modelId: 'unknown-model',
      tasks: ['evaluation'],
    });
    expect(
      (await POST(request({ action: 'policy', policy: { ...p, apiKey: 'fixture-secret' } })))
        .status,
    ).toBe(400);
    expect((await POST(request({ action: 'policy', policy: p }))).status).toBe(409);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  test('OpenRouter paid model cannot enter through administrative selection', async () => {
    mocks.allowed = true;
    mocks.read.mockResolvedValue({
      catalogs: [{ provider: 'openrouter', httpStatus: 200, models: ['paid/model'] }],
    });
    const p = policySchema.parse({
      provider: 'openrouter',
      modelId: 'paid/model',
      tasks: ['roleplay'],
    });
    expect((await POST(request({ action: 'policy', policy: p }))).status).toBe(409);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  test('authorized GET has no-store caching', async () => {
    mocks.allowed = true;
    const r = await GET(new NextRequest('https://school.example/api/training/admin/models'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
});
