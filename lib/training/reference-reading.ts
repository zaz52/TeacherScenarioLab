import readings from './knowledge/reference-readings.json';

export type ReferenceReadingStatus = 'open-text' | 'abstract' | 'pending';
export interface ReferenceReading {
  method: string;
  findings: string;
  application: string;
  limitations: string;
  sourceUrl: string;
  checkedAt: string;
  scope: 'open-text' | 'abstract';
  fullText?: {
    title: string;
    doi: string | null;
    sourceUrl: string;
    license: { label: string; url: string };
    sections: Array<{ title: string; paragraphs: string[] }>;
  };
}

const content = readings as Record<string, ReferenceReading>;

/** Article text stays in the detail response; catalog responses contain reading summaries. */
export function getReferenceReading(id: string): ReferenceReading | null {
  return content[id] ?? null;
}
