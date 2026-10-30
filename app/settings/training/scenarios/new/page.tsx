'use client';

/**
 * TeacherScenarioLab — create a new scenario version (admin only).
 * The form starts empty; the server validates, refuses duplicates (409),
 * and stores the row as a draft. Publishing is a separate step on the
 * admin console.
 */
import ScenarioEditor, { emptyScenario } from '@/components/settings/training-scenario-editor';

export default function NewScenarioPage() {
  return <ScenarioEditor mode="create" initial={emptyScenario()} />;
}
