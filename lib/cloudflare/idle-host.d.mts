import type { WorkerLifecycle } from '../server/worker-lifecycle';

type HostLifecycle = Pick<WorkerLifecycle, 'paused' | 'pending' | 'pause' | 'resume' | 'maintain'>;

export function currentLifecycle(): WorkerLifecycle | undefined;
export class IdleHost {
  constructor(options?: {
    lifecycle?: () => HostLifecycle | undefined;
    now?: () => number;
    idleMs?: number;
  });
  active: number;
  enter(): Promise<() => void>;
  tick(options?: { forceIdle?: boolean }): Promise<boolean>;
}
export function trackHostResponse(response: Response, release: () => void): Response;
