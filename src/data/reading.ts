export interface ReadingLink {
  name: string;
  url: string;
  description: string;
}

/**
 * READING 组数据：显示在 Archive 页底部。
 * Keep descriptions short: one sentence is enough.
 */
export const readingLinks: ReadingLink[] = [
  {
    name: 'Astro',
    url: 'https://astro.build',
    description: 'The web framework behind this small publishing system.',
  },
  {
    name: 'Giscus',
    url: 'https://giscus.app',
    description: 'A quiet, open-source guestbook powered by GitHub Discussions.',
  },
  {
    name: 'Cloudflare',
    url: 'https://www.cloudflare.com/',
    description: '本站的 DNS 与品牌邮箱都托管在这里，Email Routing 免费转发 hi@ / work@。',
  },
  {
    name: 'n8n',
    url: 'https://n8n.io',
    description: '开源工作流自动化平台，把 API 和服务串成自动化流水线。',
  },
  {
    name: 'Dify',
    url: 'https://dify.ai',
    description: '开源 LLM 应用开发平台，可视化编排 AI 工作流与 Agent。',
  },
  {
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/zh-CN/',
    description: 'Web 开发权威参考，HTML / CSS / JavaScript 的第一手册。',
  },
];
