/**
 * Post-related utility functions
 */

import { type CollectionEntry, getCollection } from 'astro:content';

import summaries from '@assets/summaries.json';
import { siteConfig } from '@constants/site-config';
import type { FeaturedSeriesItem } from '@lib/config/types';
import type { BlogPost } from 'types/blog';
import { extractTextFromMarkdown } from '../sanitize';
import { buildCategoryPath } from './categories';
import { filterPostsByLocale, getPostSlug } from './locale';

/** AI summary data type */
type SummariesData = Record<string, { title: string; summary: string }>;

/**
 * Get post description
 * Priority to frontmatter description, falls back to intelligent extraction from Markdown content
 * @param post post object
 * @param maxLength maximum length, default 150 characters
 * @returns post description text
 */
export function getPostDescription(post: BlogPost, maxLength: number = 150): string {
  return post.data.description || extractTextFromMarkdown(post.body ?? '', maxLength);
}

/**
 * Get AI summary for a post
 * @param slug post slug (usually post.data.link or post.slug)
 * @returns AI summary text, returns null if absent
 */
export function getPostSummary(slug: string): string | null {
  const data = summaries as SummariesData;

  // Fast path: exact match (O(1))
  const exactMatch = data[slug]?.summary ?? null;
  if (exactMatch) return exactMatch;

  // Fallback: case-insensitive search for backward compatibility
  const lowerSlug = slug.toLowerCase();
  const keys = Object.keys(data);

  for (const key of keys) {
    if (key.toLowerCase() === lowerSlug) {
      return data[key].summary;
    }
  }

  return null;
}

/**
 * Get post description with AI summary fallback
 * Priority: frontmatter description > AI summary > markdown extraction
 * @param post post object
 * @param maxLength maximum length, default 150 characters
 * @returns post description text
 */
export function getPostDescriptionWithSummary(post: BlogPost, maxLength: number = 150): string {
  return post.data.description || getPostSummary(getPostSlug(post)) || extractTextFromMarkdown(post.body ?? '', maxLength);
}

/**
 * Get all posts sorted by date (newest first)
 * In production, draft posts are filtered out
 * @param locale Optional locale filter — undefined returns all, 'zh' returns default only, 'en' returns en + fallback
 */
export async function getSortedPosts(locale?: string): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => {
    // In production, filter out drafts
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  // Sort by date
  const sortedPosts = posts.sort((a: BlogPost, b: BlogPost) => {
    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
  });

  return filterPostsByLocale(sortedPosts, locale);
}

/**
 * Get posts separated by sticky status
 * @returns Object containing sticky and non-sticky posts, both sorted by date (newest first)
 */
export async function getPostsBySticky(locale?: string): Promise<{
  stickyPosts: CollectionEntry<'blog'>[];
  nonStickyPosts: CollectionEntry<'blog'>[];
}> {
  const posts = await getSortedPosts(locale);

  const stickyPosts: CollectionEntry<'blog'>[] = [];
  const nonStickyPosts: CollectionEntry<'blog'>[] = [];

  for (const post of posts) {
    if (post.data?.sticky) {
      stickyPosts.push(post);
    } else {
      nonStickyPosts.push(post);
    }
  }

  return { stickyPosts, nonStickyPosts };
}

/**
 * Get post count (excluding drafts in production)
 * Uses a lightweight path: getCollection + filter, skipping the sort step.
 */
export async function getPostCount(locale?: string) {
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  return filterPostsByLocale(posts, locale).length;
}

/**
 * Calculate ISO week start and end dates for a given date
 * Week starts on Monday (ISO 8601)
 * @internal
 */
function getISOWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  // ISO week: Monday = 1, Sunday = 0
  // Convert to: Monday = 1, Sunday = 7
  const dayOfWeek = day === 0 ? 7 : day;
  // Get Monday of the week
  const start = new Date(d);
  start.setDate(d.getDate() - (dayOfWeek - 1));
  start.setHours(0, 0, 0, 0);
  // Get Sunday of the week
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get posts from the current week (Monday-Sunday, ISO week)
 * @param locale Optional locale filter
 * @returns Posts from this week sorted by date (newest first)
 */
export async function getThisWeeksPosts(locale?: string): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getSortedPosts(locale);
  const today = new Date();
  const { start, end } = getISOWeekRange(today);

  return posts.filter((post) => {
    const postDate = new Date(post.data.date);
    return postDate >= start && postDate <= end;
  });
}

/**
 * Get posts from the current week, organized by day
 * @param locale Optional locale filter
 * @returns Object with week info and posts grouped by day
 */
