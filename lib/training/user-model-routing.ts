import { z } from 'zod';
import { accountDatabase, AccountError } from '@/lib/server/accounts/database';
import { savedProviderTarget } from '@/lib/server/model-config/runtime';
export const userRoutingSchema = z
  .object({
    roleplay: z.string().max(400).nullable(),
    evaluation: z.string().max(400).nullable(),
    characters: z
      .record(z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), z.string().max(400).nullable())
      .default({}),
  })
  .strict();
export type UserRouting = z.infer<typeof userRoutingSchema>;
export async function readUserRouting(ownerId: string): Promise<UserRouting> {
  const r = await (
    await accountDatabase()
  ).query('SELECT data FROM teacherlab_user_model_routing WHERE owner_id=$1', [ownerId]);
  return r.rows[0]?.data ?? { roleplay: null, evaluation: null, characters: {} };
}
export async function saveUserRouting(ownerId: string, value: UserRouting) {
  for (const ref of [value.roleplay, value.evaluation, ...Object.values(value.characters)])
    if (ref) {
      const target = await savedProviderTarget(ref, 'chat', ownerId, { workspaceOnly: true });
      if (target.providerSource !== 'workspace')
        throw new AccountError(400, 'PERSONAL_MODEL_REQUIRED');
    }
  await (
    await accountDatabase()
  ).query(
    'INSERT INTO teacherlab_user_model_routing VALUES($1,$2) ON CONFLICT(owner_id) DO UPDATE SET data=EXCLUDED.data',
    [ownerId, value],
  );
}
export async function pruneUserRouting(
  ownerId: string,
  provider: string,
  remaining: readonly string[],
) {
  const prefix = provider + ':',
    routing = await readUserRouting(ownerId);
  const keep = (ref: string | null) =>
    ref?.startsWith(prefix) && !remaining.includes(ref.slice(prefix.length)) ? null : ref;
  const updated = {
    roleplay: keep(routing.roleplay),
    evaluation: keep(routing.evaluation),
    characters: Object.fromEntries(
      Object.entries(routing.characters).map(([id, ref]) => [id, keep(ref)]),
    ),
  };
  await (
    await accountDatabase()
  ).query('UPDATE teacherlab_user_model_routing SET data=$2 WHERE owner_id=$1', [ownerId, updated]);
}
