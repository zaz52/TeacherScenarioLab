import { describe, expect, it, vi } from 'vitest';
import { createWorkerLifecycle } from '@/lib/server/worker-lifecycle';

function dependencies() {
  const stop = vi.fn(async () => true);
  const busy = vi.fn(() => false);
  return {
    stop,
    busy,
    start: vi.fn(async () => ({ stop, busy })),
    pending: vi.fn(async () => false),
    maintain: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
}

describe('Node background lifecycle inside a Worker host', () => {
  it('retains one initial startup and ordered shutdown with pool close', async () => {
    const d = dependencies();
    const lifecycle = await createWorkerLifecycle(d);
    await Promise.all([lifecycle.shutdown(), lifecycle.shutdown()]);
    expect(d.start).toHaveBeenCalledTimes(1);
    expect(d.stop).toHaveBeenCalledTimes(1);
    expect(d.close).toHaveBeenCalledTimes(1);
    expect(d.stop.mock.invocationCallOrder[0]).toBeLessThan(d.close.mock.invocationCallOrder[0]);
  });

  it('pauses timers while shared request pools remain usable, then resumes once', async () => {
    const d = dependencies();
    const lifecycle = await createWorkerLifecycle(d);
    await Promise.all([lifecycle.pause(), lifecycle.pause()]);
    expect(lifecycle.paused).toBe(true);
    expect(d.stop).toHaveBeenCalledTimes(1);
    expect(d.close).not.toHaveBeenCalled();
    await Promise.all([lifecycle.resume(), lifecycle.resume()]);
    expect(lifecycle.paused).toBe(false);
    expect(d.start).toHaveBeenCalledTimes(2);
    await lifecycle.shutdown();
    expect(d.stop).toHaveBeenCalledTimes(2);
    expect(d.close).toHaveBeenCalledTimes(1);
  });

  it('runs maintenance during suspension and keeps the runner parked', async () => {
    const d = dependencies();
    const lifecycle = await createWorkerLifecycle(d);
    await lifecycle.maintain();
    expect(d.maintain).not.toHaveBeenCalled();
    await lifecycle.pause();
    await lifecycle.maintain();
    expect(d.maintain).toHaveBeenCalledTimes(1);
    expect(lifecycle.paused).toBe(true);
    await lifecycle.shutdown();
    expect(d.stop).toHaveBeenCalledTimes(1);
    expect(d.close).toHaveBeenCalledTimes(1);
  });

  it('preserves a busy legacy import even if queue metadata is empty', async () => {
    const d = dependencies();
    d.busy.mockReturnValue(true);
    const lifecycle = await createWorkerLifecycle(d);
    expect(await lifecycle.pending()).toBe(true);
    expect(d.pending).not.toHaveBeenCalled();
  });

  it('rechecks legacy activity after the queue query awaits', async () => {
    const d = dependencies();
    d.pending.mockImplementation(async () => {
      d.busy.mockReturnValue(true);
      return false;
    });
    const lifecycle = await createWorkerLifecycle(d);
    expect(await lifecycle.pending()).toBe(true);
  });

  it('refuses restart after an undrained suspension', async () => {
    const d = dependencies();
    d.stop.mockResolvedValue(false);
    const lifecycle = await createWorkerLifecycle(d);
    await expect(lifecycle.pause()).rejects.toThrow('did not drain');
    await expect(lifecycle.resume()).rejects.toThrow('did not drain');
    expect(d.start).toHaveBeenCalledTimes(1);
    await lifecycle.shutdown();
    expect(d.close).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed resume closed to subsequent requests', async () => {
    const d = dependencies();
    const lifecycle = await createWorkerLifecycle(d);
    await lifecycle.pause();
    d.start.mockRejectedValue(new Error('restart failed'));
    await expect(lifecycle.resume()).rejects.toThrow('restart failed');
    await expect(lifecycle.resume()).rejects.toThrow('restart failed');
    expect(d.start).toHaveBeenCalledTimes(2);
  });
});
