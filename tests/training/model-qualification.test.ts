import { beforeEach, expect, test, vi } from 'vitest';
import { PoolError, policySchema } from '@/lib/training/models/types';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/training/models/runtime', () => ({ invokePoolModel: mocks.invoke }));
vi.mock('@/lib/training/models/store', () => ({
  withModelLease: async (_key: string, fn: () => Promise<unknown>) => fn(),
  readPoolState: async () => ({
    policies: [
      policySchema.parse({
        provider: 'glm',
        modelId: 'glm-4.7-flash',
        tasks: ['roleplay'],
        rpm: 10000,
      }),
    ],
  }),
  saveQualification: mocks.save,
  audit: vi.fn(),
}));
import { qualifyModel } from '@/lib/training/models/qualification';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockImplementation(async (_p, _task, input) => {
    input.validate('老师，我会配合您核实情况。');
    return { text: '老师，我会配合您核实情况。', callId: 'mock-fixture' };
  });
});
test('blocked qualification retains fact IDs with zero persisted output samples', async () => {
  mocks.invoke.mockRejectedValueOnce(new PoolError('privacy', undefined, ['hidden-fixture']));
  const q = await qualifyModel('glm:glm-4.7-flash', 'roleplay', 'test-admin');
  expect(q.blockedFactIds).toEqual(['hidden-fixture']);
  expect(q.samples).toHaveLength(0);
  expect(q.failureCase).toBe(1);
});
test('qualification retries a transient failure once and records the successful case gate', async () => {
  mocks.invoke.mockRejectedValueOnce(
    Object.assign(new PoolError('server'), {
      failure: { kind: 'server', httpStatus: 503, retry: true, terminal: false, retryAt: null },
    }),
  );
  const q = await qualifyModel('glm:glm-4.7-flash', 'roleplay', 'test-admin');
  expect(q.passed).toBe(true);
  expect(q.successes).toBe(6);
  expect(q.samples).toHaveLength(6);
  expect(q.samples?.[0].output).toContain('老师');
  expect(mocks.invoke).toHaveBeenCalledTimes(7);
  expect(mocks.invoke.mock.calls[1][2].deferCooldown).toBe(false);
});
test.each(['auth', 'quota', 'privacy', 'safety'] as const)(
  'qualification does not retry %s',
  async (kind) => {
    mocks.invoke.mockRejectedValueOnce(
      Object.assign(new PoolError(kind), {
        failure: {
          kind,
          httpStatus: null,
          retry: false,
          terminal: kind === 'privacy' || kind === 'safety',
          retryAt: null,
        },
      }),
    );
    const q = await qualifyModel('glm:glm-4.7-flash', 'roleplay', 'test-admin');
    expect(q.passed).toBe(false);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(q.skipped).toBe(5);
  },
);
