/**
 * TeacherScenarioLab training API: facts the teacher has learned so far.
 *
 * GET returns only unlocked hidden facts (content included — they are now
 * teacher-known). Locked facts leave no trace in the response: no ids, no
 * count, no placeholder.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { getDisclosedFactsForTraining } from '@/lib/training/disclosure';
import { trainingErrorResponse } from '@/lib/training/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal) => {
    try {
      const result = await getDisclosedFactsForTraining(principal.ownerId, id);
      return NextResponse.json({
        success: true,
        training: result.training,
        facts: result.facts.map((fact) => ({
          id: fact.id,
          content: fact.content,
          category: fact.category,
          disclosureConditionId: fact.disclosureConditionId ?? null,
        })),
      });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
