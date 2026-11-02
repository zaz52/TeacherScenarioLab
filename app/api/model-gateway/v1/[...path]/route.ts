import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BODY = 256 * 1024;
function error(status: number, code: string) {
  return NextResponse.json(
    { error: { message: code, type: 'gateway_error', code } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
function sameSecret(left: string, right: string) {
  return timingSafeEqual(
    createHash('sha256').update(left).digest(),
    createHash('sha256').update(right).digest(),
  );
}
async function proxy(req: NextRequest, path: string[]) {
  const token = process.env.TEACHERLAB_MAGPIE_API_KEY,
    upstreamKey = process.env.TEACHERLAB_MAGPIE_UPSTREAM_KEY;
  const endpoint = process.env.TEACHERLAB_MAGPIE_UPSTREAM_URL;
  if (!token || token.length < 32 || !upstreamKey || endpoint !== 'http://teacherlab-magpie:3425')
    return error(503, 'gateway_not_configured');
  const supplied = req.headers.get('authorization');
  if (!supplied?.startsWith('Bearer ') || !sameSecret(supplied.slice(7), token))
    return error(401, 'invalid_api_key');
  const route = path.join('/');
  if (
    !(
      (route === 'models' && req.method === 'GET') ||
      (route === 'chat/completions' && req.method === 'POST')
    )
  )
    return error(404, 'unsupported_gateway_route');
  let body: string | undefined;
  if (req.method === 'POST') {
    if (!req.headers.get('content-type')?.startsWith('application/json'))
      return error(415, 'json_required');
    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY)
      return error(413, 'request_too_large');
    const reader = req.body?.getReader();
    if (!reader) return error(400, 'invalid_request');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > MAX_BODY) {
          await reader.cancel();
          return error(413, 'request_too_large');
        }
        chunks.push(item.value);
      }
    } catch {
      return error(400, 'invalid_request');
    } finally {
      reader.releaseLock();
    }
    body = Buffer.concat(chunks).toString('utf8');
    try {
      const data = JSON.parse(body);
      const prefixes = (process.env.TEACHERLAB_MAGPIE_MODEL_PREFIXES ?? 'amd/')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (
        typeof data.model !== 'string' ||
        data.model.length > 180 ||
        !prefixes.some((prefix) => data.model.startsWith(prefix)) ||
        !Array.isArray(data.messages) ||
        data.messages.length < 1 ||
        data.messages.length > 100
      )
        return error(400, 'invalid_model_or_messages');
      const limit = data.max_completion_tokens ?? data.max_tokens;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 8192))
        return error(400, 'invalid_output_limit');
      if (data.n !== undefined && data.n !== 1) return error(400, 'multiple_choices_not_supported');
      if (limit === undefined) data.max_tokens = 4096;
      body = JSON.stringify(data);
    } catch {
      return error(400, 'invalid_json');
    }
  }
  try {
    const response = await fetch(`${endpoint}/v1/${route}`, {
      method: req.method,
      body,
      headers: {
        Authorization: `Bearer ${upstreamKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TeacherScenarioLab/1.0',
      },
      redirect: 'error',
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(90000)]),
      cache: 'no-store',
    });
    if (!response.ok)
      return error(
        response.status >= 400 && response.status <= 599 ? response.status : 502,
        'upstream_request_failed',
      );
    if (route === 'models') {
      const data = await response.json(),
        prefixes = (process.env.TEACHERLAB_MAGPIE_MODEL_PREFIXES ?? 'amd/')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
      const models = Array.isArray(data.data)
        ? data.data
            .filter(
              (model: { id?: unknown }) =>
                typeof model.id === 'string' &&
                prefixes.some((prefix) => model.id!.toString().startsWith(prefix)),
            )
            .map((model: { id: string; owned_by?: string }) => ({
              id: model.id,
              object: 'model',
              owned_by: model.owned_by ?? 'magpie',
            }))
        : [];
      return NextResponse.json(
        { object: 'list', data: models },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return error(502, 'gateway_unavailable');
  }
}
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, context: Context) {
  return proxy(req, (await context.params).path);
}
export async function POST(req: NextRequest, context: Context) {
  return proxy(req, (await context.params).path);
}
