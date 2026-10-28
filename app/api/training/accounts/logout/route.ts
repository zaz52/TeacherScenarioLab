/**
 * TeacherScenarioLab training API: log out.
 *
 * POST → 200, drops the presented session server-side (when there is one)
 * and clears the session cookie. Anonymous callers get the same 200 and the
 * same cleared cookie: logout never oracles whether a session existed.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { deleteTrainingSession } from '@/lib/training/accounts';
import {
  clearTrainingSessionCookieHeader,
  readTrainingSessionToken,
} from '@/lib/training/session-auth';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = readTrainingSessionToken(req.headers);
  return withTrainingOwner(req, async (_principal, responseHeaders) => {
    if (token !== undefined) await deleteTrainingSession(token);
    responseHeaders.append('Set-Cookie', clearTrainingSessionCookieHeader());
    return NextResponse.json({ success: true }, { headers: responseHeaders });
  });
}
