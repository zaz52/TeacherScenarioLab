import { NextResponse, type NextRequest } from 'next/server';
import type { OwnerPrincipal } from '@/lib/server/identity/types';
import { withTrainingOwner } from '@/lib/training/with-training-owner';
import { AccountError } from './database';

export async function accountResponse(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AccountError)
      return NextResponse.json({ success: false, error: error.code }, { status: error.status });
    console.error('[accounts] request failed', {
      type: error instanceof Error ? error.name : 'unknown',
    });
    return NextResponse.json(
      { success: false, error: 'ACCOUNT_SERVICE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
export async function accountJson(req: NextRequest) {
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new AccountError(403, 'REQUEST_REFUSED');
  const origin = req.headers.get('origin');
  if (origin) {
    let source: URL;
    try {
      source = new URL(origin);
    } catch {
      throw new AccountError(403, 'REQUEST_REFUSED');
    }
    const destination = req.headers.get('host') ?? new URL(req.url).host;
    if (!['http:', 'https:'].includes(source.protocol) || source.host !== destination)
      throw new AccountError(403, 'REQUEST_REFUSED');
  }
  const text = await req.text();
  if (text.length > 12000) throw new AccountError(413, 'INVALID_REQUEST');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AccountError(400, 'INVALID_REQUEST');
  }
}
export function withSignedIn(
  req: NextRequest,
  action: (principal: OwnerPrincipal, headers: Headers) => Promise<Response>,
) {
  return withTrainingOwner(req, async (principal, headers) => {
    if (principal.kind === 'anonymous')
      return NextResponse.json(
        { success: false, error: 'LOGIN_REQUIRED' },
        { status: 401, headers },
      );
    return accountResponse(() => action(principal, headers));
  });
}
export function withSiteAdmin(
  req: NextRequest,
  action: (principal: OwnerPrincipal, headers: Headers) => Promise<Response>,
) {
  return withSignedIn(req, async (principal, headers) => {
    if (!principal.roles.has('admin'))
      return NextResponse.json(
        { success: false, error: 'ADMIN_REQUIRED' },
        { status: 403, headers },
      );
    return action(principal, headers);
  });
}
