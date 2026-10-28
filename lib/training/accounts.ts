/**
 * TeacherScenarioLab — account service (training-scoped).
 *
 * Accounts are `acct:<uuid>` owners with a display name and learner roles.
 * Creating an account mints a session immediately: the raw token goes back
 * to the route, which puts it only in the `Set-Cookie` header — never in a
 * JSON body, a log line, or a stored row (only its SHA-256 is stored).
 * There is no password login in this task: a session is the credential, and
 * admin comes only from the deployment's `TRAINING_ADMIN_ACCOUNT_IDS`
 * list, merged at authentication time (see `./session-auth.ts`).
 *
 * Claiming moves an anonymous owner's trainings to an account in one
 * UPDATE; messages, events, snapshots and evaluations follow by training
 * id, and the old owner then reads those trainings as not-found through
 * the normal owner binding. The route clears the spent anonymous cookie.
 */
import { isAnonymousCookieOwnerId } from '@/lib/server/identity/anonymous-cookie';

import { getTrainingStore } from './server';
import {
  hashTrainingSessionToken,
  mintTrainingAccountId,
  mintTrainingSessionToken,
  TRAINING_SESSION_TTL_MS,
} from './session-auth';
import { TrainingServiceError } from './store';

export interface TrainingAccount {
  accountId: string;
  displayName: string;
  roles: string[];
  createdAt: number;
}

const DISPLAY_NAME_MAX_LENGTH = 200;

function defaultDisplayName(accountId: string): string {
  return `学员-${accountId.slice('acct:'.length, 'acct:'.length + 8)}`;
}

/**
 * Create an account and its first session. Returns the raw session token
 * for the route's `Set-Cookie` header; callers must never serialize it.
 */
export async function createTrainingAccount(displayName?: string): Promise<{
  account: TrainingAccount;
  token: string;
  expiresAt: number;
}> {
  const name = (displayName ?? '').trim();
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `displayName must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
    );
  }
  const store = await getTrainingStore();
  const accountId = mintTrainingAccountId();
  const now = Date.now();
  const account = await store.createAccount({
    accountId,
    displayName: name === '' ? defaultDisplayName(accountId) : name,
    roles: [],
    createdAt: now,
  });
  const token = mintTrainingSessionToken();
  await store.createSession({
    tokenHash: hashTrainingSessionToken(token),
    accountId,
    createdAt: now,
    expiresAt: now + TRAINING_SESSION_TTL_MS,
  });
  return { account, token, expiresAt: now + TRAINING_SESSION_TTL_MS };
}

/** Look an account up by id; `null` when it does not exist. */
export async function getTrainingAccount(accountId: string): Promise<TrainingAccount | null> {
  const store = await getTrainingStore();
  return store.getAccount(accountId);
}

/** Drop one session by its raw token. Returns whether one was dropped. */
export async function deleteTrainingSession(token: string): Promise<boolean> {
  const store = await getTrainingStore();
  return store.deleteSession(hashTrainingSessionToken(token));
}

/**
 * Move an anonymous owner's trainings to an account. The source must be an
 * anonymous owner id (`anon:<uuid>`); anything else is a 409, and the move
 * itself is one UPDATE in the store. Returns the number moved (0 when the
 * anonymous owner had no trainings — still a successful, spent claim).
 */
export async function claimAnonymousTrainings(
  accountOwnerId: string,
  fromOwnerId: string,
): Promise<number> {
  if (!isAnonymousCookieOwnerId(fromOwnerId)) {
    throw new TrainingServiceError(
      409,
      'TRAINING_NOT_ANONYMOUS_OWNER',
      `cannot claim from non-anonymous owner ${fromOwnerId}`,
    );
  }
  const store = await getTrainingStore();
  return store.claimTrainings(fromOwnerId, accountOwnerId);
}
