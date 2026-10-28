/**
 * TeacherScenarioLab admin API: list every scenario version, drafts
 * included, for review. Admin role required; full documents are returned
 * (facts included) because review is the point.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { listAllScenarios } from '@/lib/training/admin';
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
