import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTrainingAdmin } from '@/lib/training/with-training-admin';
import {
  poolOverview,
  readPoolState,
  savePolicy,
  saveCatalog,
  saveRouting,
  audit,
} from '@/lib/training/models/store';
import {
  fetchCatalog,
  providerSummaries,
  POLICY_VERIFIED_AT,
  PRIVACY_SOURCE,
} from '@/lib/training/models/providers';
import { qualifyModel } from '@/lib/training/models/qualification';
import {
  modelKey,
  policySchema,
  providerIds,
  PoolError,
  taskSchema,
} from '@/lib/training/models/types';

export const runtime = 'nodejs';
export const maxDuration = 900;
export async function GET(req: NextRequest) {
  return withTrainingAdmin(req, async () =>
    NextResponse.json(
      {
        success: true,
        ...(await poolOverview()),
        providers: providerSummaries(),
        privacy: {
          source: PRIVACY_SOURCE,
          verifiedAt: POLICY_VERIFIED_AT,
          fictionalDataRequired: true,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    ),
  );
}
const command = z.discriminatedUnion('action', [
  z.object({ action: z.literal('policy'), policy: policySchema }).strict(),
  z.object({ action: z.literal('catalog'), provider: z.enum(providerIds) }).strict(),
  z
    .object({ action: z.literal('qualify'), key: z.string().min(1).max(220), task: taskSchema })
    .strict(),
  z
    .object({
      action: z.literal('routing'),
      routing: z
        .object({
          roleplay: z.string().max(220).nullable(),
          evaluation: z.string().max(220).nullable(),
        })
        .strict(),
    })
    .strict(),
]);
export async function POST(req: NextRequest) {
  return withTrainingAdmin(req, async (principal) => {
    if (
      !req.headers.get('content-type')?.startsWith('application/json') ||
      (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin)
    )
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 403 });
    if (Number(req.headers.get('content-length') ?? 0) > 16000)
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 413 });
    try {
      const raw = await req.text();
      if (raw.length > 16000) throw new Error('invalid');
      const input = command.parse(JSON.parse(raw));
      if (input.action === 'catalog') {
        const catalog = await fetchCatalog(input.provider);
        await saveCatalog(catalog);
        await audit(principal.ownerId, 'catalog-refreshed', {
          provider: input.provider,
          status: catalog.httpStatus,
        });
        return NextResponse.json({ success: true, catalog });
      }
      if (input.action === 'policy') {
        const state = await readPoolState();
        const p = input.policy;
        const catalog = state.catalogs.find((c) => c.provider === p.provider);
        const documented = p.provider === 'glm' && p.modelId === 'glm-4.7-flash';
        if (!documented && (!catalog?.models.includes(p.modelId) || catalog.httpStatus !== 200))
          throw new PoolError('unavailable');
        if (p.provider === 'openrouter' && !p.modelId.endsWith(':free'))
          throw new PoolError('unavailable');
        await savePolicy(p, principal.ownerId);
        return NextResponse.json({ success: true, key: modelKey(p) });
      }
      if (input.action === 'routing') {
        await saveRouting(input.routing, principal.ownerId);
        return NextResponse.json({ success: true });
      }
      const result = await qualifyModel(input.key, input.task, principal.ownerId);
      return NextResponse.json({ success: true, qualification: result });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof PoolError ? error.kind : 'INVALID_REQUEST' },
        { status: error instanceof PoolError ? 409 : 400 },
      );
    }
  });
}
