import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { requestScopedPool, withRequestPools } from '../../lib/cloudflare/request-pools.mjs';

class FakePool extends EventEmitter {
  static instances: FakePool[] = [];
  id = FakePool.instances.push(this);
  ends = 0;
  queries: string[] = [];
  constructor(public options?: object) {
    super();
  }
  async query(sql: string) {
    this.queries.push(sql);
    return { id: this.id };
  }
  async connect() {
    return { query: (sql: string) => this.query(sql), release() {} };
  }
  async end() {
    this.ends++;
  }
}

async function run(handler: () => Promise<Response>) {
  const pending: Promise<unknown>[] = [];
  const response = await withRequestPools(
    handler,
    new Request('http://localhost'),
    {},
    { waitUntil: (promise: Promise<unknown>) => pending.push(promise) },
  );
  return { response, pending };
}

describe('Worker PostgreSQL request lifetime', () => {
  it('reuses within a request and separates simultaneous requests', async () => {
    const pool = requestScopedPool(FakePool, {});
    const handler = async () =>
      Response.json([await pool.query('first'), await pool.query('second')]);
    const [a, b] = await Promise.all([run(handler), run(handler)]);
    const [first, second] = await Promise.all([a.response.json(), b.response.json()]);
    expect(first[0].id).toBe(first[1].id);
    expect(second[0].id).toBe(second[1].id);
    expect(first[0].id).not.toBe(second[0].id);
    await Promise.all([...a.pending, ...b.pending]);
    expect(FakePool.instances[first[0].id - 1].ends).toBe(1);
    expect(FakePool.instances[second[0].id - 1].ends).toBe(1);
  });

  it('pins transactions to the checked-out client and ends once', async () => {
    const pool = requestScopedPool(FakePool, {});
    const result = await run(async () => {
      const client = await pool.connect();
      const begin = await client.query('BEGIN');
      const rollback = await client.query('ROLLBACK');
      client.release();
      await pool.end();
      return Response.json([begin, rollback]);
    });
    const ids = await result.response.json();
    await Promise.all(result.pending);
    expect(ids[0].id).toBe(ids[1].id);
    expect(FakePool.instances[ids[0].id - 1].ends).toBe(1);
  });

  it('keeps a connection available while a response body is streaming', async () => {
    const pool = requestScopedPool(FakePool, {});
    let pulls = 0;
    let id = 0;
    const result = await run(
      async () =>
        new Response(
          new ReadableStream({
            async pull(controller) {
              id = (await pool.query('stream')).id;
              if (pulls++ === 0) controller.enqueue(new TextEncoder().encode('first'));
              else controller.close();
            },
          }),
        ),
    );
    expect(await result.response.text()).toBe('first');
    await Promise.all(result.pending);
    expect(FakePool.instances[id - 1].queries).toEqual(['stream', 'stream']);
    expect(FakePool.instances[id - 1].ends).toBe(1);
  });

  it('closes on a thrown handler and preserves the original error', async () => {
    const pool = requestScopedPool(FakePool, {});
    let id = 0;
    await expect(
      run(async () => {
        id = (await pool.query('before-error')).id;
        throw new Error('original failure');
      }),
    ).rejects.toThrow('original failure');
    expect(FakePool.instances[id - 1].ends).toBe(1);
  });

  it('closes on response cancellation', async () => {
    const pool = requestScopedPool(FakePool, {});
    let id = 0;
    const result = await run(async () => {
      id = (await pool.query('before-cancel')).id;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1]));
          },
        }),
      );
    });
    await result.response.body!.cancel();
    await Promise.all(result.pending);
    expect(FakePool.instances[id - 1].ends).toBe(1);
  });

  it('retains event chaining and rejects database I/O outside a request', () => {
    const pool = requestScopedPool(FakePool, {});
    expect(pool.on('error', () => {})).toBe(pool);
    expect(() => pool.query('outside')).toThrow('outside an active Worker request');
  });
});
