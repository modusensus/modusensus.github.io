import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'AnAn · Blog',
    description: '跨考公管 · INTJ · AI 学习系统 · 开源工具',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt || '',
      link: '/blog/' + post.slug,
    })),
  });
}
