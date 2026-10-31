import { deploymentConfig } from '@/lib/server/model-config/runtime';
import {
  resolveModelReference,
  type ResolvedModelTarget,
} from '@/lib/server/model-config/resolve-slot';
import { fetchWithRedirectValidation } from '@/lib/server/fetch-with-redirect-validation';
import { proxyFetch } from '@/lib/server/proxy-fetch';
import {
  modelKey,
  policySchema,
  providerIds,
  type ModelPolicy,
  type PoolProviderId,
} from './types';

// These are connection profiles for the training pool. Existing presets remain intact.
export const PROFILES = {
  glm: {
    env: 'GLM_API_KEY',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    preset: 'glm',
    source: 'https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash',
  },
  google: {
    env: 'GOOGLE_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    preset: 'google',
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  groq: {
    env: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1',
    preset: 'openai-compatible',
    source: 'https://console.groq.com/docs/rate-limits',
  },
  mistral: {
    env: 'MISTRAL_API_KEY',
    baseUrl: 'https://api.mistral.ai/v1',
    preset: 'openai-compatible',
    source:
      'https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key',
  },
  cloudflare: {
    env: 'CLOUDFLARE_API_TOKEN',
    baseUrl: '',
    preset: 'openai-compatible',
    source: 'https://developers.cloudflare.com/workers-ai/platform/pricing/',
  },
  openrouter: {
    env: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    preset: 'openrouter',
    source: 'https://openrouter.ai/docs/api-reference/limits',
  },
  nvidia: {
    env: 'NVIDIA_API_KEY',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    preset: 'openai-compatible',
    source: 'https://build.nvidia.com/',
  },
} as const;
export const POLICY_VERIFIED_AT = '2026-10-30';
export const PRIVACY_SOURCE = 'https://ai.google.dev/gemini-api/terms';

export function providerConnection(provider: PoolProviderId) {
  const profile = PROFILES[provider];
  const configured = deploymentConfig().layer?.config.providers?.[provider];
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const baseUrl =
    provider === 'cloudflare'
      ? /^[a-f0-9]{32}$/i.test(account ?? '')
        ? `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`
        : ''
      : profile.baseUrl;
  // Credentials and endpoint form a pair; a deployment override uses its own key.
  return {
    apiKey: configured?.apiKey ?? process.env[profile.env]?.trim() ?? '',
    baseUrl: configured?.baseUrl ?? baseUrl,
    proxy: configured?.proxy ?? process.env[`${provider.toUpperCase()}_PROXY`]?.trim(),
  };
}

export function poolFetch(
  provider: PoolProviderId,
  onResponse?: (status: number) => void,
): typeof fetch {
  const proxy = providerConnection(provider).proxy;
  return async (input, init) =>
    fetchWithRedirectValidation(input instanceof Request ? input.url : input, init, {
      requireHttps: true,
      allowLocalNetworks: false,
      fetchImpl: async (url, options) => {
        const response = await proxyFetch(url, options, { proxy });
        onResponse?.(response.status);
        if (response.status >= 300 && response.status < 400)
          throw new Error('provider redirect refused');
        return response;
      },
    });
}

export function providerSummaries() {
  return providerIds.map((id) => {
    const c = providerConnection(id);
    return {
      id,
      configured: Boolean(c.apiKey && c.baseUrl),
      keyVariable: PROFILES[id].env,
      policySource: PROFILES[id].source,
      verifiedAt: POLICY_VERIFIED_AT,
      privacySource: id === 'google' ? PRIVACY_SOURCE : PROFILES[id].source,
    };
  });
}

export function poolTarget(policy: ModelPolicy): ResolvedModelTarget {
  const connection = providerConnection(policy.provider);
  // Training policies cannot redirect operator credentials to arbitrary hosts.
  const canonical = PROFILES[policy.provider].baseUrl;
  if (policy.provider !== 'cloudflare' && connection.baseUrl.replace(/\/$/, '') !== canonical)
    throw new Error('training pool requires the official provider endpoint');
  if (
    policy.provider === 'cloudflare' &&
    !/^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[a-f0-9]{32}\/ai\/v1$/i.test(
      connection.baseUrl,
    )
  )
    throw new Error('invalid Workers AI account endpoint');
  return resolveModelReference(modelKey(policy), 'chat', [
    {
      source: 'deployment',
      config: {
        providers: {
          [policy.provider]: {
            preset: PROFILES[policy.provider].preset,
            apiKey: connection.apiKey || undefined,
            baseUrl: connection.baseUrl,
            models: [policy.modelId],
          },
        },
      },
    },
  ]);
}

export function defaultPolicies(): ModelPolicy[] {
  return [
    policySchema.parse({
      provider: 'glm',
      modelId: 'glm-4.7-flash',
      enabled: true,
      tasks: ['roleplay', 'evaluation'],
      free: 'zero-price',
      quotaKind: 'zero-price',
      privacyReviewed: true,
    }),
    policySchema.parse({
      provider: 'google',
      modelId: 'gemini-3.8-flash',
      tasks: ['evaluation', 'roleplay'],
    }),
  ];
}

export interface Catalog {
  provider: PoolProviderId;
  checkedAt: number;
  httpStatus: number | null;
  models: string[];
  error: string | null;
}
export async function fetchCatalog(provider: PoolProviderId): Promise<Catalog> {
  const connection = providerConnection(provider);
  const result: Catalog = {
    provider,
    checkedAt: Date.now(),
    httpStatus: null,
    models: [],
    error: null,
  };
  if (!connection.apiKey || !connection.baseUrl) return { ...result, error: 'missing-credentials' };
  const canonical = PROFILES[provider].baseUrl;
  if (provider !== 'cloudflare' && connection.baseUrl.replace(/\/$/, '') !== canonical)
    return { ...result, error: 'nonofficial-endpoint' };
  if (
    provider === 'cloudflare' &&
    !/^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[a-f0-9]{32}\/ai\/v1$/i.test(
      connection.baseUrl,
    )
  )
    return { ...result, error: 'nonofficial-endpoint' };
  const url =
    provider === 'cloudflare'
      ? connection.baseUrl.replace(/\/v1$/, '/models/search')
      : `${connection.baseUrl.replace(/\/$/, '')}/models`;
  try {
    const response = await poolFetch(provider)(url, {
      headers:
        provider === 'google'
          ? { 'x-goog-api-key': connection.apiKey }
          : { Authorization: `Bearer ${connection.apiKey}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    result.httpStatus = response.status;
    if (!response.ok) return { ...result, error: `http-${response.status}` };
    const json = (await response.json()) as {
      data?: { id: string }[];
      models?: { name: string; supportedGenerationMethods?: string[] }[];
      result?: { name: string; task?: { name: string } }[];
    };
    result.models =
      provider === 'google'
        ? (json.models ?? [])
            .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m) => m.name.replace(/^models\//, ''))
        : provider === 'cloudflare'
          ? (json.result ?? []).filter((m) => m.task?.name === 'Text Generation').map((m) => m.name)
          : (json.data ?? []).map((m) => m.id);
    result.models = result.models
      .filter(
        (id) =>
          typeof id === 'string' &&
          /^[a-zA-Z0-9@_.:/-]{1,180}$/.test(id) &&
          (provider !== 'openrouter' || id.endsWith(':free')),
      )
      .slice(0, 1000);
    return result;
  } catch {
    return { ...result, error: 'network-or-timeout' };
  }
}
