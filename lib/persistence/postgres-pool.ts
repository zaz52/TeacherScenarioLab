import { Pool as NodePool, type PoolConfig } from 'pg';

const factoryKey = Symbol.for('teacherlab.postgres.request-pool-factory');
type RuntimeGlobals = typeof globalThis & {
  [factoryKey]?: (options?: PoolConfig) => NodePool;
};

// Node retains node-postgres construction. The Worker entry supplies request-scoped sockets.
export const Pool: typeof NodePool = new Proxy(NodePool, {
  construct(target, args, newTarget) {
    const factory = (globalThis as RuntimeGlobals)[factoryKey];
    return factory ? factory(args[0]) : Reflect.construct(target, args, newTarget);
  },
});
export type Pool = NodePool;
