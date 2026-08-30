export type ElsewhereKind = 'friends' | 'reading';

export interface ElsewhereLink {
  name: string;
  url: string;
  description: string;
  kind: ElsewhereKind;
}

/**
 * Add a link here to update the Elsewhere page.
 * Keep descriptions short: one sentence is enough.
 */
export const elsewhereLinks: ElsewhereLink[] = [
  {
    name: "Elainafan's blog",
    url: 'https://www.elainafan.one/',
    description: '痛饮所有踌躇之后？',
    kind: 'friends',
  },
  {
    name: 'Astro',
    url: 'https://astro.build',
    description: 'The web framework behind this small publishing system.',
    kind: 'reading',
  },
  {
    name: 'Giscus',
    url: 'https://giscus.app',
    description: 'A quiet, open-source guestbook powered by GitHub Discussions.',
    kind: 'reading',
  },
  {
    name: 'n8n',
    url: 'https://n8n.io',
    description: '开源工作流自动化平台，把 API 和服务串成自动化流水线。',
    kind: 'reading',
  },
  {
    name: 'Dify',
    url: 'https://dify.ai',
    description: '开源 LLM 应用开发平台，可视化编排 AI 工作流与 Agent。',
    kind: 'reading',
  },
  {
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/zh-CN/',
    description: 'Web 开发权威参考，HTML / CSS / JavaScript 的第一手册。',
    kind: 'reading',
  },
];
