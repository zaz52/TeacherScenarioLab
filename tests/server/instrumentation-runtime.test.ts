import { afterEach, expect, it, vi } from 'vitest';

const startup = vi.hoisted(() => ({ registerNode: vi.fn(async () => {}) }));
vi.mock('@/lib/server/startup', () => startup);

afterEach(() => {
  vi.unstubAllEnvs();
  startup.registerNode.mockClear();
});

it('starts Node workers in the Node runtime', async () => {
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  const { register } = await import('@/instrumentation');
  await register();
  expect(startup.registerNode).toHaveBeenCalledTimes(1);
});

it.each(['edge', ''])('keeps Node startup out of runtime %s', async (runtime) => {
  vi.stubEnv('NEXT_RUNTIME', runtime);
  const { register } = await import('@/instrumentation');
  await register();
  expect(startup.registerNode).not.toHaveBeenCalled();
});
