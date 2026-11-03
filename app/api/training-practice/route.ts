import { NextRequest, NextResponse } from 'next/server';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { createTraining, getTraining, listEvents } from '@/lib/training/store';
import { trainingErrorResponse } from '@/lib/training/http';
import { parsePractice, practiceFromEvents } from '@/lib/training/practice-config';
import { isSameOriginJsonRequest } from '@/lib/persistence/owner-claim-http';
export const runtime = 'nodejs';
async function bodyText(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > 16384) return null;
  const reader = req.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 16384) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(part.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export async function POST(req: NextRequest) {
  if (!isSameOriginJsonRequest(req))
    return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 403 });
  return withTrainingOwner(req, async (principal, headers) => {
    headers.set('Cache-Control', 'private, no-store');
    const raw = await bodyText(req);
    if (raw === null)
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST' },
        { status: 413, headers },
      );
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(raw);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error();
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST' },
        { status: 400, headers },
      );
    }
    try {
      if (typeof input.sourceTrainingId === 'string' && input.sourceTrainingId.length <= 100) {
        const original = await getTraining(principal.ownerId, input.sourceTrainingId);
        if (!original)
          return NextResponse.json(
            { success: false, error: 'TRAINING_NOT_FOUND' },
            { status: 404, headers },
          );
        const practice =
          practiceFromEvents(await listEvents(principal.ownerId, original.id)) ?? undefined;
        const training = await createTraining(principal.ownerId, {
          scenarioId: original.scenarioId,
          scenarioVersion: original.scenarioVersion,
          practice,
        });
        return NextResponse.json({ success: true, training, practice }, { status: 201, headers });
      }
      const practice = parsePractice(input.practice);
      if (
        !practice ||
        typeof input.scenarioId !== 'string' ||
        typeof input.scenarioVersion !== 'number'
      )
        return NextResponse.json(
          { success: false, error: 'INVALID_REQUEST' },
          { status: 400, headers },
        );
      const training = await createTraining(principal.ownerId, {
        scenarioId: input.scenarioId,
        scenarioVersion: input.scenarioVersion,
        practice,
      });
      return NextResponse.json({ success: true, training, practice }, { status: 201, headers });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
