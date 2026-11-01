import { DurableObject } from 'cloudflare:workers';
import config from './next.config';
import { dispatchTrainingRequest } from './lib/cloudflare/training-router.mjs';
import { installTrainingNetwork } from './lib/cloudflare/training-network.mjs';

installTrainingNetwork();

export class TrainingApiHost extends DurableObject {
  constructor(context, env) {
    super(context, env);
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') process.env[key] = value;
    }
  }

  async fetch(request) {
    try {
      const response = await dispatchTrainingRequest(request);
      const headers = new Headers(response.headers);
      for (const rule of (await config('phase-production-server').headers()) ?? []) {
        if (rule.source === '/(.*)') {
          for (const header of rule.headers) headers.set(header.key, header.value);
        }
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      let message = String(error?.message ?? 'Unknown request failure');
      for (const [key, value] of Object.entries(this.env)) {
        if (typeof value === 'string' && /KEY|TOKEN|SECRET|DATABASE_URL/.test(key) && value) {
          message = message.replaceAll(value, '[REDACTED]');
        }
      }
      console.error('[TrainingApiHost] request failed', error?.name ?? 'Error', message);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

const worker = {
  fetch(request, env) {
    const id = env.TRAINING_HOST.idFromName('teacherlab-training-api-v1');
    return env.TRAINING_HOST.get(id).fetch(request);
  },
};
export default worker;
