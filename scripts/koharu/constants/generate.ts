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
    script: 'src/scripts/generateLqips.ts',
  },
  {
    id: 'similarities',
    label: 'Similarity Vectors',
    description: 'Slower - Generate semantic similarity vectors',
    duration: 'medium',
    script: 'src/scripts/generateSimilarities.ts',
  },
  {
    id: 'summaries',
    label: 'AI Summaries',
    description: 'Gemini - Generate AI article summaries',
    duration: 'slow',
    script: 'src/scripts/generateSummaries.ts',
    requiresLlm: true,
  },
];

export const DEFAULT_LLM_MODEL = 'gemini-1.5-flash';
// Gemini OpenAI-compatible base URL
export const LLM_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
