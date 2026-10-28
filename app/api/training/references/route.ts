/**
 * TeacherScenarioLab training API: reference library listing.
 *
 * Platform content, not learner data: the full catalog is public to any
 * signed-in owner. Supports ?topic=<one of the six ReferenceTopic values>.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { listReferences, type ReferenceTopic } from '@/lib/training/references';

export const runtime = 'nodejs';

const REFERENCE_TOPICS: ReferenceTopic[] = [
  'epidemic-school',
  'home-school',
  'simulation',
  'crisis-theory',
  'teacher-wellbeing',
  'rumor',
];

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  if (topic !== null && !REFERENCE_TOPICS.includes(topic as ReferenceTopic)) {
    return apiError('INVALID_REQUEST', 400, `unknown topic: ${topic}`);
  }
  return withTrainingOwner(req, async () => {
    const references = listReferences(topic ?? undefined);
    return NextResponse.json({
      success: true,
      references,
    });
  });
}
