/**
 * TeacherScenarioLab — route helpers for the training API.
 *
 * Maps a TrainingServiceError to its structured apiError response; any
 * other error rethrows so withRequestOwner turns it into a 500 (never a
 * misleading 4xx).
 */
import { apiError, type ApiErrorCode } from '@/lib/server/api-response';
import type { NextResponse } from 'next/server';

import { TrainingServiceError } from './store';

export function trainingErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof TrainingServiceError) {
    return apiError(error.code as ApiErrorCode, error.status, error.message);
  }
  return null;
}
