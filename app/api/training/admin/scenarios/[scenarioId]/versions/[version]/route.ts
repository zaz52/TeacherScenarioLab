/**
 * TeacherScenarioLab admin API: one scenario version, full document, for
 * review. Drafts are visible here; the learner route treats them as
 * not-found. Admin role required.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import {
  deleteScenarioDraft,
  getScenarioForAdmin,
  updateScenarioDraft,
} from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

function parseVersion(version: string): number | null {
  const versionNumber = Number(version);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) return null;
  return versionNumber;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; version: string }> },
) {
  const { scenarioId, version } = await params;
  const versionNumber = parseVersion(version);
  if (versionNumber === null) {
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

/**
 * Update a draft scenario version from an editor payload. The payload's
 * scenarioId/version must match the path; published versions refuse
 * with 409 (frozen: create a new version instead).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; version: string }> },
) {
  const { scenarioId, version } = await params;
  const versionNumber = parseVersion(version);
  if (versionNumber === null) {
    return apiError('INVALID_REQUEST', 400, 'version must be a positive integer');
  }
  return withTrainingAdmin(req, async () => {
    try {
      const input: unknown = await req.json();
      const scenario = await updateScenarioDraft(scenarioId, versionNumber, input);
      return NextResponse.json({ success: true, scenario });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}

/** Delete a draft scenario version. Published versions refuse with 409. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; version: string }> },
) {
  const { scenarioId, version } = await params;
  const versionNumber = parseVersion(version);
  if (versionNumber === null) {
    return apiError('INVALID_REQUEST', 400, 'version must be a positive integer');
  }
  return withTrainingAdmin(req, async () => {
    try {
      await deleteScenarioDraft(scenarioId, versionNumber);
      return NextResponse.json({ success: true });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
