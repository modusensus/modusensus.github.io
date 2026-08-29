import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // 改成你的 GitHub 用户名
  site: 'https://modusensus.github.io',
  // 如果仓库名不是 username.github.io，需要设置 base
  // base: '/blog/',
  integrations: [mdx()],
  vite: {
    // giscus 自定义主题 CSS（public/giscus/）会被 giscus.app 跨域 fetch，
    // 需要 CORS 头；GitHub Pages 生产环境自带 ACAO:*，这里补齐本地 dev/preview
    server: { headers: { 'Access-Control-Allow-Origin': '*' } },
    preview: { headers: { 'Access-Control-Allow-Origin': '*' } },
  },
});
