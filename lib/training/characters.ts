/**
 * TeacherScenarioLab — per-character fact packs.
 *
 * A fact pack is the only thing a role's prompt may ever be built from
 * (plus public facts and already-disclosed facts — see task 5). The pack
 * itself never contains another character's private facts; the context
 * filter enforces that by construction, not by asking the model to behave.
 */

import type { TrainingFact } from './scenario';

export interface CharacterFactPack {
  characterId: string;
  /** Background the character knows about itself and the situation. */
  background: string;
  /** Emotion baseline, e.g. `anxious but cooperative`. */
  emotionBaseline: string;
  /** How the character talks, e.g. `short, defensive answers; avoids detail`. */
  communicationStyle: string;
  /** Fact ids this character privately knows (must be character-private, owned by this character). */
  privateFactIds: string[];
  /** Fact ids this character may talk about openly. */
  publicFactIds: string[];
}

/**
 * Validate a fact pack against a scenario's fact table. Returns problems
 * (empty = valid). Pure function.
 */
export function validateFactPack(
  pack: CharacterFactPack,
  facts: TrainingFact[],
): string[] {
  const problems: string[] = [];
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  if (!pack.characterId) problems.push('characterId is empty');
  if (!pack.background) problems.push(`pack ${pack.characterId} has empty background`);
  if (!pack.communicationStyle) {
    problems.push(`pack ${pack.characterId} has empty communicationStyle`);
  }
  for (const id of pack.privateFactIds) {
    const fact = byId.get(id);
    if (!fact) {
      problems.push(`private fact ${id} is not in the scenario fact table`);
    } else if (
      fact.visibility !== 'character-private' ||
      fact.ownerCharacterId !== pack.characterId
    ) {
      problems.push(
        `private fact ${id} is not owned by ${pack.characterId} (visibility: ${fact.visibility})`,
      );
    }
  }
  for (const id of pack.publicFactIds) {
    if (!byId.has(id)) {
      problems.push(`public fact ${id} is not in the scenario fact table`);
    }
  }
  const overlap = pack.privateFactIds.filter((id) => pack.publicFactIds.includes(id));
  for (const id of overlap) {
    problems.push(`fact ${id} is listed as both private and public`);
  }
  return problems;
}
