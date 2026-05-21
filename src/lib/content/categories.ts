/**
 * Category-related utility functions
 */

import { getCollection } from 'astro:content';
import { categoryMap } from '@constants/category';
import type { BlogPost } from 'types/blog';
import { getContentCategoryName, getContentFeaturedCategoryField, getContentSeriesField } from '@/i18n/content';
import type { Locale } from '@/i18n/types';
import { encodeSlug } from '../route';
import { filterPostsByLocale } from './locale';
import type { Category, CategoryListResult } from './types';

/**
 * Get hierarchical category list with counts (excluding drafts in production)
 */
export async function getCategoryList(locale?: string): Promise<CategoryListResult> {
  const rawPosts = await getCollection('blog', ({ data }) => {
    // In production, filter out drafts
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  const allBlogPosts = filterPostsByLocale(rawPosts as BlogPost[], locale);
  const countMap: { [key: string]: number } = {}; // TODO: needs optimization - should use category path as key instead of name. For example, Data Structures is both a root category and Notes-Backend-Data Structures.
  const resCategories: Category[] = [];

  // Count direct posts for each category
  for (let i = 0; i < allBlogPosts.length; ++i) {
    const post = allBlogPosts[i];
    const { catalog, categories } = post.data;
    if (!catalog || !categories?.length) {
      continue;
    }

    const firstCategory = categories[0];
    if (Array.isArray(firstCategory)) {
      // categories[0] = ['Notes', 'Algorithms']
      if (!firstCategory.length) continue;

      for (let j = 0; j < firstCategory.length; ++j) {
        const name = firstCategory[j];
        countMap[name] = (countMap[name] || 0) + 1;
        if (j === 0) {
          addCategoryRecursively(resCategories, [], name);
        } else {
          const parentNames = firstCategory.slice(0, j);
          addCategoryRecursively(resCategories, parentNames, name);
        }
      }
    } else if (typeof firstCategory === 'string') {
      // categories[0] = 'Tools'
      countMap[firstCategory] = (countMap[firstCategory] || 0) + 1;
      addCategoryRecursively(resCategories, [], firstCategory);
    }
  }

  return { categories: resCategories, countMap };
}

/**
 * Recursively add subcategories (has side effects). E.g., ['Cat1', 'Cat2', 'Cat3'] creates first-level 'Cat1', second-level 'Cat2', third-level 'Cat3'
 * @param rootCategories root categories
 * @param parentNames parent category names ['Cat1', 'Cat2']
 * @param name subcategory name 'Cat3'
 */
export function addCategoryRecursively(rootCategories: Category[], parentNames: string[], name: string) {
  if (parentNames.length === 0) {
    const index = rootCategories.findIndex((c) => c.name === name); // If the category already exists, return directly
    if (index === -1) rootCategories.push({ name });
    return;
  } else {
    const rootParentName = parentNames[0];
    const index = rootCategories.findIndex((c) => c.name === rootParentName);
    if (index === -1) {
      // If parent category doesn't exist, create it
      const rootParentCategory = { name: rootParentName, children: [] };
      rootCategories.push(rootParentCategory);
      addCategoryRecursively(rootParentCategory.children, parentNames.slice(1), name);
    } else {
      // If parent category exists, find it
      const rootParentCategory = rootCategories[index];
      if (!rootParentCategory?.children) rootParentCategory.children = [];
      addCategoryRecursively(rootParentCategory.children, parentNames.slice(1), name);
    }
  }
}

/**
 * Get category full link
 * @param categories categories
 * @param parentLink parent category link
 * @returns category link
 */
export function getCategoryLinks(categories?: Category[], parentLink?: string): string[] {
  if (!categories?.length) return [];
  const res: string[] = [];
  categories.forEach((category: Category) => {
    const link = encodeSlug(categoryMap[category.name]);
    const fullLink = parentLink ? `${parentLink}/${link}` : link;
    res.push(fullLink);
    if (category?.children?.length) {
      const children = getCategoryLinks(category?.children, fullLink);
      res.push(...children);
    }
  });
  return res;
}

/**
 * Get category name by link
 * @param link categories/xxx/front-end
 * @returns category name (e.g., 'Frontend')
 */
export function getCategoryNameByLink(link: string): string {
  if (!link) return '';

  // Remove leading/trailing slashes and split
  const cleanLink = link.replace(/^\/+|\/+$/g, '');
  if (!cleanLink) return '';

  const segments = cleanLink.split('/').filter(Boolean); // Filter out empty segments
  if (segments.length === 0) return '';

  const lastSegment = decodeURIComponent(segments[segments.length - 1]);
  const res = Object.keys(categoryMap).find((key) => categoryMap[key] === lastSegment) ?? '';
  return res;
}

/**
 * Get category by link
 */
export function getCategoryByLink(categories: Category[], link?: string): Category | null {
  const name = getCategoryNameByLink(link ?? '');
  if (!name || !categories?.length) return null;
  for (let i = 0; i < categories.length; ++i) {
    const category = categories[i];
    if (category.name === name) {
      return category;
    }
    if (category?.children?.length) {
      const res = getCategoryByLink(category.children, link);
      if (res) return res;
    }
  }
  return null;
}

/**
 * Get parent category (recursive search)
 */
export function getParentCategory(category: Category | null, categories: Category[]): Category | null {
  if (!categories?.length || !category) return null;

  for (const c of categories) {
    if (!c.children?.length) continue;

    // Check current level directly
    if (c.children.some((child) => child.name === category.name)) {
      return c;
    }

    // Recursively check subcategories
    for (const child of c.children) {
      if (child.children?.length) {
        const result = getParentCategory(category, [child]);
        if (result) return result;
      }
    }
  }
  return null;
}

/**
 * Build category path from category names
 * @param categoryNames Array of category names or single category name
 * @returns Category path like "/categories/note/front-end"
 */
export function buildCategoryPath(categoryNames: string | string[]): string {
  if (!categoryNames) return '';

  const names = Array.isArray(categoryNames) ? categoryNames : [categoryNames];
  if (names.length === 0) return '';

  const slugs = names.map((name) => encodeSlug(categoryMap[name]));
  return `/categories/${slugs.join('/')}`;
}

/**
 * Unify ['Cat1', 'Cat2'] and 'Cat' format
 */
export function getCategoryArr(categories?: string[] | string) {
  if (!categories) return [];
  if (Array.isArray(categories) && categories.length) {
    return categories as string[];
  } else return [categories as string];
}

/**
 * Translate a category name based on locale.
 * Looks up the YAML content config (config/i18n-content.yaml), falls back to original name.
 */
export function translateCategoryName(name: string, locale: Locale): string {
  const slug = categoryMap[name];
  if (!slug) return name;
  return getContentCategoryName(locale, slug) ?? name;
}

/**
 * Translate a featured series field (label, fullName, etc.) based on locale.
 * Looks up the YAML content config, falls back to the raw YAML value from site config.
 */
export function translateSeriesField(slug: string, field: string, fallback: string | undefined, locale: Locale): string {
  if (!fallback) return '';
  return getContentSeriesField(locale, slug, field) ?? fallback;
}

/**
 * Translate a featured category field (label, description) based on locale.
 *
 * The `link` parameter matches the `link` field in featuredCategories config
 * (e.g. 'life', 'note/front-end').
 */
export function translateFeaturedCategoryField(
  link: string,
  field: string,
  fallback: string | undefined,
  locale: Locale,
): string {
  if (!fallback) return '';
  return getContentFeaturedCategoryField(locale, link, field) ?? fallback;
}
