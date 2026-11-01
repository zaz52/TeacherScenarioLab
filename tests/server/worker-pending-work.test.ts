import { describe, expect, it, vi } from 'vitest';
import { hasPendingBackgroundWork } from '@/lib/server/worker-pending-work';

const allTables = {
  generation_runs: 'generation_runs',
  agent_sessions: 'agent_sessions',
  agent_session_materials: 'agent_session_materials',
  owner_material: 'owner_material',
};

describe('Worker idle queue admission', () => {
  it('reads metadata without provisioning absent queues', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ generation_runs: null }] });
    expect(await hasPendingBackgroundWork({ query })).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('to_regclass');
  });

  it.each([true, false])('returns the database pending decision %s', async (pending) => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [allTables] })
      .mockResolvedValueOnce({ rows: [{ pending }] });
    expect(await hasPendingBackgroundWork({ query })).toBe(pending);
    const sql = query.mock.calls[1][0] as string;
    expect(sql).toContain("state NOT IN ('completed', 'ended')");
    expect(sql).toContain("status IN ('queued', 'running')");
    expect(sql).toContain("extraction_status IN ('pending', 'running')");
    expect(sql).toContain("extraction->>'status' IN ('pending', 'running', 'extracting')");
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/);
  });

  it('queries only present lazy tables', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ generation_runs: 'generation_runs' }] })
      .mockResolvedValueOnce({ rows: [{ pending: true }] });
    await hasPendingBackgroundWork({ query });
    expect(query.mock.calls[1][0]).not.toContain('public.agent_sessions');
    expect(query.mock.calls[1][0]).not.toContain('public.owner_material');
  });

  it('keeps database failures visible to the idle controller', async () => {
    const query = vi.fn().mockRejectedValue(new Error('database unavailable'));
    await expect(hasPendingBackgroundWork({ query })).rejects.toThrow('database unavailable');
  });

  it.each([undefined, 'false', 0])('refuses an invalid metadata decision %s', async (pending) => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [allTables] })
      .mockResolvedValueOnce({ rows: [{ pending }] });
    await expect(hasPendingBackgroundWork({ query })).rejects.toThrow('result is invalid');
  });

  it('refuses missing metadata rows', async () => {
    await expect(hasPendingBackgroundWork({ query: async () => ({ rows: [] }) })).rejects.toThrow(
      'metadata is unavailable',
    );
  });
});
