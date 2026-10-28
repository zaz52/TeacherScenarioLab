/**
 * TeacherScenarioLab training API: who am I, for training.
 *
 * GET → { authenticated, ownerId, kind, roles, displayName }. Account
 * principals get their row's display name (null only if the row vanished
 * between session lookup and this read); anonymous principals get
 * authenticated: false. Roles come from the principal, so a deployment
 * -granted admin (TRAINING_ADMIN_ACCOUNT_IDS) shows up here.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTrainingAccount } from '@/lib/training/accounts';
import { withTrainingOwner } from '@/lib/training/with-training-owner';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withTrainingOwner(req, async (principal) => {
    const authenticated = principal.kind !== 'anonymous';
    let displayName: string | null = null;
    if (authenticated) {
      const account = await getTrainingAccount(principal.ownerId);
      displayName = account?.displayName ?? null;
    }
    return NextResponse.json({
      success: true,
      authenticated,
      ownerId: principal.ownerId,
      kind: principal.kind,
      roles: [...principal.roles],
      displayName,
    });
  });
}
