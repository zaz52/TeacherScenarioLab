/**
 * TeacherScenarioLab admin API: one training with its full ledger
 * (messages including superseded, events, evaluation) for spot checks.
 * Missing → 404. Admin role required.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTrainingForAdmin } from '@/lib/training/admin';
import { trainingErrorResponse } from '@/lib/training/http';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withTrainingAdmin(req, async () => {
    try {
      const detail = await getTrainingForAdmin(id);
      return NextResponse.json({ success: true, ...detail });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
