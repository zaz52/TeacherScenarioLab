import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { accountJson, accountResponse } from '@/lib/server/accounts/http';
import { verifyEmailCode } from '@/lib/server/accounts/email-auth';
import {
  trainingSessionAuthMethod,
  trainingSessionCookieHeader,
} from '@/lib/training/session-auth';
export const runtime = 'nodejs';
const schema = z
  .object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
export async function POST(req: NextRequest) {
  return accountResponse(async () => {
    const parsed = schema.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    const current = await trainingSessionAuthMethod().authenticate(req);
    const owner = current.status === 'authenticated' ? current.principal.ownerId : undefined;
    const result = await verifyEmailCode(parsed.data, owner);
    const response = NextResponse.json({ success: true, accountId: result.accountId });
    response.headers.append('Set-Cookie', trainingSessionCookieHeader(result.token));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  });
}
