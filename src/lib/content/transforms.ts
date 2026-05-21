/**
 * Data transformation utilities for BlogPost
 * Converts heavy BlogPost objects to lightweight interfaces for component props
 *
 * Uses a flexible pick-based API that allows selecting specific fields on demand
 */

import readingTime from 'reading-time';
import type { BlogPost } from '@/types/blog';
import { getPostLocale, getSlugLocaleInfo } from './locale';
import { getPostDescriptionWithSummary, getPostLastCategory } from './posts';

/**
 * BlogPost extractable field mapping
 * - Direct fields: taken directly from post.slug or post.data.xxx
 * - Computed fields: require function calls to compute
 */
export type PostFieldMap = {
  // Direct fields
  slug: string;
  link: string | undefined;
  title: string;
  date: Date;
  cover: string | undefined;
  tags: string[] | undefined;
  categories: string[] | string[][] | undefined;
  draft: boolean | undefined;
  // Computed fields
  categoryName: string | undefined; // from getPostLastCategory()
  description: string; // from getPostDescriptionWithSummary()
  wordCount: number; // from reading-time
  readingTime: string; // from reading-time
  postLocale: string; // from getPostLocale()
};

/**
 * Field extractor mapping
 * Each field maps to a function that extracts a value from BlogPost
 */
const fieldExtractors: { [K in keyof PostFieldMap]: (post: BlogPost) => PostFieldMap[K] } = {
  // Direct fields
  slug: (p) => getSlugLocaleInfo(p.id).localeFreeSlug,
  link: (p) => p.data?.link,
  title: (p) => p.data.title,
  date: (p) => p.data.date,
  cover: (p) => p.data?.cover,
  tags: (p) => p.data?.tags,
  categories: (p) => p.data?.categories,
  draft: (p) => p.data?.draft,
  // Computed fields
  categoryName: (p) => getPostLastCategory(p).name || undefined,
  description: (p) => getPostDescriptionWithSummary(p),
  wordCount: (p) => readingTime(p.body ?? '').words,
  readingTime: (p) => readingTime(p.body ?? '').text,
  postLocale: (p) => getPostLocale(p),
};

/**
 * Select specified fields from BlogPost
 * @example pickPost(post, ['slug', 'link', 'title'])
 * @example pickPost(post, ['slug', 'link', 'title', 'categoryName'])
 */
export function pickPost<K extends keyof PostFieldMap>(post: BlogPost, keys: readonly K[]): Pick<PostFieldMap, K> {
  const result = {} as Pick<PostFieldMap, K>;
  for (const key of keys) {
    result[key] = fieldExtractors[key](post);
  }
  return result;
}

/**
 * Batch select specified fields from BlogPost array
 * @example pickPosts(posts, ['slug', 'link', 'title'])
 * @example pickPosts(posts, ['slug', 'link', 'title', 'categoryName'])
 */
export function pickPosts<K extends keyof PostFieldMap>(posts: BlogPost[], keys: readonly K[]): Pick<PostFieldMap, K>[] {
  return posts.map((post) => pickPost(post, keys));
}

// Convenience aliases - keep backward compatibility

/** Fields required by PostRef */
const POST_REF_KEYS = ['slug', 'link', 'title'] as const;

/** Fields required by PostRefWithCategory */
const POST_REF_WITH_CATEGORY_KEYS = ['slug', 'link', 'title', 'categoryName'] as const;

/** Fields required by PostCardData */
const POST_CARD_DATA_KEYS = [
  'slug',
  'link',
  'title',
  'description',
  'date',
  'cover',
  'tags',
  'categories',
  'draft',
  'wordCount',
  'readingTime',
  'postLocale',
] as const;

/**
 * Convert to minimal reference (3 fields: slug, link, title)
 */
export const toPostRef = (post: BlogPost) => pickPost(post, POST_REF_KEYS);

/**
 * Convert to reference with category (4 fields: slug, link, title, categoryName)
 */
export const toPostRefWithCategory = (post: BlogPost) => pickPost(post, POST_REF_WITH_CATEGORY_KEYS);

/**
 * Convert to card data (fields needed for card display)
 */
export const toPostCardData = (post: BlogPost) => pickPost(post, POST_CARD_DATA_KEYS);

// Batch conversion convenience functions
export const toPostRefs = (posts: BlogPost[]) => pickPosts(posts, POST_REF_KEYS);
export const toPostRefsWithCategory = (posts: BlogPost[]) => pickPosts(posts, POST_REF_WITH_CATEGORY_KEYS);
export const toPostCardDataList = (posts: BlogPost[]) => pickPosts(posts, POST_CARD_DATA_KEYS);
