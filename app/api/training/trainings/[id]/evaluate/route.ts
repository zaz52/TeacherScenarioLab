/**
 * TeacherScenarioLab training API: run the five-dimension evaluation.
 *
 * POST evaluates a training in the `evaluation` state (wrong states fail
 * with 409). Only a fully parsed, citation-verified evaluation is
 * persisted; model failures and bad citations fail without storing.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { generateEvaluation } from '@/lib/training/evaluation';
import { trainingErrorResponse } from '@/lib/training/http';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal) => {
    try {
      const evaluation = await generateEvaluation(principal.ownerId, id);
      return NextResponse.json({ success: true, evaluation });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
