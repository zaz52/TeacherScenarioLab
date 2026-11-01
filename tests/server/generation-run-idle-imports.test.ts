import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
  let release!: () => void;
  const loading = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    loading,
    release: () => release(),
    engineLoaded: vi.fn(),
    servicesLoaded: vi.fn(),
    execute: vi.fn(async () => 'completed'),
    claim: vi.fn(),
    heartbeat: vi.fn(async () => true),
    services: {},
    materialAnalysisLoaded: vi.fn(),
    materialServicesLoaded: vi.fn(),
    classroomMaterialsLoaded: vi.fn(),
  };
});

vi.mock('@/lib/server/generation/run/engine', async () => {
  state.engineLoaded();
  await state.loading;
  return { executeGenerationRun: state.execute };
});
vi.mock('@/lib/server/generation/run/services', () => {
  state.servicesLoaded();
  return { defaultRunStepServices: state.services };
});
vi.mock('@/lib/server/generation/run/store', () => ({
  claimNextGenerationRun: state.claim,
  compactFinishedGenerationRuns: vi.fn(async () => {}),
  confirmDueGenerationRunOutlines: vi.fn(async () => {}),
  heartbeatGenerationRun: state.heartbeat,
  keepGenerationRunAssetsAlive: vi.fn(async () => {}),
  readGenerationRunState: vi.fn(async () => 'running'),
  releaseGenerationRunLease: vi.fn(async () => {}),
  refuseGenerationRunExecution: vi.fn(async () => 'refused'),
}));
vi.mock('@/lib/server/generation/steps/material-analysis', () => {
  state.materialAnalysisLoaded();
  return { analyzeMaterial: vi.fn() };
});
vi.mock('@/lib/server/material-extraction/services', () => {
  state.materialServicesLoaded();
  return { resolveExtractionServices: vi.fn() };
});
vi.mock('@/lib/server/classroom-materials', () => {
  state.classroomMaterialsLoaded();
  return { ClassroomMaterialsUnavailableError: class extends Error {} };
});

import { startGenerationRunner } from '@/lib/server/generation/run/runner';

it('keeps an empty queue lightweight and heartbeats a claim while execution modules load', async () => {
  state.claim.mockResolvedValue(null);
  const runner = startGenerationRunner({
    workerId: 'lazy-loading-contract',
    config: { scanIntervalMs: 10000, heartbeatIntervalMs: 5 },
  });
  try {
    await vi.waitFor(() => expect(state.claim).toHaveBeenCalled());
    expect(state.engineLoaded).not.toHaveBeenCalled();
    expect(state.servicesLoaded).not.toHaveBeenCalled();

    state.claim.mockResolvedValueOnce({
      run: { id: 'lazy-run' },
      lease: { runId: 'lazy-run', workerId: 'lazy-loading-contract', generation: 1 },
      takeover: false,
    });
    runner.wake();
    await vi.waitFor(() => expect(state.engineLoaded).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(state.heartbeat).toHaveBeenCalled());
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.servicesLoaded).not.toHaveBeenCalled();

    state.release();
    await vi.waitFor(() => expect(state.execute).toHaveBeenCalledOnce());
    expect(state.servicesLoaded).toHaveBeenCalledOnce();
    expect(state.execute).toHaveBeenCalledWith(
      expect.objectContaining({ run: { id: 'lazy-run' } }),
      expect.objectContaining({ services: state.services, signal: expect.any(AbortSignal) }),
    );
  } finally {
    state.release();
    await runner.stop();
  }
});

it('loads the material scheduler without loading document execution dependencies', async () => {
  await import('@/lib/server/materials/extraction');
  expect(state.materialAnalysisLoaded).not.toHaveBeenCalled();
  expect(state.materialServicesLoaded).not.toHaveBeenCalled();
  expect(state.classroomMaterialsLoaded).not.toHaveBeenCalled();
});
