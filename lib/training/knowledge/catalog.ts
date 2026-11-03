import tutor from './tutor.json';
import assessor from './assessor.json';
import parents from './parents.json';
import scenarios from './scenarios.json';
import type { KnowledgeCategory, KnowledgeEntry } from './types';
export const TRAINING_KNOWLEDGE = [
  ...tutor,
  ...assessor,
  ...parents,
  ...scenarios,
] as KnowledgeEntry[];
export function getKnowledgeById(id: string) {
  return TRAINING_KNOWLEDGE.find((entry) => entry.id === id);
}
export function retrieveKnowledge(category: KnowledgeCategory, text: string, limit = 3) {
  return TRAINING_KNOWLEDGE.filter((entry) => entry.category === category)
    .map((entry, index) => ({
      entry,
      index,
      score: entry.tags.reduce((total, tag) => total + (text.includes(tag) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, Math.min(8, limit)))
    .map(({ entry }) => entry);
}
export function knowledgePrompt(category: KnowledgeCategory, text: string) {
  return retrieveKnowledge(category, text)
    .map(
      (entry) =>
        '实训应用建议（编辑整理）：' +
        entry.application +
        ' 关联阅读：' +
        entry.reference.title +
        '，' +
        entry.reference.year +
        '。',
    )
    .join('\n');
}
