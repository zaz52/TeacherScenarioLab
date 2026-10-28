/**
 * TeacherScenarioLab training API: read the stored evaluation.
 *
 * GET returns the latest evaluation, or 404 when the training has not
 * been evaluated yet. A missing training is also 404 (same shape).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { getEvaluation } from '@/lib/training/evaluation';
import { trainingErrorResponse } from '@/lib/training/http';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal) => {
    try {
      const evaluation = await getEvaluation(principal.ownerId, id);
      if (!evaluation) {
        return apiError('TRAINING_NOT_FOUND', 404, `training ${id} has no evaluation yet`);
      }
      return NextResponse.json({ success: true, evaluation });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
