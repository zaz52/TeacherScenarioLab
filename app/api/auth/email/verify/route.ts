import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { accountJson, accountResponse } from '@/lib/server/accounts/http';
import { verifyEmailCode } from '@/lib/server/accounts/email-auth';
import { newPasswordSchema } from '@/lib/server/accounts/password';
import {
  trainingSessionAuthMethod,
  trainingSessionCookieHeader,
  clearTrainingSessionCookieHeader,
} from '@/lib/training/session-auth';
export const runtime = 'nodejs';
const schema = z
  .object({
    challengeId: z.string().uuid(),
    code: z.string().regex(/^\d{6}$/),
    password: newPasswordSchema.optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  return accountResponse(async () => {
    const parsed = schema.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    const current = await trainingSessionAuthMethod().authenticate(req);
    const owner = current.status === 'authenticated' ? current.principal.ownerId : undefined;
    const result = await verifyEmailCode(parsed.data, owner);
    const response = NextResponse.json({
      success: true,
      accountId: result.accountId,
      purpose: result.purpose,
    });
    if (result.token)
      response.headers.append('Set-Cookie', trainingSessionCookieHeader(result.token));
    else if (result.purpose === 'reset')
      response.headers.append('Set-Cookie', clearTrainingSessionCookieHeader());
    response.headers.set('Cache-Control', 'no-store');
    return response;
  });
}
