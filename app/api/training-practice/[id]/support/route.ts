import { NextRequest, NextResponse } from 'next/server';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { getTraining, listMessages, listEvents } from '@/lib/training/store';
import { trainingErrorResponse } from '@/lib/training/http';
import { practiceFromEvents } from '@/lib/training/practice-config';
import { buildKnowledgeSupport } from '@/lib/training/knowledge/support';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withTrainingOwner(req, async (principal, headers) => {
    headers.set('Cache-Control', 'private, no-store');
    try {
      const training = await getTraining(principal.ownerId, id);
      if (!training)
        return NextResponse.json(
          { success: false, error: 'TRAINING_NOT_FOUND' },
          { status: 404, headers },
        );
      const [messages, events] = await Promise.all([
        listMessages(principal.ownerId, id, false),
        listEvents(principal.ownerId, id),
      ]);
      return NextResponse.json(
        {
          success: true,
          practice: practiceFromEvents(events),
          support: buildKnowledgeSupport(messages),
        },
        { headers },
      );
    } catch (error) {
      const response = trainingErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
