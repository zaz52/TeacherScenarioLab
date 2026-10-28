/**
 * TeacherScenarioLab training API: fetch one of your trainings.
 * A foreign or missing id reads as not-found (no existence oracle).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { getTraining } from '@/lib/training/store';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal) => {
    try {
      const training = await getTraining(principal.ownerId, id);
      if (!training) {
        return apiError('TRAINING_NOT_FOUND', 404, `training ${id} was not found`);
      }
      return NextResponse.json({ success: true, training });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
