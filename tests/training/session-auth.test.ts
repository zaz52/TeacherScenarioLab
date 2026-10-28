import { describe, expect, test } from 'vitest';

import type { OwnerAuthRequest } from '@/lib/server/identity/types';
import {
  hashTrainingSessionToken,
  isTrainingAdmin,
  isTrainingAccountOwnerId,
  mintTrainingSessionToken,
  trainingSessionAuthMethod,
  type TrainingSessionLookup,
} from '@/lib/training/session-auth';

function requestWithCookie(cookie: string | undefined): OwnerAuthRequest {
  return {
    headers: new Headers(cookie === undefined ? {} : { cookie }),
  };
}

function fakeLookup(
  sessions: Record<
    string,
    { accountId: string; expiresAt: number; roles: string[] }
  >,
): TrainingSessionLookup {
  return {
    getSessionByTokenHash: async (tokenHash) => {
      const entry = Object.entries(sessions).find(
        ([token, _entry]) => hashTrainingSessionToken(token) === tokenHash,
      );
      if (!entry) return null;
      const [, value] = entry;
      return {
        session: { accountId: value.accountId, expiresAt: value.expiresAt },
        account: { accountId: value.accountId, displayName: '学员', roles: value.roles },
      };
    },
  };
}

describe('trainingSessionAuthMethod', () => {
  test('absent cookie is not-applicable (caller falls back)', async () => {
    const method = trainingSessionAuthMethod({ lookup: fakeLookup({}) });
    expect((await method.authenticate(requestWithCookie(undefined))).status).toBe(
      'not-applicable',
    );
  });

  test('unknown token is invalid, never anonymous', async () => {
    const method = trainingSessionAuthMethod({ lookup: fakeLookup({}) });
    const result = await method.authenticate(
      requestWithCookie('training_session=nope'),
    );
    expect(result.status).toBe('invalid');
  });

  test('expired session is invalid', async () => {
    const method = trainingSessionAuthMethod({
      lookup: fakeLookup({
        'old-token': { accountId: 'acct:1', expiresAt: Date.now() - 1000, roles: [] },
      }),
    });
    const result = await method.authenticate(
      requestWithCookie('training_session=old-token'),
    );
    expect(result.status).toBe('invalid');
  });

  test('valid session authenticates a verified user principal', async () => {
    const method = trainingSessionAuthMethod({
      lookup: fakeLookup({
        'good-token': { accountId: 'acct:1', expiresAt: Date.now() + 60000, roles: [] },
      }),
    });
    const result = await method.authenticate(
      requestWithCookie('training_session=good-token; anonymous_id=123'),
    );
    expect(result.status).toBe('authenticated');
    if (result.status !== 'authenticated') return;
    expect(result.principal.ownerId).toBe('acct:1');
    expect(result.principal.kind).toBe('user');
    expect(result.principal.assurance).toBe('verified');
    expect(result.principal.channel).toBe('training-session');
    expect(result.principal.roles.has('admin')).toBe(false);
  });

  test('admin comes only from the deployment list', async () => {
    const lookup = fakeLookup({
      'good-token': { accountId: 'acct:1', expiresAt: Date.now() + 60000, roles: [] },
    });
    const listed = trainingSessionAuthMethod({
      lookup,
      adminAccountIds: new Set(['acct:1']),
    });
    const listedResult = await listed.authenticate(
      requestWithCookie('training_session=good-token'),
    );
    expect(listedResult.status).toBe('authenticated');
    if (listedResult.status === 'authenticated') {
      expect(isTrainingAdmin(listedResult.principal)).toBe(true);
    }
    const unlisted = trainingSessionAuthMethod({ lookup, adminAccountIds: new Set() });
    const unlistedResult = await unlisted.authenticate(
      requestWithCookie('training_session=good-token'),
    );
    expect(unlistedResult.status).toBe('authenticated');
    if (unlistedResult.status === 'authenticated') {
      expect(isTrainingAdmin(unlistedResult.principal)).toBe(false);
    }
  });

  test('describeStoredOwner classifies only acct: ids', () => {
    const method = trainingSessionAuthMethod({ lookup: fakeLookup({}) });
    expect(method.describeStoredOwner?.('acct:abc')?.kind).toBe('user');
    expect(method.describeStoredOwner?.('anon:abc')).toBeUndefined();
    expect(method.describeStoredOwner?.('owner-1')).toBeUndefined();
    expect(method.issuesAnonymousOwners).toBe(false);
  });

  test('token hashing is deterministic and never the raw token', () => {
    const token = mintTrainingSessionToken();
    expect(hashTrainingSessionToken(token)).toBe(hashTrainingSessionToken(token));
    expect(hashTrainingSessionToken(token)).not.toBe(token);
    expect(mintTrainingSessionToken()).not.toBe(token);
    expect(isTrainingAccountOwnerId('acct:abc')).toBe(true);
    expect(isTrainingAccountOwnerId('anon:abc')).toBe(false);
  });
});
