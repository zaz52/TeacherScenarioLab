import { Suspense } from 'react';
import LearningWorkspace from '@/components/home/learning-workspace';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LearningWorkspace />
    </Suspense>
  );
}
