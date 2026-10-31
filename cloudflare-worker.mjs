import handler from './.open-next/worker.js';
import { DurableObject } from 'cloudflare:workers';

// One process-shaped host keeps Next's stores and background workers in one I/O context.
export class TeacherLabHost extends DurableObject {
  constructor(context, env) {
    super(context, env);
    this.executionContext = { waitUntil: (promise) => context.waitUntil(promise) };
    this.alarmReady = null;
  }

  scheduleHeartbeat() {
    this.alarmReady ??= (async () => {
      const previous = await this.ctx.storage.getAlarm();
      if (previous === null || previous <= Date.now()) {
        await this.ctx.storage.setAlarm(Date.now() + 60000);
      }
    })().catch((error) => {
      this.alarmReady = null;
      throw error;
    });
    return this.alarmReady;
  }

  async fetch(request) {
    await this.scheduleHeartbeat();
    return handler.fetch(request, this.env, this.executionContext);
  }

  async alarm() {
    this.alarmReady = null;
    await this.scheduleHeartbeat();
    const response = await handler.fetch(
      new Request('https://teacherlab-host.internal/api/health'),
      this.env,
      this.executionContext,
    );
    await response.arrayBuffer();
    if (!response.ok) throw new Error('Durable application host health check failed');
  }
}

const worker = {
  fetch(request, env) {
    const id = env.APPLICATION_HOST.idFromName('teacherlab-application-v1');
    return env.APPLICATION_HOST.get(id).fetch(request);
  },
};
export default worker;
