/**
 * TeacherScenarioLab training API: the append-only event ledger for one
 * training (read-only; events are written by the service layer only).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withRequestOwner } from '@/lib/server/identity/with-owner';
import { trainingErrorResponse } from '@/lib/training/http';
import { listEvents } from '@/lib/training/store';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withRequestOwner(req, async (principal) => {
    try {
      const events = await listEvents(principal.ownerId, id);
      return NextResponse.json({ success: true, events });
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
