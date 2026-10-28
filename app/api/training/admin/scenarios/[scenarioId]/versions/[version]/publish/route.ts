/**
 * TeacherScenarioLab admin API: publish a draft scenario version.
 *
 * POST → the frozen published row. Missing → 404; already published →
 * 409; a stored document that fails validation → 500 (data corruption,
 * never silently published). Publishing is the only way a version becomes
 * visible to learners. Admin role required.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { publishScenarioVersion } from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function POST(
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
      const scenario = await publishScenarioVersion(scenarioId, versionNumber);
      return NextResponse.json({ success: true, scenario });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
