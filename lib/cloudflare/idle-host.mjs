const KEY = Symbol.for('teacherlab.worker-background-lifecycle');
export const currentLifecycle = () => globalThis[KEY];

export class IdleHost {
  constructor({ lifecycle = currentLifecycle, now = Date.now, idleMs = 600000 } = {}) {
    this.lifecycle = lifecycle;
    this.now = now;
    this.idleMs = idleMs;
    this.active = 0;
    this.version = 0;
    this.lastActivity = now();
    this.chain = Promise.resolve();
  }

  serial(operation) {
    const result = this.chain.then(operation);
    this.chain = result.catch(() => undefined);
    return result;
  }

  async enter() {
    this.active++;
    this.version++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.active--;
      this.version++;
      this.lastActivity = this.now();
    };
    try {
      await this.serial(async () => {
        const lifecycle = this.lifecycle();
        if (lifecycle) {
          const wasPaused = lifecycle.paused;
          await lifecycle.resume();
          if (wasPaused) console.info('[TeacherLabHost] background schedules resumed');
        }
      });
      return release;
    } catch (error) {
      release();
      throw error;
    }
  }

  tick({ forceIdle = false } = {}) {
    return this.serial(async () => {
      const lifecycle = this.lifecycle();
      if (!lifecycle || this.active > 0) return false;
      const maintain = async () => {
        await lifecycle.maintain();
        console.info('[TeacherLabHost] idle maintenance completed');
        if (await lifecycle.pending()) {
          await lifecycle.resume();
          console.info('[TeacherLabHost] background schedules resumed');
        }
        return lifecycle.paused;
      };
      if (lifecycle.paused) return maintain();
      if (!forceIdle && this.now() - this.lastActivity < this.idleMs) return false;
      const version = this.version;
      if (await lifecycle.pending()) return false;
      // A request can arrive while the metadata query awaits PostgreSQL. Its
      // handler waits on this transition and must never race suspension.
      if (this.active > 0 || this.version !== version) return false;
      await lifecycle.pause();
      console.info('[TeacherLabHost] background schedules paused');
      if (forceIdle) return maintain();
      return true;
    });
  }
}

/** Keep streaming HTTP responses admitted until close, failure or cancellation. */
export function trackHostResponse(response, release) {
  if (!response.body) {
    release();
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          release();
          controller.close();
        } else controller.enqueue(next.value);
      } catch (error) {
        release();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    },
  });
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
