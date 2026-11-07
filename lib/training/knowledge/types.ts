export const KNOWLEDGE_CATEGORIES = ['tutor', 'assessor', 'parents', 'scenarios'] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];
export type SupportDimension =
  | 'communication'
  | 'fact-checking'
  | 'judgment'
  | 'coordination'
  | 'responsibility';
export interface ParentProfile {
  id: string;
  label: string;
  signals: string;
  need: string;
  strategy: string;
  opening: string;
  tags: string[];
}
export interface ScenarioCase {
  id: string;
  label: string;
  context: string;
  task: string;
  grade: string;
  gradeHint: string;
  tags: string[];
}
export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  label: string;
  application: string;
  tags: string[];
  dimension?: SupportDimension;
  reference: {
    id: string;
    title: string;
    authors: string[];
    year: number;
    venue: string;
    doi?: string;
    url: string;
    locator?: string;
    topics: string[];
    summary: string;
  };
  journal: { label: string; sourceUrl: string; edition: string; verifiedAt: string };
  verification: { method: string; sourceUrl: string; checkedAt: string; contentScope: string };
  parentProfile?: ParentProfile;
  scenarioCase?: ScenarioCase;
}