export async function getThisWeeksPostsByDay(locale?: string): Promise<{
  weekStart: Date;
  weekEnd: Date;
  postsByDay: Record<string, CollectionEntry<'blog'>[]>;
}> {
  const posts = await getThisWeeksPosts(locale);
  const today = new Date();
  const { start: weekStart, end: weekEnd } = getISOWeekRange(today);

  const postsByDay = {
    Monday: [] as CollectionEntry<'blog'>[],
    Tuesday: [] as CollectionEntry<'blog'>[],
    Wednesday: [] as CollectionEntry<'blog'>[],
    Thursday: [] as CollectionEntry<'blog'>[],
    Friday: [] as CollectionEntry<'blog'>[],
    Saturday: [] as CollectionEntry<'blog'>[],
    Sunday: [] as CollectionEntry<'blog'>[],
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const post of posts) {
    const postDate = new Date(post.data.date);
    const dayName = dayNames[postDate.getDay()];
    postsByDay[dayName as keyof typeof postsByDay].push(post);
  }

  return { weekStart, weekEnd, postsByDay };
}

/**
 * Get all posts under a category
 * @param categoryName category name
 * @returns post list
 */
export async function getPostsByCategory(categoryName: string, locale?: string): Promise<BlogPost[]> {
  const posts = await getSortedPosts(locale);
  return posts.filter((post) => {
    const { categories } = post.data;
    if (!categories?.length) return false;

    const firstCategory = categories[0];
    // Handle two category formats
    if (Array.isArray(firstCategory)) {
      // ['Notes', 'Algorithms']
      return firstCategory.includes(categoryName);
    } else if (typeof firstCategory === 'string') {
      // 'Tools'
      return firstCategory === categoryName;
    }
    return false;
  });
}

/**
 * Get the last (deepest) category of a post
 */
export function getPostLastCategory(post: BlogPost): { link: string; name: string } {
  const { categories } = post.data;
  if (!categories?.length) return { link: '', name: '' };

  const firstCategory = categories[0];
  if (Array.isArray(firstCategory)) {
    if (!firstCategory.length) return { link: '', name: '' };
    return {
      link: buildCategoryPath(firstCategory),
      name: firstCategory[firstCategory.length - 1],
    };
  } else if (typeof firstCategory === 'string') {
    return {
      link: buildCategoryPath(firstCategory),
      name: firstCategory,
    };
  }

  return { link: '', name: '' };
}

/**
 * Fisher-Yates shuffle algorithm
 * Produces uniformly distributed random permutations compared to sort(() => Math.random() - 0.5)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get random posts
 * @param count number of posts
 * @returns random post list
 */
export async function getRandomPosts(count: number = 10, locale?: string): Promise<BlogPost[]> {
  const posts = await getSortedPosts(locale);
  const shuffled = shuffleArray(posts);
  return shuffled.slice(0, Math.min(count, posts.length));
}

/**
 * Get all posts in a post's series (based on deepest category)
 * @param post current post
 * @param locale optional locale filter
 * @returns series post list (sorted by date, newest first)
 */
export async function getSeriesPosts(post: BlogPost, locale?: string): Promise<BlogPost[]> {
  const lastCategory = getPostLastCategory(post);
  if (!lastCategory.name) return [];

  return await getPostsByCategory(lastCategory.name, locale);
}

/**
 * Get previous and next posts in the same series
 * @param currentPost current post
 * @param locale optional locale filter
 * @returns previous and next posts
 */
export async function getAdjacentSeriesPosts(
  currentPost: BlogPost,
  locale?: string,
): Promise<{
  prevPost: BlogPost | null;
  nextPost: BlogPost | null;
}> {
  const seriesPosts = await getSeriesPosts(currentPost, locale);

  if (seriesPosts.length === 0) {
    return { prevPost: null, nextPost: null };
  }

  const currentSlug = getPostSlug(currentPost);
  const currentIndex = seriesPosts.findIndex((post) => getPostSlug(post) === currentSlug);

  if (currentIndex === -1) {
    return { prevPost: null, nextPost: null };
  }

  // Because posts are sorted by date descending (newest first)
  // prevPost is the newer post (index - 1)
  // nextPost is the older post (index + 1)
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;

  return { prevPost, nextPost };
}

/**
 * Check if a post belongs to a specific category
 * @param post post
 * @param categoryName category name
 * @returns whether it belongs to the category
 */
function isPostInCategory(post: BlogPost, categoryName: string): boolean {
  const { categories } = post.data;
  if (!categories?.length) return false;

  const firstCategory = categories[0];
  if (Array.isArray(firstCategory)) {
    return firstCategory.includes(categoryName);
  } else if (typeof firstCategory === 'string') {
    return firstCategory === categoryName;
  }
  return false;
}

// =============================================================================
// Featured Series Functions
// =============================================================================

/**
 * Get all enabled Featured Series
 * @returns list of enabled series
 */
export function getEnabledSeries(): FeaturedSeriesItem[] {
  return siteConfig.featuredSeries.filter((series) => series.enabled !== false);
}

/**
 * Find Featured Series by slug
 * @param slug series slug
 * @returns series config or undefined
 */
export function getSeriesBySlug(slug: string): FeaturedSeriesItem | undefined {
  const normalizedSlug = slug.trim().toLowerCase();
  return siteConfig.featuredSeries.find((series) => series.slug.toLowerCase() === normalizedSlug && series.enabled !== false);
}

/**
 * Get all posts in a Featured Series
 * @param slug series slug
 * @returns post list (sorted by date, newest first)
 */
