import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { accountJson, accountResponse, withSignedIn } from '@/lib/server/accounts/http';
import { requestEmailCode } from '@/lib/server/accounts/email-auth';
export const runtime = 'nodejs';
const schema = z
  .object({
    email: z.string().max(254),
    displayName: z.string().max(200).optional(),
    purpose: z.enum(['login', 'bind', 'register', 'reset']).default('login'),
  })
  .strict();
export async function POST(req: NextRequest) {
  return accountResponse(async () => {
    const parsed = schema.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    const input = parsed.data;
    if (input.purpose === 'bind')
      return withSignedIn(req, async (principal) =>
        NextResponse.json({
          success: true,
          ...(await requestEmailCode(req, input, principal.ownerId)),
        }),
      );
    return NextResponse.json({ success: true, ...(await requestEmailCode(req, input)) });
  });
}
