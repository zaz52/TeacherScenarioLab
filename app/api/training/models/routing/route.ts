import { NextResponse, type NextRequest } from 'next/server';
import { withSignedIn, accountJson } from '@/lib/server/accounts/http';
import {
  readUserRouting,
  saveUserRouting,
  userRoutingSchema,
} from '@/lib/training/user-model-routing';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  return withSignedIn(req, async (p) =>
    NextResponse.json(
      { success: true, routing: await readUserRouting(p.ownerId) },
      { headers: { 'Cache-Control': 'no-store' } },
    ),
  );
}
export async function PUT(req: NextRequest) {
  return withSignedIn(req, async (p) => {
    const parsed = userRoutingSchema.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    await saveUserRouting(p.ownerId, parsed.data);
    return NextResponse.json({ success: true });
  });
}
