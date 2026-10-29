import { describe, expect, test } from 'vitest';

import { idempotencyScope, isValidIdempotencyKey } from '@/lib/training/idempotency';

describe('idempotency keys', () => {
  test('accepts well-formed UUIDs', () => {
    expect(isValidIdempotencyKey('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidIdempotencyKey('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  test('rejects garbage, empty and non-string keys', () => {
    expect(isValidIdempotencyKey('not-a-uuid')).toBe(false);
    expect(isValidIdempotencyKey('')).toBe(false);
    expect(isValidIdempotencyKey(null)).toBe(false);
    expect(isValidIdempotencyKey(42)).toBe(false);
    expect(isValidIdempotencyKey('123e4567-e89b-12d3-a456')).toBe(false);
  });

  test('scope binds a key to one training', () => {
    expect(idempotencyScope('t-1', 'k')).toBe('t-1:k');
    expect(idempotencyScope('t-1', 'k')).not.toBe(idempotencyScope('t-2', 'k'));
  });
});
