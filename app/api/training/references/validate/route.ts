/**
 * TeacherScenarioLab training API: citation validation.
 *
 * POST { id?, doi?, title?, year? } → { valid, reference, issues }.
 * Pure catalog check (see lib/training/citation-check.ts): no database,
 * no model call, no side effects. Unknown fields are ignored; a body that
 * is not an object, or a non-numeric year, is a 400.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { validateCitation, type CitationInput } from '@/lib/training/citation-check';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'request body must be valid JSON');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return apiError('INVALID_REQUEST', 400, 'request body must be an object');
  }
  const raw = body as Record<string, unknown>;
  const input: CitationInput = {};
  if (typeof raw.id === 'string') input.id = raw.id;
  if (typeof raw.doi === 'string') input.doi = raw.doi;
  if (typeof raw.title === 'string') input.title = raw.title;
  if (raw.year !== undefined) {
    if (typeof raw.year !== 'number') {
      return apiError('INVALID_REQUEST', 400, 'year must be a number');
    }
    input.year = raw.year;
  }
  return withTrainingOwner(req, async () => {
    const result = validateCitation(input);
    return NextResponse.json({
      success: true,
      valid: result.valid,
      reference: result.reference,
      issues: result.issues,
    });
  });
}
