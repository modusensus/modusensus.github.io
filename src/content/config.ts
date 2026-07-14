import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:   z.string(),
    date:    z.date(),
    tag:     z.enum(['学习成长', '技术折腾', '专业思考', '项目日志']),
    excerpt: z.string().optional(),
  }),
});

export const collections = { blog };
