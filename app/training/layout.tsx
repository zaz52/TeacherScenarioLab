/**
 * TeacherScenarioLab — layout for every /training/* page.
 *
 * The root layout carries no navigation and the workbench header is
 * classroom-specific, so the training shell lives here instead: wrapping
 * the training routes only, with zero changes to upstream pages. All
 * training pages keep their own markup; this file only adds the header.
 */
import type { ReactNode } from 'react';

import { TrainingNav } from '@/components/training/training-nav';

export default function TrainingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <TrainingNav />
      {children}
    </>
  );
}
