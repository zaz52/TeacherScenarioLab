import { accountDatabase, AccountError } from '@/lib/server/accounts/database';
import { getTrainingStore } from './server';
export type LibraryKind = 'scenario' | 'training';
export interface RemovedItem {
  kind: LibraryKind;
  key: string;
  title: string;
  removedAt: number;
}
export const scenarioKey = (id: string, version: number) => `${id}@${version}`;
export async function removedItems(ownerId: string): Promise<RemovedItem[]> {
  if (!ownerId.startsWith('acct:')) return [];
  const result = await (
    await accountDatabase()
  ).query(
    'SELECT kind,item_key AS key,title,removed_at FROM teacherlab_library_removed WHERE owner_id=$1 ORDER BY removed_at DESC',
    [ownerId],
  );
  return result.rows.map((row) => ({
    kind: row.kind,
    key: row.key,
    title: row.title,
    removedAt: Number(row.removed_at),
  }));
}
export async function removedKeys(ownerId: string, kind: LibraryKind) {
  return new Set(
    (await removedItems(ownerId)).filter((item) => item.kind === kind).map((item) => item.key),
  );
}
export async function updateLibrary(
  ownerId: string,
  input: {
    kind: LibraryKind;
    key: string;
    action: 'remove' | 'restore';
  },
) {
  if (!ownerId.startsWith('acct:')) throw new AccountError(403, 'LOGIN_REQUIRED');
  const database = await accountDatabase();
  if (input.action === 'restore') {
    await database.query(
      'DELETE FROM teacherlab_library_removed WHERE owner_id=$1 AND kind=$2 AND item_key=$3',
      [ownerId, input.kind, input.key],
    );
    return;
  }
  const store = await getTrainingStore();
  let title: string;
  if (input.kind === 'training') {
    const training = await store.forOwner(ownerId).getTraining(input.key);
    if (!training) throw new AccountError(404, 'TRAINING_NOT_FOUND');
    const scenario = await store.getScenarioVersion(training.scenarioId, training.scenarioVersion);
    title = scenario?.title ?? training.scenarioId;
  } else {
    const cut = input.key.lastIndexOf('@');
    const version = Number(input.key.slice(cut + 1));
    if (cut < 1 || !Number.isSafeInteger(version) || version < 1)
      throw new AccountError(400, 'INVALID_REQUEST');
    const scenario = await store.getScenarioVersion(input.key.slice(0, cut), version);
    if (!scenario || scenario.publishedAt === null)
      throw new AccountError(404, 'SCENARIO_NOT_FOUND');
    title = scenario.title;
  }
  await database.query(
    'INSERT INTO teacherlab_library_removed VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner_id,kind,item_key) DO UPDATE SET title=EXCLUDED.title,removed_at=EXCLUDED.removed_at',
    [ownerId, input.kind, input.key, title, Date.now()],
  );
}
