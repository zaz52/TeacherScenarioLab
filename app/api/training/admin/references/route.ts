/**
 * TeacherScenarioLab admin API: reference library health.
 *
 * Every catalog entry re-validated against the library itself (id lookup):
 * a catalog entry that fails its own check means the data, not a citation,
 * is broken. Admin role required; learners read the catalog, they do not
 * audit it.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { validateCitation } from '@/lib/training/citation-check';
import { TRAINING_REFERENCES } from '@/lib/training/references';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return withTrainingAdmin(req, async () => {
    const references = TRAINING_REFERENCES.map((ref) => {
      const result = validateCitation({ id: ref.id });
      return { ...ref, valid: result.valid, issues: result.issues };
    });
    const invalid = references.filter((ref) => !ref.valid).length;
    return NextResponse.json({
      success: true,
      total: references.length,
      valid: references.length - invalid,
      invalid,
      references,
    });
  });
}
