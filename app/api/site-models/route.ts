import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSiteOwner } from '@/lib/server/accounts/http';
import { isSameOriginJsonRequest } from '@/lib/persistence/owner-claim-http';
import {
  effectiveDeploymentLayer,
  siteProviderState,
  saveSiteProvider,
} from '@/lib/server/model-config/site-providers';
import { getProviderPreset } from '@/lib/config/provider-presets';
import { registryDefaultBaseUrl } from '@/lib/config/provider-presets';

const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: NextRequest) {
  return withSiteOwner(req, async () => {
    const layer = await effectiveDeploymentLayer();
    const state = await siteProviderState();
    const providers = Object.entries(layer?.config.providers ?? {})
      .filter(
        ([id, p]) =>
          id !== 'teacherlab-gateway' &&
          ['google', 'glm', 'openai', 'openai-compatible', 'anthropic', 'openrouter'].includes(
            p.preset,
          ),
      )
      .map(([id, p]) => ({
        id,
        preset: p.preset,
        models: p.models ?? [],
        baseUrl:
          p.baseUrl ??
          registryDefaultBaseUrl(
            'chat',
            getProviderPreset(p.preset)?.capabilities.chat?.registryId ?? p.preset,
          ) ??
          '',
        keyConfigured: Boolean(p.apiKey),
      }));
    return NextResponse.json({ revision: state.revision, providers }, { headers });
  });
}
const schema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    revision: z.number().int().nonnegative(),
    baseUrl: z.string().url().max(2048),
    models: z
      .array(z.string().regex(/^[a-zA-Z0-9@_.:/-]{1,180}$/))
      .min(1)
      .max(100),
    apiKey: z.string().min(1).max(4096).optional(),
  })
  .strict();
export async function PUT(req: NextRequest) {
  return withSiteOwner(req, async (principal) => {
    if (!isSameOriginJsonRequest(req))
      return NextResponse.json({ error: 'REQUEST_REFUSED' }, { status: 403, headers });
    if (Number(req.headers.get('content-length') ?? 0) > 24000)
      return NextResponse.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413, headers });
    try {
      const reader = req.body?.getReader();
      if (!reader) throw new Error('invalid-request');
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 24000) {
            await reader.cancel();
            throw new Error('request-too-large');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const input = schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      await saveSiteProvider(input, principal.ownerId);
      return NextResponse.json({ success: true }, { headers });
    } catch (error) {
      const known = ['revision-conflict', 'new-key-required', 'unsupported-provider'];
      const code =
        error instanceof Error && known.includes(error.message)
          ? error.message
          : 'INVALID_SETTINGS';
      return NextResponse.json(
        { error: code },
        { status: code === 'revision-conflict' ? 409 : 400, headers },
      );
    }
  });
}
