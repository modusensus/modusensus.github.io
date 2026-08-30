import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // 自定义域名（CNAME 已配置，GitHub Pages 绑定 modusensus.space）
  site: 'https://modusensus.space',
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
