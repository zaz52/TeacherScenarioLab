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
import { EVALUATION_DIMENSIONS } from '@/lib/training/evaluation';
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
test('evaluation qualification includes repeated scoring and a twenty-message multirole case (mock transport)', async () => {
  mocks.invoke.mockImplementation(async (_p, _task, input) => {
    const id = input.prompt.includes('00000000-0000-4000-8000-000000000001')
      ? '00000000-0000-4000-8000-000000000001'
      : 'teacher-evidence-1';
    const text = JSON.stringify({
      dimensions: EVALUATION_DIMENSIONS.map((dimension) => ({
        dimension,
        score: 80,
        evidence: [id],
        comment: '已核实对话依据。',
      })),
      summary: '评价记录完整。',
      suggestions: ['继续核实事实。'],
    });
    input.validate(text);
    return { text, callId: 'fixture' };
  });
  const q = await qualifyModel('glm:glm-4.7-flash', 'evaluation', 'test-admin');
  expect(q.passed).toBe(true);
  expect(q.suiteVersion).toBe(2);
  expect(q.cases).toBe(3);
  expect(mocks.invoke.mock.calls[2][2].prompt).toContain('00000000-0000-4000-8000-000000000010');
  expect(q.samples).toHaveLength(3);
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
