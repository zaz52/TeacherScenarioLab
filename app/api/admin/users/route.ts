import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { accountJson, withSiteAdmin } from '@/lib/server/accounts/http';
import { listPeople, addPerson, updatePerson } from '@/lib/server/accounts/people';
import { ADMIN_PERMISSIONS } from '@/lib/training/admin-permissions';
export const runtime = 'nodejs';
const create = z
  .object({
    email: z.string().max(254),
    displayName: z.string().max(200).optional(),
    admin: z.boolean().default(false),
    permissions: z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length).optional(),
  })
  .strict();
const update = z
  .object({
    accountId: z.string().regex(/^acct:[a-f0-9-]{36}$/),
    admin: z.boolean().optional(),
    disabled: z.boolean().optional(),
    permissions: z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length).optional(),
  })
  .strict();
export async function GET(req: NextRequest) {
  return withSiteAdmin(req, async () =>
    NextResponse.json(
      { success: true, users: await listPeople() },
      { headers: { 'Cache-Control': 'no-store' } },
    ),
  );
}
export async function POST(req: NextRequest) {
  return withSiteAdmin(req, async (principal) => {
    const parsed = create.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    return NextResponse.json(
      { success: true, accountId: await addPerson(principal.ownerId, parsed.data) },
      { status: 201 },
    );
  });
}
export async function PATCH(req: NextRequest) {
  return withSiteAdmin(req, async (principal) => {
    const parsed = update.safeParse(await accountJson(req));
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
    await updatePerson(principal.ownerId, parsed.data);
    return NextResponse.json({ success: true });
  });
}
