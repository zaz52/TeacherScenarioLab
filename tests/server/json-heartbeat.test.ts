import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonHeartbeat } from '@/lib/server/json-heartbeat';

afterEach(() => vi.useRealTimers());

describe('long JSON response transport', () => {
  it('returns a fast result as ordinary JSON and clears its timer', async () => {
    vi.useFakeTimers();
    const response = await jsonHeartbeat(Promise.resolve({ success: true }));
    expect(await response.json()).toEqual({ success: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('propagates a fast rejection so the route can preserve its error status', async () => {
    vi.useFakeTimers();
    await expect(jsonHeartbeat(Promise.reject(new Error('invalid fixture')))).rejects.toThrow(
      'invalid fixture',
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sends whitespace during a long operation and ends with one parseable result', async () => {
    vi.useFakeTimers();
    let finish!: (result: { passed: boolean }) => void;
    const operation = new Promise<{ passed: boolean }>((resolve) => (finish = resolve));
    const pending = jsonHeartbeat(operation, 10);
    await vi.advanceTimersByTimeAsync(10);
    const response = await pending;
    const reading = response.text();
    await vi.advanceTimersByTimeAsync(20);
    finish({ passed: false });
    const text = await reading;
    expect(text.startsWith(' \n')).toBe(true);
    expect(JSON.parse(text)).toEqual({ passed: false });
    expect(response.headers.get('cache-control')).toContain('no-transform');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fails the body when a long operation rejects and emits no success result', async () => {
    vi.useFakeTimers();
    let fail!: (error: Error) => void;
    const pending = jsonHeartbeat(new Promise((_, reject) => (fail = reject)), 10);
    await vi.advanceTimersByTimeAsync(10);
    const response = await pending;
    const reading = expect(response.json()).rejects.toThrow('Long JSON operation failed');
    fail(new Error('late fixture failure'));
    await reading;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops heartbeats when the reader cancels and handles subsequent rejection', async () => {
    vi.useFakeTimers();
    let fail!: (error: Error) => void;
    const pending = jsonHeartbeat(new Promise((_, reject) => (fail = reject)), 10);
    await vi.advanceTimersByTimeAsync(10);
    const response = await pending;
    await response.body!.cancel();
    fail(new Error('cancelled fixture'));
    await vi.advanceTimersByTimeAsync(100);
    expect(vi.getTimerCount()).toBe(0);
  });
});
