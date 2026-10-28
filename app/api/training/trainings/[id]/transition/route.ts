/**
 * TeacherScenarioLab training API: stage progression.
 *
 * POST { to } — moves the training to a later state when the state
 * machine allows it (created → briefing → fact-checking → coordination →
 * proposal → evaluation → completed). The move and its ledger event
 * commit atomically. Illegal moves fail with 409.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { isTrainingState } from '@/lib/training/state-machine';
import { transitionTraining } from '@/lib/training/store';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { to?: unknown } = {};
  try {
    body = ((await req.json()) ?? {}) as { to?: unknown };
  } catch {
    return apiError('INVALID_REQUEST', 400, 'invalid JSON body');
  }
  if (typeof body.to !== 'string' || !isTrainingState(body.to)) {
    return apiError('INVALID_REQUEST', 400, 'to must be a valid training state');
  }
  // Hoist out of the closure: property narrowing does not survive into it.
  const to = body.to;
  return withTrainingOwner(req, async (principal) => {
    try {
      const training = await transitionTraining(principal.ownerId, id, to);
      return NextResponse.json({ success: true, training });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
