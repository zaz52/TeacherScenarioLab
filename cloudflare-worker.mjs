import handler from './.open-next/worker.js';
import { DurableObject } from 'cloudflare:workers';
import {
  createStartupGate,
  currentLifecycle,
  IdleHost,
  trackHostResponse,
} from './lib/cloudflare/idle-host.mjs';

function interval(value, fallback) {
  const number = value?.trim() ? Number(value) : fallback;
  if (!Number.isSafeInteger(number) || number < 1000 || number > 86400000) {
    throw new Error('Worker lifecycle interval must be between 1000 and 86400000 milliseconds');
  }
  return number;
}

// One process-shaped host keeps Next's stores and background workers in one I/O context.
export class TeacherLabHost extends DurableObject {
  constructor(context, env) {
    super(context, env);
    this.executionContext = { waitUntil: (promise) => context.waitUntil(promise) };
    this.heartbeatMs = interval(env.TEACHERLAB_HEARTBEAT_MS, 60000);
    this.maintenanceMs = interval(env.TEACHERLAB_MAINTENANCE_INTERVAL_MS, 1800000);
    this.idle = new IdleHost({ idleMs: interval(env.TEACHERLAB_IDLE_TIMEOUT_MS, 600000) });
    this.alarmReady = Promise.resolve();
    this.receivedRequest = false;
    this.ensureStarted = createStartupGate({
      ready: currentLifecycle,
      start: async () => {
        const response = await handler.fetch(
          new Request('https://teacherlab-host.internal/api/health'),
          this.env,
          this.executionContext,
        );
        await response.arrayBuffer();
        if (!response.ok) throw new Error('Durable application host health check failed');
      },
    });
  }

  scheduleHeartbeat(delay = this.heartbeatMs) {
    const next = this.alarmReady.then(async () => {
      const previous = await this.ctx.storage.getAlarm();
      const desired = Date.now() + delay;
      if (previous === null || previous <= Date.now() || previous > desired) {
        await this.ctx.storage.setAlarm(desired);
      }
    });
    this.alarmReady = next.catch(() => undefined);
    return next;
  }

  async fetch(request) {
    this.receivedRequest = true;
    const release = await this.idle.enter();
    try {
      await this.ensureStarted();
      await this.scheduleHeartbeat();
      return trackHostResponse(
        await handler.fetch(request, this.env, this.executionContext),
        release,
      );
    } catch (error) {
      release();
      throw error;
    }
  }

  async alarm() {
    try {
      await this.ensureStarted();
      // A maintenance-only cold start must not open another full idle window.
      const paused = await this.idle.tick({ forceIdle: !this.receivedRequest });
      await this.scheduleHeartbeat(paused ? this.maintenanceMs : this.heartbeatMs);
    } catch (error) {
      await this.scheduleHeartbeat();
      throw error;
    }
  }
}

const worker = {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/training' || path.startsWith('/api/training/')) {
      if (!env.TRAINING_API) return new Response('Service Unavailable', { status: 503 });
      return env.TRAINING_API.fetch(request);
    }
    const id = env.APPLICATION_HOST.idFromName('teacherlab-application-v1');
    return env.APPLICATION_HOST.get(id).fetch(request);
  },
};
export default worker;
