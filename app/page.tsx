import { Suspense } from 'react';
import { TeacherlabHome } from '@/components/home/teacherlab-home';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TeacherlabHome />
    </Suspense>
  );
}
