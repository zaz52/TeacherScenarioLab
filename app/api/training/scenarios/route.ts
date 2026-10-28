/**
 * TeacherScenarioLab training API: published scenario catalog for the
 * training hall. Published versions only, public fields only — drafts
 * and fact tables never appear here. Learner routes use the training
 * owner wrapper for consistent resolution.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { listPublishedScenarios } from '@/lib/training/catalog';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withTrainingOwner(req, async () => {
    try {
      const scenarios = await listPublishedScenarios();
      return NextResponse.json({ success: true, scenarios });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
