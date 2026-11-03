import { Suspense } from 'react';
import { KnowledgeLibrary } from '@/components/courseware/knowledge-library';
export default function ReferenceLibraryPage() {
  return (
    <Suspense>
      <KnowledgeLibrary />
    </Suspense>
  );
}
