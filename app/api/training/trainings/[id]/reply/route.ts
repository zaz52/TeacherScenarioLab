/**
 * TeacherScenarioLab training API: one single-role character reply.
 *
 * POST { characterId, mode? } — mode defaults to 'model' (the real
 * experience); 'scripted' plays the character pack's deterministic demo
 * script and is how the room works without model keys. The reply is
 * persisted as a `character` message and ledgered with its mode.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withRequestOwner } from '@/lib/server/identity/with-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { generateCharacterReply, type ReplyMode } from '@/lib/training/roleplay';

export const runtime = 'nodejs';

interface ReplyBody {
  characterId?: unknown;
  mode?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: ReplyBody = {};
  try {
    body = ((await req.json()) ?? {}) as ReplyBody;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'invalid JSON body');
  }
  const characterId = typeof body.characterId === 'string' ? body.characterId : '';
  if (!characterId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'characterId is required');
  }
  const mode: ReplyMode =
    body.mode === 'scripted' || body.mode === 'model' ? body.mode : 'model';
  return withRequestOwner(req, async (principal) => {
    try {
      const result = await generateCharacterReply(principal.ownerId, id, {
        characterId,
        mode,
      });
      return NextResponse.json(
        { success: true, message: result.message, mode: result.mode },
        { status: 201 },
      );
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
