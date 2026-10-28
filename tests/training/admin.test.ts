import { describe, expect, test } from 'vitest';

import type { OwnerPrincipal } from '@/lib/server/identity/types';
import { requireTrainingAdmin } from '@/lib/training/admin';
import { TrainingServiceError } from '@/lib/training/store';

function principal(roles: string[], kind: 'user' | 'anonymous' = 'user'): OwnerPrincipal {
  return {
    ownerId: kind === 'anonymous' ? 'anon:abc' : 'acct:1',
    kind,
    roles: new Set(roles),
    assurance: 'verified',
  };
}

describe('requireTrainingAdmin', () => {
  test('admin principal passes', () => {
    expect(() => requireTrainingAdmin(principal(['admin']))).not.toThrow();
  });

  test('non-admin account gets 403 TRAINING_ADMIN_REQUIRED', () => {
    try {
      requireTrainingAdmin(principal([]));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TrainingServiceError);
      expect((error as TrainingServiceError).status).toBe(403);
      expect((error as TrainingServiceError).code).toBe('TRAINING_ADMIN_REQUIRED');
    }
  });

  test('anonymous principal gets 403', () => {
    try {
      requireTrainingAdmin(principal([], 'anonymous'));
      expect.unreachable();
    } catch (error) {
      expect((error as TrainingServiceError).status).toBe(403);
    }
  });
});
