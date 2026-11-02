import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { accountJson, accountResponse } from '@/lib/server/accounts/http';
import { loginWithPassword } from '@/lib/server/accounts/password';
import { trainingSessionCookieHeader } from '@/lib/training/session-auth';
export const runtime = 'nodejs';
const schema = z
  .object({ email: z.string().max(254), password: z.string().min(1).max(128) })
  .strict();
export async function POST(req: NextRequest) {
  return accountResponse(async () => {
    const parsed = schema.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    const result = await loginWithPassword(req, parsed.data);
    return NextResponse.json(
      { success: true, accountId: result.accountId },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': trainingSessionCookieHeader(result.token),
        },
      },
    );
  });
}
