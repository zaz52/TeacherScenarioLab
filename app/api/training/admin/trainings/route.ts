/**
 * TeacherScenarioLab admin API: list every training, across owners, for
 * spot checks. Optional ?ownerId= and ?state= filters narrow the list.
 * Admin role required; this is the only list that crosses owners.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { listAllTrainings } from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get('ownerId') ?? undefined;
  const state = req.nextUrl.searchParams.get('state') ?? undefined;
  return withTrainingAdmin(req, async () => {
    try {
      const trainings = await listAllTrainings({ ownerId, state });
      return NextResponse.json({ success: true, trainings });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
