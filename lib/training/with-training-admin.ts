/**
 * TeacherScenarioLab — admin-only wrapper for admin routes.
 *
 * Training owner resolution first, then the admin role check: anonymous
 * principals and non-admin accounts get 403 `TRAINING_ADMIN_REQUIRED`
 * (never a 404 oracle about whether the route exists). The check runs
 * before the handler, so no admin service function is reachable without
 * the role.
 */
import { apiError } from '@/lib/server/api-response';
import type { OwnerPrincipal } from '@/lib/server/identity/types';

import { requireTrainingAdmin } from './admin';
import { TrainingServiceError } from './store';
import { withTrainingOwner } from './with-training-owner';

export async function withTrainingAdmin(
  req: Parameters<typeof withTrainingOwner>[0],
  handler: (principal: OwnerPrincipal, responseHeaders: Headers) => Promise<Response>,
): Promise<Response> {
  return withTrainingOwner(req, async (principal, responseHeaders) => {
    try {
      requireTrainingAdmin(principal);
    } catch (error) {
      if (error instanceof TrainingServiceError) {
        const response = apiError(
          error.code as 'TRAINING_ADMIN_REQUIRED',
          error.status,
          error.message,
        );
        responseHeaders.forEach((value, name) => response.headers.append(name, value));
        return response;
      }
      throw error;
    }
    return handler(principal, responseHeaders);
  });
}
