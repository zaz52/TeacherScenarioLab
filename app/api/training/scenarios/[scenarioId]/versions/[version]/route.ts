/**
 * TeacherScenarioLab training API: public scenario info for the room.
 *
 * Returns only what the learner may see: title, setting, goal, rules,
 * learner role, and character names/roles. The fact table and disclosure
 * conditions are NEVER serialized here — they stay server-side. Draft
 * versions read as not-found, same as missing ones.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { getTrainingStore } from '@/lib/training/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; version: string }> },
) {
  const { scenarioId, version } = await params;
  const versionNumber = Number(version);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    return apiError('INVALID_REQUEST', 400, 'version must be a positive integer');
  }
  return withTrainingOwner(req, async () => {
    const store = await getTrainingStore();
    const scenario = await store.getScenarioVersion(scenarioId, versionNumber);
    if (!scenario || scenario.publishedAt === null) {
      return apiError(
        'SCENARIO_NOT_FOUND',
        404,
        `scenario ${scenarioId} version ${versionNumber} was not found`,
      );
    }
    return NextResponse.json({
      success: true,
      scenario: {
        scenarioId: scenario.scenarioId,
        version: scenario.version,
        title: scenario.title,
        setting: scenario.setting,
        goal: scenario.goal,
        rules: scenario.rules,
        learnerRole: scenario.learnerRole,
        characters: scenario.characters.map((character) => ({
          id: character.id,
          name: character.name,
          role: character.role,
        })),
        publishedAt: scenario.publishedAt,
      },
    });
  });
}
