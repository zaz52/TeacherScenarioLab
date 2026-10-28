/**
 * TeacherScenarioLab training API: the caller's training records with
 * five-dimension trends. Own trainings only; unevaluated trainings
 * appear with a null evaluation and never dilute the trend.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { trainingErrorResponse } from '@/lib/training/http';
import { getTrainingRecords } from '@/lib/training/records';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withTrainingOwner(req, async (principal) => {
    try {
      const { records, trend } = await getTrainingRecords(principal.ownerId);
      return NextResponse.json({ success: true, records, trend });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
