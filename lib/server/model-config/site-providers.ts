import { randomUUID } from 'node:crypto';
import { deploymentConfig } from './runtime';
import { getProviderPreset, registryDefaultBaseUrl } from '@/lib/config/provider-presets';
import type { ModelConfigLayer } from './resolve-slot';
import { openSecret, sealSecret, type SealedSecret } from '@/lib/server/secret-box';
import { poolDatabase, withPoolTransaction } from '@/lib/training/models/store';

type Override = { preset: string; baseUrl?: string; models: string[]; secret?: SealedSecret };
type State = { revision: number; providers: Record<string, Override> };
const ID = 'site-model-providers';
const context = (id: string) => `site-model-provider:${id}`;

export async function siteProviderState(): Promise<State> {
  if (!process.env.DATABASE_URL?.trim()) return { revision: 0, providers: {} };
  const result = await (
    await poolDatabase()
  ).query('SELECT data FROM training_model_control WHERE id=$1', [ID]);
  return result.rows[0]?.data ?? { revision: 0, providers: {} };
}

/** Server-only global overrides. Secrets never enter settings responses. */
export async function effectiveDeploymentLayer(): Promise<ModelConfigLayer | null> {
  const base = deploymentConfig().layer;
  const state = await siteProviderState();
  const providers = { ...base?.config.providers };
  for (const [id, entry] of Object.entries(state.providers)) {
    providers[id] = {
      ...providers[id],
      preset: entry.preset,
      models: entry.models,
      ...(entry.baseUrl ? { baseUrl: entry.baseUrl } : {}),
      ...(entry.secret ? { apiKey: openSecret(entry.secret, context(id)) } : {}),
    };
  }
  const group = process.env.TEACHERLAB_MAGPIE_DEFAULT_MODEL;
  const key = process.env.TEACHERLAB_MAGPIE_API_KEY;
  const slots = { ...base?.config.slots };
  if (group === 'group/teacherlab-auto' && key) {
    providers['teacherlab-gateway'] = {
      preset: 'openai-compatible',
      apiKey: key,
      baseUrl: 'https://teacherlab.weiyiai.top/api/model-gateway/v1',
      models: [group],
    };
    slots['classroom.roleplay'] = `teacherlab-gateway:${group}`;
    slots['classroom.evaluation'] = `teacherlab-gateway:${group}`;
  }
  return base || Object.keys(providers).length
    ? { source: 'deployment', config: { ...base?.config, providers, slots } }
    : null;
}

export async function saveSiteProvider(
  input: { id: string; revision: number; baseUrl: string; models: string[]; apiKey?: string },
  actor: string,
) {
  const base = deploymentConfig().layer?.config.providers?.[input.id];
  if (
    !base ||
    !['google', 'glm', 'openai', 'openai-compatible', 'anthropic', 'openrouter'].includes(
      base.preset,
    )
  )
    throw new Error('unsupported-provider');
  const { applyModelSettingsChange } = await import('./settings');
  // Use the existing endpoint, preset, credential and model validation.
  await applyModelSettingsChange(null, {
    kind: 'provider',
    id: 'site-provider-check',
    preset: base.preset,
    baseUrl: input.baseUrl,
    models: input.models,
    apiKey: input.apiKey,
  });
  await withPoolTransaction(async (tx) => {
    const result = await tx.query(
      'SELECT data FROM training_model_control WHERE id=$1 FOR UPDATE',
      [ID],
    );
    const state: State = result.rows[0]?.data ?? { revision: 0, providers: {} };
    if (state.revision !== input.revision) throw new Error('revision-conflict');
    const previous = state.providers[input.id];
    const oldUrl =
      previous?.baseUrl ??
      base.baseUrl ??
      registryDefaultBaseUrl(
        'chat',
        getProviderPreset(base.preset)?.capabilities.chat?.registryId ?? base.preset,
      );
    if (oldUrl !== input.baseUrl && !input.apiKey) throw new Error('new-key-required');
    const entry: Override = {
      preset: base.preset,
      baseUrl: input.baseUrl,
      models: [...new Set(input.models)],
      secret: input.apiKey ? sealSecret(input.apiKey, context(input.id)) : previous?.secret,
    };
    state.providers[input.id] = entry;
    state.revision++;
    await tx.query(
      'INSERT INTO training_model_control VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',
      [ID, state],
    );
    await tx.query("DELETE FROM training_model_qualifications WHERE split_part(key,':',1)=$1", [
      input.id,
    ]);
    await tx.query('INSERT INTO training_model_audit VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      actor,
      'site-provider-updated',
      Date.now(),
      { provider: input.id, revision: state.revision },
    ]);
  });
}
