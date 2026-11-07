import { AsyncLocalStorage } from 'node:async_hooks';

const requests = new AsyncLocalStorage();
const factoryKey = Symbol.for('teacherlab.postgres.request-pool-factory');
const counters = new Set([
  'totalCount',
  'idleCount',
  'waitingCount',
  'expiredCount',
  'ending',
  'ended',
]);

function endPool(scope, pool) {
  let ending = scope.endings.get(pool);
  if (!ending) {
    ending = pool.end();
    scope.endings.set(pool, ending);
  }
  return ending;
}

export function requestScopedPool(NativePool, options) {
  const facade = new NativePool(options);
  function nativePool() {
    const scope = requests.getStore();
    if (!scope || scope.closed)
      throw new Error('PostgreSQL operation is outside an active Worker request');
    let pool = scope.pools.get(facade);
    if (!pool) {
      pool = new NativePool(options);
      for (const event of ['error', 'connect', 'acquire', 'release', 'remove']) {
        pool.on(event, (...args) => facade.emit(event, ...args));
      }
      scope.pools.set(facade, pool);
    }
    return pool;
  }
  const proxy = new Proxy(facade, {
    get(target, property) {
      if (property === 'query' || property === 'connect') {
        return (...args) => nativePool()[property](...args);
      }
      if (property === 'end') {
        return (callback) => {
          const scope = requests.getStore();
          const pool = scope?.pools.get(facade);
          const ending = pool ? endPool(scope, pool) : Promise.resolve();
          return callback ? void ending.then(() => callback(), callback) : ending;
        };
      }
      if (counters.has(property)) {
        return requests.getStore()?.pools.get(facade)?.[property] ?? target[property];
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function'
        ? (...args) => {
            const result = Reflect.apply(value, target, args);
            return result === target ? proxy : result;
          }
        : value;
    },
  });
  return proxy;
}

export function installRequestPools(NativePool) {
  globalThis[factoryKey] = (options) => requestScopedPool(NativePool, options);
}

export async function withRequestPools(handler, request, env, context) {
  const scope = { pools: new Map(), endings: new Map(), closed: false };
  let closing;
  const close = () => {
    if (!closing) {
      scope.closed = true;
      closing = Promise.allSettled(
        [...scope.pools.values()].map((pool) => endPool(scope, pool)),
      ).finally(() => {
        scope.pools.clear();
        scope.endings.clear();
      });
      context.waitUntil(closing);
    }
    return closing;
  };
  return requests.run(scope, async () => {
    try {
      const response = await handler(request, env, context);
      if (!response.body) {
        await close();
        return response;
      }
      const reader = response.body.getReader();
      const body = new ReadableStream({
        pull(controller) {
          return requests.run(scope, async () => {
            try {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                await close();
              } else controller.enqueue(value);
            } catch (error) {
              controller.error(error);
              await close();
            }
          });
        },
        cancel(reason) {
          return requests.run(scope, async () => {
            try {
              await reader.cancel(reason);
            } finally {
              await close();
            }
          });
        },
      });
      return new Response(body, response);
    } catch (error) {
      await close();
      throw error;
    }
  });
}
