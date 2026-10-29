/**
 * TeacherScenarioLab training API: one verified reference by id.
 *
 * Platform content: the full citation as stored in the catalog, nothing
 * derived. Unknown id → 404.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { getReferenceById } from '@/lib/training/references';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withTrainingOwner(req, async () => {
    const reference = getReferenceById(id);
    if (!reference) {
      return apiError('REFERENCE_NOT_FOUND', 404, `reference ${id} was not found`);
    }
    return NextResponse.json({ success: true, reference });
  });
}
