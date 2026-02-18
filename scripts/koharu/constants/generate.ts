export type GenerateType = 'lqips' | 'similarities' | 'summaries';

export interface GenerateItem {
  id: GenerateType;
  label: string;
  description: string;
  duration: 'fast' | 'medium' | 'slow';
  script: string;
  requiresLlm?: boolean;
}

export const GENERATE_ITEMS: GenerateItem[] = [
  {
    id: 'lqips',
    label: 'LQIP Image Placeholders',
    description: 'Fast - Generate Low Quality Image Placeholders',
    duration: 'fast',
    script: 'src/scripts/generateLqips.ts', // TODO: Refactor to root scripts directory
  },
  {
    id: 'similarities',
    label: 'Similarity Vectors',
    description: 'Slower - Generate semantic similarity vectors (requires model download and caching for first time)',
    duration: 'medium',
    script: 'src/scripts/generateSimilarities.ts', // TODO: Refactor to root scripts directory
  },
  {
    id: 'summaries',
    label: 'AI Summaries',
    description: 'LLM Dependent - Generate AI article summaries',
    duration: 'slow',
    script: 'src/scripts/generateSummaries.ts', // TODO: Refactor to root scripts directory
    requiresLlm: true,
  },
];

export const DEFAULT_LLM_MODEL = 'qwen/qwen3-4b-2507';
export const LLM_API_URL = 'http://127.0.0.1:1234/v1/';
