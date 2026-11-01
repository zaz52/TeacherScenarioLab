import { z } from 'zod';
import { applyModelSettingsChange } from '@/lib/server/model-config/settings';
import { resolveModelReference } from '@/lib/server/model-config/resolve-slot';
import { openSecret, sealSecret, type SealedSecret } from '@/lib/server/secret-box';
import { validatePublicUrlForSSRF } from '@/lib/server/ssrf-guard';
import { customProviderIdSchema, PoolError } from './types';
import { poolDatabase, withPoolTransaction } from './store';

export const connectionSchema = z
  .object({
    id: customProviderIdSchema,
    preset: z.enum(['openai-compatible', 'openai', 'anthropic', 'google', 'glm']),
    baseUrl: z.string().url().max(2048),
    apiKey: z.string().min(1).max(4096).optional(),
    models: z
      .array(z.string().regex(/^[a-zA-Z0-9@_.:/-]{1,180}$/))
      .min(1)
      .max(100),
    revision: z.number().int().positive().nullable(),
  })
  .strict();
export type ConnectionInput = z.infer<typeof connectionSchema>;
interface StoredConnection extends Omit<ConnectionInput, 'apiKey' | 'revision'> {
  revision: number;
  secret: SealedSecret;
}
const context = (id: string) => `training-provider:${id}`;
export class ConnectionError extends PoolError {
  constructor(
    readonly reason:
      | 'invalid-endpoint'
      | 'dns-unverified'
      | 'instance-secret-missing'
      | 'revision-conflict'
      | 'new-key-required',
    kind: 'unavailable' | 'auth' | 'busy' = 'unavailable',
  ) {
    super(kind);
  }
}

export async function readCustomConnection(id: string) {
  if (!customProviderIdSchema.safeParse(id).success) return null;
  const pool = await poolDatabase();
  const result = await pool.query('SELECT data FROM training_model_control WHERE id=$1', [
    `provider:${id}`,
  ]);
  return (result.rows[0]?.data ?? null) as StoredConnection | null;
}

export async function customConnection(id: string) {
  const stored = await readCustomConnection(id);
  if (!stored) throw new PoolError('unavailable');
  try {
    return { ...stored, apiKey: openSecret(stored.secret, context(id)), proxy: undefined };
  } catch {
    throw new PoolError('auth');
  }
}

export async function customConnectionViews() {
  const pool = await poolDatabase();
  const result = await pool.query(
    "SELECT data FROM training_model_control WHERE id LIKE 'provider:custom-%' ORDER BY id",
  );
  return result.rows.map(({ data }: { data: StoredConnection }) => ({
    id: data.id,
    preset: data.preset,
    baseUrl: data.baseUrl,
    models: data.models,
    revision: data.revision,
    configured: Boolean(data.secret),
  }));
}

export async function saveCustomConnection(value: ConnectionInput, actor: string) {
  const input = connectionSchema.parse(value);
  const url = new URL(input.baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new ConnectionError('invalid-endpoint');
  if (
    input.apiKey &&
    (input.baseUrl.includes(input.apiKey) ||
      input.models.some((model) => model.includes(input.apiKey!)))
  )
    throw new PoolError('auth');
  if (await validatePublicUrlForSSRF(input.baseUrl)) throw new ConnectionError('dns-unverified');
  if (!process.env.OPENMAIC_SECRET_KEY?.trim())
    throw new ConnectionError('instance-secret-missing');
  // The existing settings service checks supported presets, DNS and public endpoints.
  const config = await applyModelSettingsChange(null, {
    kind: 'provider',
    id: input.id,
    preset: input.preset,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    models: input.models,
  });
  resolveModelReference(`${input.id}:${input.models[0]}`, 'chat', [
    { source: 'workspace', config },
  ]);
  await withPoolTransaction(async (tx) => {
    const result = await tx.query(
      'SELECT data FROM training_model_control WHERE id=$1 FOR UPDATE',
      [`provider:${input.id}`],
    );
    const old = result.rows[0]?.data as StoredConnection | undefined;
    if ((old?.revision ?? null) !== input.revision)
      throw new ConnectionError('revision-conflict', 'busy');
    // A new destination or protocol always needs a newly entered key.
    if (!input.apiKey && (!old || old.baseUrl !== input.baseUrl || old.preset !== input.preset))
      throw new ConnectionError('new-key-required', 'auth');
    const revision = (old?.revision ?? 0) + 1;
    const data: StoredConnection = {
      id: input.id,
      preset: input.preset,
      baseUrl: input.baseUrl,
      models: [...new Set(input.models)],
      revision,
      secret: input.apiKey ? sealSecret(input.apiKey, context(input.id)) : old!.secret,
    };
    await tx.query(
      'INSERT INTO training_model_control VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',
      [`provider:${input.id}`, data],
    );
    await tx.query(
      "UPDATE training_model_policies SET data=jsonb_set(jsonb_set(data,'{enabled}','false'),'{connectionRevision}',$2::jsonb) WHERE data->>'provider'=$1",
      [input.id, JSON.stringify(revision)],
    );
    await tx.query("DELETE FROM training_model_qualifications WHERE split_part(key,':',1)=$1", [
      input.id,
    ]);
    await tx.query('DELETE FROM training_model_catalogs WHERE provider=$1', [input.id]);
    // Audit contains identifiers and revision; secret and request bodies stay private.
    const { randomUUID } = await import('node:crypto');
    await tx.query('INSERT INTO training_model_audit VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      actor,
      'connection-updated',
      Date.now(),
      { provider: input.id, revision },
    ]);
  });
}
