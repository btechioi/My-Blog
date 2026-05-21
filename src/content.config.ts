import { defineCollection } from 'astro:content';
import { parseDateInSiteTimezone, reinterpretUtcAsTimezone } from '@lib/date';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { BlogSchema, BlogSchemaInput } from 'types/blog';

const dateInSiteTimezone = z
  .string()
  .or(z.date())
  .transform((val) => {
    if (val instanceof Date) {
      return reinterpretUtcAsTimezone(val);
    }
    return parseDateInSiteTimezone(val);
  });

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
    date: dateInSiteTimezone,
    updated: dateInSiteTimezone.optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(),
    subtitle: z.string().optional(),
    catalog: z.boolean().optional().default(true),
    categories: z
      .array(z.string())
      .or(z.array(z.array(z.string())))
      .optional(),
    sticky: z.boolean().optional(),
    draft: z.boolean().optional(),
    tocNumbering: z.boolean().optional().default(true),
    excludeFromSummary: z.boolean().optional(),
    math: z.boolean().optional(),
    quiz: z.boolean().optional(),
    password: z.string().optional(),
  }) satisfies z.ZodType<BlogSchema, BlogSchemaInput>,
});

export const collections = {
  blog: blogCollection,
};
