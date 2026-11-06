import { NextRequest, NextResponse } from 'next/server';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { getEmergencyBoard, recordEmergencyDecision } from '@/lib/training/emergency-service';
import { isSameOriginJsonRequest } from '@/lib/persistence/owner-claim-http';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal, headers) => {
    headers.set('Cache-Control', 'private, no-store');
    try {
      return NextResponse.json(
        { success: true, board: await getEmergencyBoard(principal.ownerId, id) },
        { headers },
      );
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
export async function POST(req: NextRequest, { params }: Context) {
  if (!isSameOriginJsonRequest(req))
    return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 403 });
  const { id } = await params;
  return withTrainingOwner(req, async (principal, headers) => {
    headers.set('Cache-Control', 'private, no-store');
    const reader = req.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST' },
        { status: 400, headers },
      );
    let size = 0,
      raw = '';
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 16384) {
          await reader.cancel();
          return NextResponse.json(
            { success: false, error: 'INVALID_REQUEST' },
            { status: 413, headers },
          );
        }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST' },
        { status: 400, headers },
      );
    }
    try {
      const saved = await recordEmergencyDecision(principal.ownerId, id, input);
      return NextResponse.json({ success: true, ...saved }, { headers });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
