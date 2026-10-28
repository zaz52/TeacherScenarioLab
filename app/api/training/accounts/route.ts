/**
 * TeacherScenarioLab training API: create an account.
 *
 * POST { displayName? } → 201 { account, expiresAt } plus a `Set-Cookie`
 * carrying the session token. The token itself is never in the JSON body:
 * the cookie is the only place it goes. Anyone may create an account
 * (anonymous minting, like the anonymous owner); admin is never granted
 * here — only the deployment's `TRAINING_ADMIN_ACCOUNT_IDS` list grants it.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { createTrainingAccount } from '@/lib/training/accounts';
import { trainingErrorResponse } from '@/lib/training/http';
import { trainingSessionCookieHeader } from '@/lib/training/session-auth';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return apiError('INVALID_REQUEST', 400, 'invalid JSON body');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return apiError('INVALID_REQUEST', 400, 'request body must be an object');
  }
  const displayName = (body as Record<string, unknown>).displayName;
  if (displayName !== undefined && typeof displayName !== 'string') {
    return apiError('INVALID_REQUEST', 400, 'displayName must be a string');
  }
  return withTrainingOwner(req, async (_principal, responseHeaders) => {
    try {
      const { account, token, expiresAt } = await createTrainingAccount(displayName);
      responseHeaders.append('Set-Cookie', trainingSessionCookieHeader(token));
      return NextResponse.json(
        { success: true, account, expiresAt },
        { status: 201, headers: responseHeaders },
      );
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
