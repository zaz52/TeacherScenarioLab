import { afterEach, describe, expect, it, vi } from 'vitest';
// The production module is shared with the custom Worker entry and has no Next imports.
import { createStartupGate, IdleHost, trackHostResponse } from '@/lib/cloudflare/idle-host.mjs';

function fixture() {
  let time = 0;
  const lifecycle = {
    paused: false,
    pending: vi.fn(async () => false),
    pause: vi.fn(async () => {
      lifecycle.paused = true;
    }),
    resume: vi.fn(async () => {
      lifecycle.paused = false;
    }),
    maintain: vi.fn(async () => {}),
  };
  const host = new IdleHost({ lifecycle: () => lifecycle, now: () => time, idleMs: 10 });
  return {
    lifecycle,
    host,
    advance: () => {
      time += 11;
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Worker host cold initialization', () => {
  it('holds concurrent HTTP and alarm admission until one cold start finishes', async () => {
    let release!: () => void;
    let ready = false;
    const barrier = new Promise<void>((resolve) => (release = resolve));
    const start = vi.fn(async () => {
      await barrier;
      ready = true;
    });
    const admit = createStartupGate({ ready: () => ready, start });
    const http = vi.fn();
    const alarm = vi.fn();
    const requests = [admit().then(http), admit().then(alarm)];
    await Promise.resolve();
    expect(start).toHaveBeenCalledTimes(1);
    expect(http).not.toHaveBeenCalled();
    expect(alarm).not.toHaveBeenCalled();
    release();
    await Promise.all(requests);
    expect(http).toHaveBeenCalledTimes(1);
    expect(alarm).toHaveBeenCalledTimes(1);
    await admit();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed boot to every waiter and permits a later retry', async () => {
    let ready = false;
    const start = vi
      .fn()
      .mockRejectedValueOnce(new Error('boot failed'))
      .mockImplementation(async () => {
        ready = true;
      });
    const admit = createStartupGate({ ready: () => ready, start });
    const results = await Promise.allSettled([admit(), admit()]);
    expect(results).toEqual([
      { status: 'rejected', reason: expect.objectContaining({ message: 'boot failed' }) },
      { status: 'rejected', reason: expect.objectContaining({ message: 'boot failed' }) },
    ]);
    expect(start).toHaveBeenCalledTimes(1);
    await admit();
    expect(start).toHaveBeenCalledTimes(2);
    expect(ready).toBe(true);
  });

  it('serves an already initialized host without another startup request', async () => {
    const start = vi.fn();
    const admit = createStartupGate({ ready: () => true, start });
    await Promise.all([admit(), admit()]);
    expect(start).not.toHaveBeenCalled();
  });
});

describe('Worker host idle admission', () => {
  it('waits for the idle window and pauses only an empty host', async () => {
    const { host, lifecycle, advance } = fixture();
    expect(await host.tick()).toBe(false);
    advance();
    expect(await host.tick()).toBe(true);
    expect(lifecycle.pause).toHaveBeenCalledTimes(1);
  });

  it('keeps an admitted request active and makes its release idempotent', async () => {
    const { host, lifecycle, advance } = fixture();
    const release = await host.enter();
    advance();
    expect(await host.tick()).toBe(false);
    release();
    release();
    expect(host.active).toBe(0);
    expect(lifecycle.pause).not.toHaveBeenCalled();
    expect(await host.tick()).toBe(false);
    advance();
    expect(await host.tick()).toBe(true);
  });

  it('keeps queued, running, and waiting work awake', async () => {
    const { host, lifecycle, advance } = fixture();
    lifecycle.pending.mockResolvedValue(true);
    advance();
    expect(await host.tick()).toBe(false);
    expect(lifecycle.pause).not.toHaveBeenCalled();
  });

  it('keeps metadata failures visible and never suspends on failure', async () => {
    const { host, lifecycle, advance } = fixture();
    lifecycle.pending.mockRejectedValue(new Error('offline'));
    advance();
    await expect(host.tick()).rejects.toThrow('offline');
    expect(lifecycle.pause).not.toHaveBeenCalled();
    const release = await host.enter();
    release();
    expect(host.active).toBe(0);
  });

  it('cancels suspension when a request arrives during the metadata query', async () => {
    const { host, lifecycle, advance } = fixture();
    let enter: Promise<() => void>;
    lifecycle.pending.mockImplementation(async () => {
      enter = host.enter();
      return false;
    });
    advance();
    expect(await host.tick()).toBe(false);
    (await enter!)();
    expect(lifecycle.pause).not.toHaveBeenCalled();
  });

  it('serializes resume for concurrent requests and performs idle maintenance', async () => {
    const { host, lifecycle, advance } = fixture();
    advance();
    await host.tick();
    expect(await host.tick()).toBe(true);
    expect(lifecycle.maintain).toHaveBeenCalledTimes(1);
    const before = lifecycle.resume.mock.calls.length;
    const releases = await Promise.all([host.enter(), host.enter()]);
    expect(lifecycle.paused).toBe(false);
    expect(lifecycle.resume.mock.calls.length).toBe(before + 2);
    for (const release of releases) release();
  });

  it('releases a rejected admission', async () => {
    const { host, lifecycle } = fixture();
    lifecycle.resume.mockRejectedValue(new Error('faulted'));
    await expect(host.enter()).rejects.toThrow('faulted');
    expect(host.active).toBe(0);
  });

  it('wakes queued work discovered during maintenance', async () => {
    const { host, lifecycle, advance } = fixture();
    advance();
    await host.tick();
    lifecycle.pending.mockResolvedValue(true);
    expect(await host.tick()).toBe(false);
    expect(lifecycle.paused).toBe(false);
  });

  it('finishes a maintenance-only cold start without another active idle window', async () => {
    const { host, lifecycle } = fixture();
    expect(await host.tick({ forceIdle: true })).toBe(true);
    expect(lifecycle.pause).toHaveBeenCalledTimes(1);
    expect(lifecycle.maintain).toHaveBeenCalledTimes(1);
  });
});

describe('streaming responses keep the host admitted', () => {
  it('releases at end while preserving headers and status', async () => {
    const release = vi.fn();
    const response = trackHostResponse(
      new Response('hello', { status: 201, headers: { 'x-owner': 'fixture' } }),
      release,
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('x-owner')).toBe('fixture');
    expect(await response.text()).toBe('hello');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases when a client cancels the response', async () => {
    const release = vi.fn();
    const response = trackHostResponse(new Response(new ReadableStream({})), release);
    await response.body!.cancel();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases a failed stream and preserves the failure', async () => {
    const release = vi.fn();
    const response = trackHostResponse(
      new Response(
        new ReadableStream({
          pull(c) {
            c.error(new Error('stream failed'));
          },
        }),
      ),
      release,
    );
    await expect(response.text()).rejects.toThrow('stream failed');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
