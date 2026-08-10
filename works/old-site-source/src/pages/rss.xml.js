import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'MODUSENSUS',
    description: 'Exploring ideas, technology and human creativity.',
    site: context.site ?? 'https://modusensus.space',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.subtitle || post.data.excerpt || '',
      pubDate: post.data.date,
      link: `/blog/${post.slug}/`,
      categories: post.data.category
        ? post.data.category.split('/').map((c) => c.trim())
        : [post.data.module],
    })),
    customData: `<language>zh-CN</language>`,
  });
}
