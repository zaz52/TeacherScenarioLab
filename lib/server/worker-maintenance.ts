/** Existing maintenance passes, also available while process polling is parked. */
export async function maintainIdleWorker(): Promise<void> {
  const { startAssetCollectorSchedule } =
    await import('@/lib/persistence/asset-collector-schedule');
  const collector = startAssetCollectorSchedule();
  try {
    const { importLegacyClassrooms } = await import('@/lib/server/legacy-classroom-import');
    await importLegacyClassrooms();
    await collector?.collectNow();
    const { generationRunConfig } = await import('@/lib/server/generation/run/config');
    const { compactFinishedGenerationRuns } = await import('@/lib/server/generation/run/store');
    await compactFinishedGenerationRuns(generationRunConfig().finishedRetentionMs);
    const { sweepUnusedOwnerMaterialsNow } = await import('@/lib/server/materials/extraction');
    await sweepUnusedOwnerMaterialsNow();
  } finally {
    await collector?.stop();
  }
}
