/**
 * TeacherScenarioLab admin API: one scenario version, full document, for
 * review. Drafts are visible here; the learner route treats them as
 * not-found. Admin role required.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { getScenarioForAdmin } from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; version: string }> },
) {
  const { scenarioId, version } = await params;
  const versionNumber = Number(version);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    return apiError('INVALID_REQUEST', 400, 'version must be a positive integer');
  }
  return withTrainingAdmin(req, async () => {
    try {
      const scenario = await getScenarioForAdmin(scenarioId, versionNumber);
      return NextResponse.json({ success: true, scenario });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
