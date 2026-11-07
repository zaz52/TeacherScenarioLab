import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSignedIn } from '@/lib/server/accounts/http';
import { isSameOriginJsonRequest } from '@/lib/persistence/owner-claim-http';
import { removedItems, updateLibrary } from '@/lib/training/library';
export const runtime = 'nodejs';
export function GET(req: NextRequest) {
  return withSignedIn(req, async (principal, headers) => {
    headers.set('Cache-Control', 'no-store');
    return NextResponse.json({ items: await removedItems(principal.ownerId) }, { headers });
  });
}
const schema = z
  .object({
    kind: z.enum(['scenario', 'training']),
    key: z.string().min(1).max(240),
    action: z.enum(['remove', 'restore']),
  })
  .strict();
export function PUT(req: NextRequest) {
  return withSignedIn(req, async (principal, headers) => {
    headers.set('Cache-Control', 'no-store');
    if (!isSameOriginJsonRequest(req))
      return NextResponse.json({ error: 'REQUEST_REFUSED' }, { status: 403, headers });
    if (Number(req.headers.get('content-length') ?? 0) > 2048)
      return NextResponse.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413, headers });
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    let raw: unknown;
    try {
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > 2048) {
          await reader.cancel();
          return NextResponse.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413, headers });
        }
        chunks.push(item.value);
      }
      raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400, headers });
    } finally {
      reader.releaseLock();
    }
    const input = schema.safeParse(raw);
    if (!input.success)
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400, headers });
    await updateLibrary(principal.ownerId, input.data);
    return NextResponse.json({ success: true }, { headers });
  });
}
