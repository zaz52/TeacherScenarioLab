import {
  type Failure,
  type ModelPolicy,
  type ModelTask,
  type Qualification,
  modelKey,
} from './types';

export function classifyFailure(error: unknown, now = Date.now()): Failure {
  const e = error as {
    statusCode?: number;
    responseBody?: string;
    message?: string;
    responseHeaders?: Record<string, string>;
    kind?: string;
    name?: string;
    cause?: unknown;
  } | null;
  const status = typeof e?.statusCode === 'number' ? e.statusCode : null;
  const body = `${e?.responseBody ?? ''} ${e?.message ?? ''}`.toLowerCase();
  const seconds = Number(e?.responseHeaders?.['retry-after']);
  const date = Date.parse(e?.responseHeaders?.['retry-after'] ?? '');
  const retryAt =
    Number.isFinite(seconds) && seconds > 0
      ? now + Math.min(seconds, 86400) * 1000
      : Number.isFinite(date) && date > now
        ? date
        : now + 60000;
  const base = { httpStatus: status, retryAt: null, retry: false, terminal: false };
  if (e?.kind === 'safety' || /content.?filter|safety|policy_violation|content_policy/.test(body))
    return { ...base, kind: 'safety', terminal: true };
  if (e?.kind === 'privacy' || e?.kind === 'evidence')
    return { ...base, kind: e.kind, terminal: true };
  if (e?.kind === 'json' || e?.kind === 'empty') return { ...base, kind: e.kind };
  if (status === 401 || status === 403) return { ...base, kind: 'auth' };
  if (status === 404) return { ...base, kind: 'missing-model' };
  if (status === 429 || status === 402) {
    if (/1113|insufficient_quota|余额不足|无可用资源|credit|billing|quota.?exhaust/.test(body))
      return { ...base, kind: 'quota' };
    const kind = /requests.?per.?day|\brpd\b|daily|perday/.test(body)
      ? 'rpd'
      : /tokens.?per.?min|\btpm\b|pertoken|tokensperminute/.test(body)
        ? 'tpm'
        : /requests.?per.?min|\brpm\b|requestsperminute/.test(body)
          ? 'rpm'
          : 'rate-limit';
    return {
      ...base,
      kind,
      retryAt: kind === 'rpd' && retryAt === now + 60000 ? now + 86400000 : retryAt,
    };
  }
  if (status && status >= 500)
    return { ...base, kind: 'server', retry: true, retryAt: now + 30000 };
  if (/timeout|abort/i.test(e?.name ?? '') || /timeout|timed out/.test(body))
    return { ...base, kind: 'timeout', retry: true, retryAt: now + 30000 };
  // SDK wrappers retain the HTTP error in cause.
  if (e?.cause && e.cause !== error) return classifyFailure(e.cause, now);
  return { ...base, kind: 'network', retry: true, retryAt: now + 30000 };
}

export function freeEligible(p: ModelPolicy, now: number): boolean {
  p = budgetForWindow(p, now);
  if ((p.expiresAt && p.expiresAt <= now) || (p.resetAt && p.resetAt <= now)) return false;
  if (p.provider === 'nvidia')
    return (
      p.nvidiaAuthorized &&
      p.dailyBudgetUsd > 0 &&
      p.perCallBudgetUsd > 0 &&
      p.inputUsdPerMillion !== null &&
      p.outputUsdPerMillion !== null
    );
  if (p.provider === 'openrouter' && !p.modelId.endsWith(':free')) return false;
  if (p.provider === 'google' && p.modelId !== 'gemini-3.8-flash') return false;
  if (
    p.provider === 'cloudflare' &&
    (!['@cf/meta/llama-3.2-1b-instruct', '@cf/meta/llama-3.2-3b-instruct'].includes(p.modelId) ||
      p.quotaUnit !== 'neurons')
  )
    return false;
  if (p.provider === 'glm' && p.modelId === 'glm-4.7-flash' && p.free === 'zero-price') return true;
  if (
    p.free === 'unknown' ||
    p.free === 'paid' ||
    !p.accountVerifiedUntil ||
    p.accountVerifiedUntil <= now
  )
    return false;
  if (p.expiresAt && p.expiresAt <= now) return false;
  // A reset is an observation boundary: refresh the account before spending again.
  if (p.resetAt && p.resetAt <= now) return false;
  if (!p.observedAt || now - p.observedAt > 86400000 || p.quotaSource === 'unavailable')
    return false;
  return (
    p.remaining !== null &&
    p.remaining > 0 &&
    (p.quotaUnit === 'requests' || (p.reservePerCall !== null && p.remaining >= p.reservePerCall))
  );
}

