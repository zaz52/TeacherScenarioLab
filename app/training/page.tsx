'use client';

/**
 * TeacherScenarioLab — training home: doors to the hall, records, event
 * center, and reference library. No data of its own; each section owns
 * its fetch and its owner scope.
 */
import Link from 'next/link';

import { getClientTranslation } from '@/lib/i18n';

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export default function TrainingHomePage() {
  return (
    <main>
      <h1>{t('trainingHomeTitle')}</h1>
      <ul>
        <li>
          <Link href="/training/hall">{t('trainingHomeHall')}</Link>
        </li>
        <li>
          <Link href="/training/records">{t('trainingHomeRecords')}</Link>
        </li>
        <li>
          <Link href="/training/events">{t('trainingHomeEvents')}</Link>
        </li>
        <li>
          <Link href="/training/references">{t('referencesTitle')}</Link>
        </li>
      </ul>
    </main>
  );
}
