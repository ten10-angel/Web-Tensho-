import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const common = z.object({
  date: z.union([z.string(), z.date()]).transform((value) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value
  ),
  published: z.boolean().default(true),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: common.extend({
    title: z.string(),
    type: z.string(),
    summary: z.string(),
    photos: z.array(z.object({ image: z.string(), alt: z.string().optional() })).default([]),
    placeholderStyle: z.string().optional(),
  }),
});

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: common.extend({
    title: z.string().optional().nullable(),
    summary: z.string(),
  }),
});

const essay = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/essay' }),
  schema: common.extend({
    title: z.string(),
    category: z.string().optional(),
    summary: z.string(),
    readingTime: z.string().optional(),
  }),
});

export const collections = { work, journal, essay };
