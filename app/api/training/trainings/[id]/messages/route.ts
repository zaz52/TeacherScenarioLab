/**
 * TeacherScenarioLab training API: learner messages for one training.
 *
 * POST appends a user message (idempotency-keyed: a replay returns the
 * first message with deduped: true and status 200). GET lists messages;
 * superseded messages are hidden unless ?includeSuperseded=true.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { appendUserMessage, listMessages } from '@/lib/training/store';

export const runtime = 'nodejs';

interface PostMessageBody {
  content?: unknown;
  idempotencyKey?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: PostMessageBody = {};
  try {
    body = ((await req.json()) ?? {}) as PostMessageBody;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'invalid JSON body');
  }
  return withTrainingOwner(req, async (principal) => {
    try {
      const result = await appendUserMessage(principal.ownerId, id, {
        content: typeof body.content === 'string' ? body.content : '',
        idempotencyKey:
          typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
      });
      return NextResponse.json(
        { success: true, message: result.message, deduped: result.deduped },
        { status: result.deduped ? 200 : 201 },
      );
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const includeSuperseded =
    new URL(req.url).searchParams.get('includeSuperseded') === 'true';
  return withTrainingOwner(req, async (principal) => {
    try {
      const messages = await listMessages(principal.ownerId, id, includeSuperseded);
      return NextResponse.json({ success: true, messages });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
