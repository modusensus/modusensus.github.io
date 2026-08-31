import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:       z.string(),
    subtitle:    z.string().optional(),
    date:        z.date(),
    issue:       z.string().optional(),
    category:    z.string().optional(),
    readingTime: z.string().optional(),
    cover:       z.string().optional(),
    excerpt:     z.string().optional(),
    module:      z.enum(['threshold', 'lab', 'archive']).default('archive'),
    // Legacy compat
    tag:         z.string().optional(),
    redirect:    z.string().optional(),
  }),
});

const fragments = defineCollection({
  type: 'content',
  schema: z.object({
    date:  z.date(),
    mood:  z.string().optional(),
    color: z.enum(['pink', 'blue', 'yellow', 'green', 'purple', 'red']).default('pink'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, fragments };
