/**
 * TeacherScenarioLab training API: claim anonymous trainings into an account.
 *
 * POST → { claimed, fromOwnerId } plus the cleared anonymous cookie.
 * Only the pending claim counts: the request must present both a valid
 * account session and the anonymous cookie naming the owner to claim from
 * (attached as `pendingClaim` by the training owner resolution). A body
 * field naming an owner is deliberately ignored — presenting the cookie is
 * the proof, guessing an id is not. Anonymous callers get 403 (there is no
 * account to claim into); a request with no pending claim gets 409.
 * After the move, the old owner reads those trainings as not-found.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { pendingClaimClearCookies } from '@/lib/server/identity/registry';
import { claimAnonymousTrainings } from '@/lib/training/accounts';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return withTrainingOwner(req, async (principal, responseHeaders) => {
    try {
      if (principal.kind === 'anonymous') {
        const response = apiError(
          'TRAINING_ACCOUNT_REQUIRED',
          403,
          'claiming requires an account principal',
        );
        responseHeaders.forEach((value, name) => response.headers.append(name, value));
        return response;
      }
      const fromOwnerId = principal.pendingClaim?.fromOwnerId;
      if (!fromOwnerId) {
        const response = apiError(
          'TRAINING_NO_PENDING_CLAIM',
          409,
          'no pending anonymous claim on this request',
        );
        responseHeaders.forEach((value, name) => response.headers.append(name, value));
        return response;
      }
      const claimed = await claimAnonymousTrainings(principal.ownerId, fromOwnerId);
      for (const cookie of pendingClaimClearCookies()) {
        responseHeaders.append('Set-Cookie', cookie);
      }
      return NextResponse.json(
        { success: true, claimed, fromOwnerId },
        { headers: responseHeaders },
      );
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
