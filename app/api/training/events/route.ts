/**
 * TeacherScenarioLab training API: the caller's event center ledger.
 * Own trainings only, newest first. Optional ?trainingId= and ?type=
 * narrow the timeline.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { listOwnEvents } from '@/lib/training/events';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const trainingId = req.nextUrl.searchParams.get('trainingId') ?? undefined;
  const type = req.nextUrl.searchParams.get('type') ?? undefined;
  return withTrainingOwner(req, async (principal) => {
    try {
      const events = await listOwnEvents(principal.ownerId, { trainingId, type });
      return NextResponse.json({ success: true, events });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
