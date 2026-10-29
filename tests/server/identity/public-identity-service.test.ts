import { describe, expect, it } from 'vitest';

import { isAnonymousOwnerId, withAnonymousClaimCandidate } from '@/lib/server/identity';
import type { OwnerPrincipal } from '@/lib/server/identity';

/**
 * The public identity helpers training code uses instead of the cookie
 * internals: attaching the anonymous claim candidate, and testing whether a
 * stored owner id is an anonymous owner. The cookie itself, its name and its
 * shape are never visible here — only kinds and claim candidates.
 */

const ANON_UUID = '123e4567-e89b-42d3-a456-426614174000';
const ANON_ID = `anon:${ANON_UUID}`;
const ACCOUNT_ID = 'acct:11111111-1111-4111-8111-111111111111';

function principal(ownerId: string, kind: OwnerPrincipal['kind']): OwnerPrincipal {
  return { ownerId, kind, roles: new Set(), assurance: 'verified' };
}

describe('withAnonymousClaimCandidate', () => {
  it('leaves anonymous principals untouched, even with a cookie', () => {
    const headers = new Headers({ cookie: `anonymous_id=${ANON_UUID}` });
    expect(withAnonymousClaimCandidate(principal(ANON_ID, 'anonymous'), headers)).toEqual(
      principal(ANON_ID, 'anonymous'),
    );
  });

  it('attaches the candidate when the request carries a different valid anonymous cookie', () => {
    const headers = new Headers({
      cookie: `theme=dark; anonymous_id=${ANON_UUID}; locale=en`,
    });
    const result = withAnonymousClaimCandidate(principal(ACCOUNT_ID, 'user'), headers);
    expect(result.ownerId).toBe(ACCOUNT_ID);
    expect(result.pendingClaim).toEqual({ fromOwnerId: ANON_ID, assurance: 'unverified-legacy' });
  });

  it('attaches nothing without a cookie or with a malformed cookie', () => {
    const account = principal(ACCOUNT_ID, 'user');
    expect(withAnonymousClaimCandidate(account, new Headers())).toEqual(account);
    expect(
      withAnonymousClaimCandidate(account, new Headers({ cookie: 'anonymous_id=not-a-uuid' })),
    ).toEqual(account);
  });

  it('attaches nothing when the cookie names the same owner', () => {
    // Synthetic: a non-anonymous principal carrying the anonymous id is not
    // a claim candidate — the cookie names its own owner.
    const headers = new Headers({ cookie: `anonymous_id=${ANON_UUID}` });
    const sameOwner = principal(ANON_ID, 'user');
    expect(withAnonymousClaimCandidate(sameOwner, headers)).toEqual(sameOwner);
  });
});

describe('isAnonymousOwnerId', () => {
  it.each([
    ['a valid anonymous id', ANON_ID, true],
    ['an account id', ACCOUNT_ID, false],
    ['an anonymous-shaped id with a bad uuid', 'anon:not-a-uuid', false],
    ['an empty id', '', false],
    ['an id with a space', 'anon: has space', false],
    ['a bare uuid without the prefix', ANON_UUID, false],
  ])('%s -> %s', (_label, id, expected) => {
    expect(isAnonymousOwnerId(id)).toBe(expected);
  });
});
