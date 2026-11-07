export interface BackgroundHandle {
  stop(options?: { idle?: boolean }): Promise<boolean>;
  busy(): boolean;
}

export interface WorkerLifecycle {
  readonly paused: boolean;
  pending(): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  maintain(): Promise<void>;
  shutdown(): Promise<void>;
}

interface LifecycleDependencies {
  start(): Promise<BackgroundHandle>;
  pending(): Promise<boolean>;
  maintain(): Promise<void>;
  close(): Promise<void>;
}

const KEY = Symbol.for('teacherlab.worker-background-lifecycle');
const state = globalThis as typeof globalThis & { [KEY]?: WorkerLifecycle };

export function installWorkerLifecycle(lifecycle: WorkerLifecycle): void {
  state[KEY] = lifecycle;
}

/** Node keeps its normal startup and SIGTERM behavior; only the host pauses. */
export async function createWorkerLifecycle(
  dependencies: LifecycleDependencies,
): Promise<WorkerLifecycle> {
  let handle = await dependencies.start();
  let paused = false;
  let fault: Error | undefined;
  let chain: Promise<void> = Promise.resolve();
  let shutdownPromise: Promise<void> | undefined;
  const serial = (operation: () => Promise<void>): Promise<void> => {
    const next = chain.then(operation);
    chain = next.catch(() => undefined);
    return next;
  };
  const requireHealthy = () => {
    if (fault) throw fault;
    if (shutdownPromise) throw new Error('Background host has shut down');
  };
  return {
    get paused() {
      return paused;
    },
    async pending() {
      requireHealthy();
      if (handle.busy()) return true;
      const pending = await dependencies.pending();
      return handle.busy() || pending;
    },
    pause: () =>
      serial(async () => {
        requireHealthy();
        if (paused) return;
        try {
          if (!(await handle.stop({ idle: true })))
            throw new Error('Background schedules did not drain');
          paused = true;
        } catch (error) {
          fault = error instanceof Error ? error : new Error('Background suspension failed');
          throw fault;
        }
      }),
    resume: () =>
      serial(async () => {
        requireHealthy();
        if (!paused) return;
        try {
          handle = await dependencies.start();
          paused = false;
        } catch (error) {
          fault = error instanceof Error ? error : new Error('Background restart failed');
          throw fault;
        }
      }),
    maintain: () =>
      serial(async () => {
        requireHealthy();
        if (paused) await dependencies.maintain();
      }),
    shutdown() {
      shutdownPromise ??= serial(async () => {
        try {
          if (!paused) await handle.stop();
        } finally {
          await dependencies.close();
        }
      });
      return shutdownPromise;
    },
  };
}
