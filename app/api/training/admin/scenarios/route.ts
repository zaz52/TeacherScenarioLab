/**
 * TeacherScenarioLab admin API: list every scenario version, drafts
 * included, for review. Admin role required; full documents are returned
 * (facts included) because review is the point.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createScenarioDraft, listAllScenarios } from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withTrainingAdmin(req, async () => {
    try {
      const scenarios = await listAllScenarios();
      return NextResponse.json({ success: true, scenarios });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}

/**
 * Create a draft scenario version from an editor payload. Validation
 * failures → 400 with the issue list; an existing version → 409. The
 * created row is always a draft; publishing is a separate step.
 */
export async function POST(req: NextRequest) {
  return withTrainingAdmin(req, async () => {
    try {
      const input: unknown = await req.json();
      const scenario = await createScenarioDraft(input);
      return NextResponse.json({ success: true, scenario }, { status: 201 });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
