/**
 * TeacherScenarioLab training API: create a training and list your own.
 *
 * Creating a training pins a published scenario version; the scenario
 * document itself is never returned (hidden facts stay server-side).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { createTraining, listTrainings } from '@/lib/training/store';

export const runtime = 'nodejs';

interface CreateTrainingBody {
  scenarioId?: unknown;
  scenarioVersion?: unknown;
}

export async function POST(req: NextRequest) {
  let body: CreateTrainingBody = {};
  try {
    body = ((await req.json()) ?? {}) as CreateTrainingBody;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'invalid JSON body');
  }
  return withTrainingOwner(req, async (principal) => {
    try {
      const training = await createTraining(principal.ownerId, {
        scenarioId: typeof body.scenarioId === 'string' ? body.scenarioId : '',
        scenarioVersion:
          typeof body.scenarioVersion === 'number' ? body.scenarioVersion : NaN,
      });
      return NextResponse.json({ success: true, training }, { status: 201 });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}

export async function GET(req: NextRequest) {
  return withTrainingOwner(req, async (principal) => {
    try {
      const trainings = await listTrainings(principal.ownerId);
      return NextResponse.json({ success: true, trainings });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
