/**
 * TeacherScenarioLab training API: move a created training into briefing.
 * Only the created state can start; anything else is a 409.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { startTraining } from '@/lib/training/store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal) => {
    try {
      const training = await startTraining(principal.ownerId, id);
      return NextResponse.json({ success: true, training });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
