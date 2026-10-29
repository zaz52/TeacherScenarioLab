/**
 * TeacherScenarioLab — training account sessions as an OwnerAuthMethod.
 *
 * A training account is an `acct:<uuid>` owner proven by a session cookie,
 * not by the anonymous cookie and not by any core method: the method below
 * implements the {@link OwnerAuthMethod} contract (`name`, `authenticate`,
 * `describeStoredOwner`) so a deployment may register it with
 * `configureOwnerAuthentication`, and the training routes use it through
 * `withTrainingOwner` without registering it globally — classroom, PBL and
 * Pi identity resolution stay exactly as they are.
 *
 * Security shape, mirroring the anonymous cookie:
 * - the cookie value is a random token; only its SHA-256 hex is stored;
 * - the cookie is HttpOnly, SameSite=Lax, Path=/, 30 days, Secure per
 *   `cookiesAreSecure()` (same rule as the anonymous cookie);
 * - a present-but-unknown or expired token answers `invalid` (401), never
 *   a silent downgrade to anonymous — a broken credential must never
 *   quietly become a different identity;
 * - admin is never self-granted: it comes only from the deployment's
 *   `TRAINING_ADMIN_ACCOUNT_IDS` list (comma-separated account ids), merged
 *   at authentication time. Account rows themselves carry only learner
 *   roles; task 9's admin routes read the merged principal.
 */
import { createHash, randomBytes } from 'node:crypto';

import { cookiesAreSecure } from '@/lib/server/cookie-secure';
import type {
  OwnerAuthMethod,
  OwnerAuthMethodResult,
  OwnerAuthRequest,
  OwnerPrincipal,
} from '@/lib/server/identity/types';
import { OWNER_ROLES } from '@/lib/server/identity/types';

import { getTrainingStore } from './server';

export const TRAINING_SESSION_COOKIE = 'training_session';
export const TRAINING_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const TRAINING_ACCOUNT_PREFIX = 'acct:';
export const TRAINING_SESSION_TTL_MS = TRAINING_SESSION_MAX_AGE_SECONDS * 1000;

/** The session store surface the method needs (injectable for tests). */
export interface TrainingSessionLookup {
  getSessionByTokenHash(tokenHash: string): Promise<{
    session: { accountId: string; expiresAt: number };
    account: { accountId: string; displayName: string; roles: string[] };
  } | null>;
}

async function defaultSessionLookup(): Promise<TrainingSessionLookup> {
  return getTrainingStore();
}

function readCookie(headers: Headers, name: string): string | undefined {
  const encoded = headers.get('cookie');
  if (!encoded) return undefined;
  for (const item of encoded.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** A fresh session token: 32 random bytes, base64url. Never stored raw. */
export function mintTrainingSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The stored form of a session token: SHA-256 hex. */
export function hashTrainingSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A fresh account owner id: `acct:<uuid v4>`. */
export function mintTrainingAccountId(): string {
  return `${TRAINING_ACCOUNT_PREFIX}${globalThis.crypto.randomUUID()}`;
}

/** Whether an owner id is one this method mints. */
export function isTrainingAccountOwnerId(ownerId: string): boolean {
  return (
    ownerId.startsWith(TRAINING_ACCOUNT_PREFIX) && ownerId.length > TRAINING_ACCOUNT_PREFIX.length
  );
}

function sessionCookieAttributes(maxAge: number): string {
  const secure = cookiesAreSecure() ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** The session token a request presents, if any. */
export function readTrainingSessionToken(headers: Headers): string | undefined {
  return readCookie(headers, TRAINING_SESSION_COOKIE);
}

/** `Set-Cookie` that persists a session token. */
export function trainingSessionCookieHeader(token: string): string {
  return `${TRAINING_SESSION_COOKIE}=${encodeURIComponent(token)}; ${sessionCookieAttributes(
    TRAINING_SESSION_MAX_AGE_SECONDS,
  )}`;
}

/** `Set-Cookie` that drops the session cookie (logout, expired token). */
export function clearTrainingSessionCookieHeader(): string {
  return `${TRAINING_SESSION_COOKIE}=; ${sessionCookieAttributes(0)}`;
}

/**
 * Deployment-granted admins: `TRAINING_ADMIN_ACCOUNT_IDS` as a
 * comma-separated list of account ids. Read per call so a test can set it
 * without a module reload, mirroring the environment-read core methods.
 */
export function resolveTrainingAdminAccountIds(
  env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
  const raw = env.TRAINING_ADMIN_ACCOUNT_IDS ?? '';
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== ''),
  );
}

/** Whether a principal carries the admin role (merged at authentication). */
export function isTrainingAdmin(principal: OwnerPrincipal): boolean {
  return principal.roles.has(OWNER_ROLES.admin);
}

export interface TrainingSessionMethodDeps {
  lookup?: TrainingSessionLookup | Promise<TrainingSessionLookup>;
  adminAccountIds?: ReadonlySet<string>;
}

/**
 * The `trainingSession` method. Absent cookie → `not-applicable` (the
 * caller falls back to core resolution, i.e. anonymous). Present cookie →
 * `authenticated` with a `kind: 'user'`, `assurance: 'verified'` principal,
 * or `invalid` when the token is unknown or expired.
 */
export function trainingSessionAuthMethod(deps: TrainingSessionMethodDeps = {}): OwnerAuthMethod {
  const lookupPromise = deps.lookup ?? defaultSessionLookup();
  const adminAccountIds = deps.adminAccountIds ?? resolveTrainingAdminAccountIds();

  async function authenticate(req: OwnerAuthRequest): Promise<OwnerAuthMethodResult> {
    const token = readCookie(req.headers, TRAINING_SESSION_COOKIE);
    if (token === undefined || token === '') return { status: 'not-applicable' };
    const lookup = await lookupPromise;
    const found = await lookup.getSessionByTokenHash(hashTrainingSessionToken(token));
    if (!found) {
      return { status: 'invalid', reason: 'unknown training session' };
    }
    if (found.session.expiresAt <= Date.now()) {
      return { status: 'invalid', reason: 'expired training session' };
    }
    const roles = new Set(found.account.roles);
    if (adminAccountIds.has(found.account.accountId)) roles.add(OWNER_ROLES.admin);
    return {
      status: 'authenticated',
      principal: {
        ownerId: found.account.accountId,
        kind: 'user',
        roles,
        assurance: 'verified',
        channel: 'training-session',
      },
    };
  }

  return {
    name: 'trainingSession',
    authenticate,
    describeStoredOwner: (ownerId) =>
      isTrainingAccountOwnerId(ownerId) ? { kind: 'user' } : undefined,
    issuesAnonymousOwners: false,
  };
}
