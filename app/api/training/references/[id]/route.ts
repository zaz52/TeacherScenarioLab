/**
 * TeacherScenarioLab training API: one verified reference by id.
 *
 * Platform content: stored citation with curated reading notes and licensed
 * article text when available. Unknown id → 404.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { getReferenceReading } from '@/lib/training/reference-reading';
import { getReferenceById } from '@/lib/training/references';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withTrainingOwner(req, async () => {
    const reference = getReferenceById(id);
    if (!reference) {
      return apiError('REFERENCE_NOT_FOUND', 404, `reference ${id} was not found`);
    }
    return NextResponse.json({
      success: true,
      reference: { ...reference, reading: getReferenceReading(id) },
    });
  });
}
