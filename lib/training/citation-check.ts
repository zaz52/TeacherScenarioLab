/**
 * TeacherScenarioLab — 引用校验器（纯函数，无 I/O）。
 *
 * 校验一条待引用文献是否与文献库（lib/training/references.ts）一致：
 * 库内 id 是否存在、DOI 格式与归属、标题相似度、年份合理性与一致性。
 * 只做确定性校验，不联网、不改写任何数据；命中问题时返回问题列表，
 * 不抛错，调用方按 valid 决定是否放行。
 */
import {
  findReferenceByDoi,
  getReferenceById,
  type TrainingReference,
} from './references';

export interface CitationInput {
  id?: string;
  doi?: string;
  title?: string;
  year?: number;
}

export type CitationIssueCode =
  | 'empty-citation'
  | 'unknown-reference-id'
  | 'doi-not-in-library'
  | 'doi-mismatch'
  | 'invalid-doi-format'
  | 'title-mismatch'
  | 'year-mismatch'
  | 'implausible-year';

export interface CitationIssue {
  code: CitationIssueCode;
  message: string;
}

export interface CitationCheckResult {
  valid: boolean;
  reference: TrainingReference | null;
  issues: CitationIssue[];
}

/** DOI 注册格式：10. 前缀 + 注册商码 + / + 后缀（不含空白）。 */
const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

/** 标题相似度阈值：token Dice 系数低于此值判为标题不符。 */
const TITLE_SIMILARITY_THRESHOLD = 0.8;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim();
}

function tokenDice(a: string, b: string): number {
  const setA = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const setB = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

function titlesMatch(a: string, b: string): boolean {
  if (normalizeTitle(a) === normalizeTitle(b)) return true;
  return tokenDice(a, b) >= TITLE_SIMILARITY_THRESHOLD;
}

export function validateCitation(input: CitationInput): CitationCheckResult {
  const issues: CitationIssue[] = [];
  let reference: TrainingReference | null = null;

  const hasId = typeof input.id === 'string' && input.id.trim() !== '';
  const hasDoi = typeof input.doi === 'string' && input.doi.trim() !== '';
  const hasTitle = typeof input.title === 'string' && input.title.trim() !== '';
  const hasYear = typeof input.year === 'number' && Number.isFinite(input.year);

  if (!hasId && !hasDoi && !hasTitle && !hasYear) {
    return {
      valid: false,
      reference: null,
      issues: [{ code: 'empty-citation', message: 'citation is empty' }],
    };
  }

  if (hasId) {
    reference = getReferenceById(input.id as string) ?? null;
    if (!reference) {
      issues.push({
        code: 'unknown-reference-id',
        message: `unknown reference id: ${input.id}`,
      });
    }
  }

  if (hasDoi) {
    const doi = (input.doi as string).trim();
    if (!DOI_PATTERN.test(doi)) {
      issues.push({ code: 'invalid-doi-format', message: `invalid DOI format: ${doi}` });
    } else if (reference) {
      if (reference.doi && reference.doi.toLowerCase() !== doi.toLowerCase()) {
        issues.push({
          code: 'doi-mismatch',
          message: `DOI does not match reference ${reference.id}`,
        });
      } else if (!reference.doi) {
        issues.push({
          code: 'doi-mismatch',
          message: `reference ${reference.id} has no DOI recorded`,
        });
      }
    } else {
      const byDoi = findReferenceByDoi(doi);
      if (byDoi) {
        reference = byDoi;
      } else {
        issues.push({ code: 'doi-not-in-library', message: `DOI not in library: ${doi}` });
      }
    }
  }

  if (hasTitle && reference && !titlesMatch(input.title as string, reference.title)) {
    issues.push({
      code: 'title-mismatch',
      message: `title does not match reference ${reference.id}`,
    });
  }

  if (hasYear) {
    const year = input.year as number;
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > currentYear + 1) {
      issues.push({ code: 'implausible-year', message: `implausible year: ${year}` });
    } else if (reference && reference.year !== year) {
      issues.push({
        code: 'year-mismatch',
        message: `year does not match reference ${reference.id}`,
      });
    }
  }

  return { valid: issues.length === 0, reference, issues };
}

export function validateCitations(inputs: CitationInput[]): CitationCheckResult[] {
  return inputs.map((input) => validateCitation(input));
}