/** Only the configured local spending budget resets automatically. */
export function budgetForWindow(p: ModelPolicy, now: number): ModelPolicy {
  if (
    p.quotaScope !== 'local-budget' ||
    !p.resetAt ||
    p.resetAt > now ||
    p.total === null ||
    !['daily', 'monthly'].includes(p.quotaKind)
  )
    return p;
  let start = p.resetAt;
  let next = start;
  if (p.quotaKind === 'daily') {
    start += Math.floor((now - start) / 86400000) * 86400000;
    next = start + 86400000;
  } else {
    for (let i = 0; next <= now && i < 1200; i++) {
      start = next;
      const date = new Date(start);
      const maxDay = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0),
      ).getUTCDate();
      next = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        Math.min(date.getUTCDate(), maxDay),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
      );
    }
  }
  return { ...p, remaining: p.total, observedAt: start, resetAt: next };
}

export function eligible(
  p: ModelPolicy,
  task: ModelTask,
  qualification: Qualification | undefined,
  now: number,
): boolean {
  return (
    p.enabled &&
    p.tasks.includes(task) &&
    p.privacyReviewed &&
    freeEligible(p, now) &&
    Boolean(
      qualification?.task === task &&
      qualification.key === modelKey(p) &&
      qualification.passed &&
      qualification.source === 'real' &&
      qualification.suiteVersion === 2 &&
      now - qualification.checkedAt < 30 * 86400000,
    )
  );
}

export function orderCandidates(
  policies: ModelPolicy[],
  task: ModelTask,
  pinned: string | null,
  manual: string | null,
): ModelPolicy[] {
  const rank = (p: ModelPolicy) =>
    p.provider === 'nvidia'
      ? 4
      : p.provider === (task === 'roleplay' ? 'glm' : 'google')
        ? 2
        : p.provider === (task === 'roleplay' ? 'google' : 'glm')
          ? 3
          : 1;
  return [...policies].sort((a, b) => {
    if (pinned && (modelKey(a) === pinned || modelKey(b) === pinned))
      return modelKey(a) === pinned ? -1 : 1;
    // Manual selection preserves the final-fallback constraint.
    if (a.provider === 'nvidia' || b.provider === 'nvidia') return rank(a) - rank(b);
    if (manual && (modelKey(a) === manual || modelKey(b) === manual))
      return modelKey(a) === manual ? -1 : 1;
    return (
      rank(a) - rank(b) ||
      (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity) ||
      modelKey(a).localeCompare(modelKey(b))
    );
  });
}

// Reject high-risk free text; built-in scenario details are fictional. Arbitrary
// user names, addresses and health records cannot be reliably anonymized by regex.
export function protectPrompt(system: string, prompt: string): { system: string; prompt: string } {
  const sensitive =
    /(?:\b\d{17}[\dXx]\b|\b1[3-9]\d{9}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:真实姓名|身份证|家庭住址|家庭地址|病历|诊断书|家庭电话|姓名|学校名称|地址)\s*[:：]|(?:\d{1,3}\.){3}\d{1,3})/i;
  if (sensitive.test(system) || sensitive.test(prompt)) {
    const e = new Error('sensitive data requires a fictionalized scenario') as Error & {
      kind: string;
    };
    e.kind = 'privacy';
    throw e;
  }
  return { system, prompt };
}

export function percentile(values: number[], percentile: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentile * sorted.length) - 1))
  ];
}

export function minimizeNames(text: string, names: readonly string[]): string {
  const replacements = names
    .map((name, index) => ({ name, alias: `[角色${index + 1}]` }))
    .filter((x) => x.name.length > 1)
    .sort((a, b) => b.name.length - a.name.length);
  let value = text;
  for (const { name, alias } of replacements) value = value.replaceAll(name, alias);
  return value.replace(/[^\s，。；：]{2,20}(?:小学|中学|幼儿园)/g, (name) =>
    name.startsWith('某') ? name : '[虚构学校]',
  );
}
