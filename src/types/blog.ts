import type { CollectionEntry } from 'astro:content';

/**
 * Blog post schema - matches the schema defined in content/config.ts
 * This is the OUTPUT type after Zod transforms are applied.
 */
export interface BlogSchema {
  title: string;
  description?: string;
  link?: string;
  date: Date;
  updated?: Date;
  cover?: string;
  tags?: string[];
  subtitle?: string;
  catalog?: boolean;
  categories?: string[] | string[][];
  sticky?: boolean;
  draft?: boolean;
  tocNumbering?: boolean;
  /** Exclude this post from AI summary generation */
  excludeFromSummary?: boolean;
  /** Enable KaTeX math rendering for this post */
  math?: boolean;
  /** Enable quiz interaction for this post */
  quiz?: boolean;
  /** Password for encrypting the entire post content */
  password?: string;
}

/**
 * Blog post schema INPUT type - before Zod transforms.
 * gray-matter parses YAML dates as Date objects, so date fields accept both.
 */
export interface BlogSchemaInput extends Omit<BlogSchema, 'date' | 'updated'> {
  date: string | Date;
  updated?: string | Date;
}

/**
 * Blog post type from Astro content collections
 */
export type BlogPost = CollectionEntry<'blog'>;

/**
 * Minimum post reference - for navigation (3 fields)
 */
export interface PostRef {
  slug: string;
  link?: string;
  title: string;
}

/**
 * Post reference with category - for list display (4 fields)
 */
export interface PostRefWithCategory extends PostRef {
  categoryName?: string;
}

/**
 * Post card data - for card display
 */
export interface PostCardData {
  slug: string;
  link?: string;
  title: string;
  description?: string;
  date: Date;
  cover?: string;
  tags?: string[];
  categories?: string[] | string[][];
  draft?: boolean;
  wordCount: number; // Pre-computed word count
  readingTime: string; // Pre-computed reading time
  postLocale?: string; // Post's original locale code (for fallback marking)
}
