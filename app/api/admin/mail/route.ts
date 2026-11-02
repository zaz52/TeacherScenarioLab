import { NextResponse, type NextRequest } from 'next/server';
import { accountJson, withSiteAdmin } from '@/lib/server/accounts/http';
import { saveSmtp, smtpSchema, smtpView } from '@/lib/server/accounts/mail';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  return withSiteAdmin(req, async () =>
    NextResponse.json(
      { success: true, settings: await smtpView() },
      { headers: { 'Cache-Control': 'no-store' } },
    ),
  );
}
export async function PUT(req: NextRequest) {
  return withSiteAdmin(req, async () => {
    const parsed = smtpSchema.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    await saveSmtp(parsed.data);
    return NextResponse.json({ success: true, settings: await smtpView() });
  });
}
