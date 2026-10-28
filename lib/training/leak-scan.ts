/**
 * TeacherScenarioLab — output-side leak scan (server only, pure).
 *
 * The primary leak defense is prompt construction (a character's prompt
 * never contains other characters' private facts or locked hidden facts).
 * This scan is the safety net for model output: before a reply is
 * persisted, it is checked against every fact the speaker must NOT know
 * (other characters' private facts + still-locked hidden facts). A fact
 * leaks when the reply contains its full normalized content, or any
 * punctuation-delimited segment of at least MIN_SEGMENT_CHARS characters
 * — enough to catch near-verbatim repeats without flagging single shared
 * words. Paraphrase beyond segments can still slip through; the scan is a
 * deterministic net, not a semantic guarantee.
 *
 * Normalization strips whitespace and punctuation so spacing or punctuation
 * differences cannot dodge the check.
 */
import type { TrainingFact } from './scenario';

export const MIN_SEGMENT_CHARS = 6;

export function normalizeForScan(text: string): string {
  return text.replace(/[\s\p{P}]/gu, '');
}

function factSegments(fact: TrainingFact): string[] {
  return fact.content
    .split(/[\s\p{P}]+/u)
    .map((segment) => normalizeForScan(segment))
    .filter((segment) => segment.length >= MIN_SEGMENT_CHARS);
}

/**
 * Forbidden facts found in the reply, by fact id. The speaker's own
 * private facts, public facts, and already-disclosed facts are never
 * passed in — callers build the forbidden set.
 */
export function scanReplyForLeaks(
  replyText: string,
  forbiddenFacts: TrainingFact[],
): string[] {
  const normalized = normalizeForScan(replyText);
  if (!normalized) return [];
  const leaked: string[] = [];
  for (const fact of forbiddenFacts) {
    const full = normalizeForScan(fact.content);
    if (full && normalized.includes(full)) {
      leaked.push(fact.id);
      continue;
    }
    if (factSegments(fact).some((segment) => normalized.includes(segment))) {
      leaked.push(fact.id);
    }
  }
  return leaked;
}
