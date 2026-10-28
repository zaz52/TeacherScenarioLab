/**
 * TeacherScenarioLab admin API: import a code draft into the database.
 *
 * POST { scenarioId } → 201 with the draft row. Importing never publishes:
 * the row lands with `publishedAt: null`, invisible to learners until an
 * admin publishes it. Refuses when the code knows no draft by that id
 * (404) or the version already exists (409).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { importCodeScenarioDraft } from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return apiError('INVALID_REQUEST', 400, 'invalid JSON body');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return apiError('INVALID_REQUEST', 400, 'request body must be an object');
  }
  const scenarioId = (body as Record<string, unknown>).scenarioId;
  if (typeof scenarioId !== 'string' || scenarioId === '') {
    return apiError('INVALID_REQUEST', 400, 'scenarioId must be a non-empty string');
  }
  return withTrainingAdmin(req, async () => {
    try {
      const scenario = await importCodeScenarioDraft(scenarioId);
      return NextResponse.json({ success: true, scenario }, { status: 201 });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