export async function getPostsBySeriesSlug(slug: string, locale?: string): Promise<BlogPost[]> {
  const series = getSeriesBySlug(slug);
  if (!series) return [];

  return await getPostsByCategory(series.categoryName, locale);
}

/**
 * Get all Featured Series category names
 * @returns list of category names
 */
export function getFeaturedCategoryNames(): string[] {
  return getEnabledSeries().map((series) => series.categoryName);
}

/**
 * Get all non-Featured Series posts (sorted)
 * @returns non-series post list (sorted by date, newest first)
 */
export async function getNonFeaturedPosts(locale?: string): Promise<BlogPost[]> {
  const categoryNames = getFeaturedCategoryNames();
  if (categoryNames.length === 0) {
    return await getSortedPosts(locale);
  }

  const allPosts = await getSortedPosts(locale);
  return allPosts.filter((post) => !categoryNames.some((catName) => isPostInCategory(post, catName)));
}

/**
 * Get non-Featured Series posts grouped by sticky status
 * @returns sticky posts and non-sticky regular posts (mutually exclusive, non-overlapping)
 */
export async function getNonFeaturedPostsBySticky(locale?: string): Promise<{
  stickyPosts: BlogPost[];
  regularPosts: BlogPost[];
}> {
  const nonFeaturedPosts = await getNonFeaturedPosts(locale);

  const stickyPosts: BlogPost[] = [];
  const regularPosts: BlogPost[] = [];

  for (const post of nonFeaturedPosts) {
    if (post.data?.sticky) {
      stickyPosts.push(post);
    } else {
      regularPosts.push(post);
    }
  }

  return { stickyPosts, regularPosts };
}

/**
 * Get latest posts for all highlightOnHome=true series
 * @returns latest post list (one per series)
 */
export async function getHomeHighlightedPosts(locale?: string): Promise<BlogPost[]> {
  const highlightedSeries = getEnabledSeries().filter((series) => series.highlightOnHome !== false);

  const posts: BlogPost[] = [];
  for (const series of highlightedSeries) {
    const seriesPosts = await getPostsByCategory(series.categoryName, locale);
    if (seriesPosts[0]) {
      posts.push(seriesPosts[0]);
    }
  }

  return posts;
}

/**
 * Optimized homepage data fetching - single pass for all needed data
 * @returns object containing highlighted, sticky, and regular posts
 */
export async function getHomePagePosts(locale?: string): Promise<{
  highlightedPosts: BlogPost[];
  stickyPosts: BlogPost[];
  regularPosts: BlogPost[];
}> {
  const allPosts = await getSortedPosts(locale);
  const highlightedSeries = getEnabledSeries().filter((series) => series.highlightOnHome !== false);
  const categoryNames = getFeaturedCategoryNames();

  // Track latest post for each highlighted series
  const seriesLatestMap = new Map<string, BlogPost>();

  const stickyPosts: BlogPost[] = [];
  const regularPosts: BlogPost[] = [];

  // Single pass through all posts
  for (const post of allPosts) {
    // Check if it belongs to any featured series
    const isFeatured = categoryNames.some((catName) => isPostInCategory(post, catName));

    if (isFeatured) {
      // Check if it belongs to a highlighted series and record latest post
      for (const series of highlightedSeries) {
        if (isPostInCategory(post, series.categoryName)) {
          if (!seriesLatestMap.has(series.categoryName)) {
            seriesLatestMap.set(series.categoryName, post);
          }
          break;
        }
      }
      // Skip all featured series posts, don't add to regular list
      continue;
    }

    if (post.data?.sticky) {
      stickyPosts.push(post);
    } else {
      regularPosts.push(post);
    }
  }

  // Extract highlighted posts (preserving series definition order)
  const highlightedPosts: BlogPost[] = [];
  for (const series of highlightedSeries) {
    const post = seriesLatestMap.get(series.categoryName);
    if (post) {
      highlightedPosts.push(post);
    }
  }

  return { highlightedPosts, stickyPosts, regularPosts };
}

// =============================================================================
// Deprecated Functions (for backwards compatibility)
// =============================================================================

/**
 * @deprecated Use getPostsBySeriesSlug('weekly') instead
 */
export async function getWeeklyPosts(): Promise<BlogPost[]> {
  return await getPostsBySeriesSlug('weekly');
}

/**
 * @deprecated Use getHomeHighlightedPosts() instead
 */
export async function getLatestWeeklyPost(): Promise<BlogPost | null> {
  const posts = await getPostsBySeriesSlug('weekly');
  return posts[0] ?? null;
}

/**
 * @deprecated Use getNonFeaturedPosts() instead
 */
export async function getNonWeeklyPosts(): Promise<BlogPost[]> {
  return await getNonFeaturedPosts();
}

/**
 * @deprecated Use getNonFeaturedPostsBySticky() instead
 */
export async function getNonWeeklyPostsBySticky(): Promise<{
  stickyPosts: BlogPost[];
  regularPosts: BlogPost[];
}> {
  return await getNonFeaturedPostsBySticky();
}
