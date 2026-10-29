/**
 * TeacherScenarioLab — owner resolution for training routes.
 *
 * Tries the training session method first; a valid session resolves to the
 * account principal (with a `pendingClaim` attached when the request also
 * carries a valid anonymous cookie naming a different owner — the same rule
 * core applies to registered host methods). No session cookie → core
 * resolution via {@link withRequestOwner} (anonymous fallback, shared team,
 * single user — unchanged). A present-but-invalid session answers 401 and
 * clears the stale cookie, so the browser stops presenting it.
 *
 * The handler signature matches {@link withRequestOwner}: routes that need
 * the cookies (account creation sets the session, logout clears it, claim
 * clears the spent anonymous cookie) pass `responseHeaders` into the
 * response they build, exactly like the core claim route does. Routes that
 * ignore it behave exactly as they did under `withRequestOwner`.
 */
import { modelAuthorizationResponse } from '@/lib/server/api-response';
import { withAnonymousClaimCandidate } from '@/lib/server/identity';
import { resolveResponseSetCookies } from '@/lib/server/identity/set-cookie';
import type { OwnerAuthRequest, OwnerPrincipal } from '@/lib/server/identity/types';
import { invalidOwnerCredentialResponse, withRequestOwner } from '@/lib/server/identity/with-owner';

import { clearTrainingSessionCookieHeader, trainingSessionAuthMethod } from './session-auth';

export async function withTrainingOwner(
  req: OwnerAuthRequest,
  handler: (principal: OwnerPrincipal, responseHeaders: Headers) => Promise<Response>,
): Promise<Response> {
  const method = trainingSessionAuthMethod();
  let result;
  try {
    result = await method.authenticate(req);
  } catch (error) {
    // The session store is unreachable: the method cannot decide, so the
    // request fails as a server error (core's rule for a throwing method).
    console.error('[training-owner] training session lookup failed', error);
    return new Response('Internal Server Error', { status: 500 });
  }
  if (result.status === 'invalid') {
    const response = invalidOwnerCredentialResponse();
    response.headers.append('Set-Cookie', clearTrainingSessionCookieHeader());
    return response;
  }
  if (result.status !== 'authenticated') {
    return withRequestOwner(req, handler);
  }
  const principal = withAnonymousClaimCandidate(result.principal, req.headers);
  const responseHeaders = new Headers();
  try {
    return resolveResponseSetCookies(await handler(principal, responseHeaders));
  } catch (error) {
    const authorization = modelAuthorizationResponse(error);
    if (authorization) {
      responseHeaders.forEach((value, name) => authorization.headers.append(name, value));
      return resolveResponseSetCookies(authorization);
    }
    console.error('[training-owner] training request failed', error);
    return new Response('Internal Server Error', { status: 500, headers: responseHeaders });
  }
}
