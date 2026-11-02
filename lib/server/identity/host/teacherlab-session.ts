import { configureOwnerAuthentication } from '@/lib/server/identity';
import { trainingSessionAuthMethod } from '@/lib/training/session-auth';
const key = Symbol.for('teacherlab.identity.registered');
export function registerTeacherlabIdentity() {
  const state = globalThis as typeof globalThis & { [key]?: boolean };
  if (state[key]) return;
  const method = trainingSessionAuthMethod();
  configureOwnerAuthentication({
    methods: [
      {
        ...method,
        authenticate: async (req) => {
          const result = await method.authenticate(req);
          if (result.status !== 'not-applicable' || !req.url) return result;
          const pathname = new URL(req.url, 'http://localhost').pathname;
          const publicPaths = [
            '/api/auth/session',
            '/api/training/accounts/me',
            '/api/model-config',
            '/api/server-providers',
            '/api/generate-classroom/capabilities',
          ];
          if (
            pathname.startsWith('/api/') &&
            !publicPaths.includes(pathname) &&
            !pathname.startsWith('/api/training/scenarios') &&
            !pathname.startsWith('/api/training/references')
          )
            return { status: 'invalid' as const, reason: 'email login required' };
          return result;
        },
      },
    ],
    anonymousFallback: true,
  });
  state[key] = true;
}
