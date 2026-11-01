import { beforeEach, describe, expect, it, vi } from 'vitest';
import { maintainIdleWorker } from '@/lib/server/worker-maintenance';

const calls = vi.hoisted(() => ({
  collect: vi.fn(),
  stop: vi.fn(),
  legacy: vi.fn(),
  compact: vi.fn(),
  sweep: vi.fn(),
  enabled: true,
}));
vi.mock('@/lib/persistence/asset-collector-schedule', () => ({
  startAssetCollectorSchedule: () =>
    calls.enabled ? { collectNow: calls.collect, stop: calls.stop } : undefined,
}));
vi.mock('@/lib/server/legacy-classroom-import', () => ({ importLegacyClassrooms: calls.legacy }));
vi.mock('@/lib/server/generation/run/config', () => ({
  generationRunConfig: () => ({ finishedRetentionMs: 86400000 }),
}));
vi.mock('@/lib/server/generation/run/store', () => ({
  compactFinishedGenerationRuns: calls.compact,
}));
vi.mock('@/lib/server/materials/extraction', () => ({ sweepUnusedOwnerMaterialsNow: calls.sweep }));

beforeEach(() => {
  calls.enabled = true;
  for (const fn of [calls.collect, calls.stop, calls.legacy, calls.compact, calls.sweep])
    fn.mockReset().mockResolvedValue(undefined);
});

describe('maintenance while process queue timers are paused', () => {
  it('reuses existing public passes and releases the temporary collector', async () => {
    await maintainIdleWorker();
    expect(calls.legacy).toHaveBeenCalledTimes(1);
    expect(calls.collect).toHaveBeenCalledTimes(1);
    expect(calls.compact).toHaveBeenCalledWith(86400000);
    expect(calls.sweep).toHaveBeenCalledTimes(1);
    expect(calls.stop).toHaveBeenCalledTimes(1);
    expect(calls.sweep.mock.invocationCallOrder[0]).toBeLessThan(
      calls.stop.mock.invocationCallOrder[0],
    );
  });

  it('releases its temporary collector and preserves a failed pass', async () => {
    calls.compact.mockRejectedValue(new Error('database unavailable'));
    await expect(maintainIdleWorker()).rejects.toThrow('database unavailable');
    expect(calls.stop).toHaveBeenCalledTimes(1);
    expect(calls.sweep).not.toHaveBeenCalled();
  });

  it('respects an operator-disabled collector and runs the remaining maintenance', async () => {
    calls.enabled = false;
    await maintainIdleWorker();
    expect(calls.collect).not.toHaveBeenCalled();
    expect(calls.compact).toHaveBeenCalledTimes(1);
    expect(calls.sweep).toHaveBeenCalledTimes(1);
  });
});
