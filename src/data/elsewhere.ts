export type ElsewhereKind = 'friends' | 'network';

export interface ElsewhereLink {
  name: string;
  url: string;
  description: string;
  /** 头像图地址（友链卡片展示用，可选） */
  image?: string;
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
    image: 'https://www.elainafan.one/avatars/elainafan.jpg',
    kind: 'friends',
  },
  {
    name: 'Innei',
    url: 'https://innei.in/',
    description: "Innei's personal blog on frontend and full-stack development — TypeScript, React, Next.js, AI engineering, indie hacking, travel and life.",
    image: 'https://avatars.githubusercontent.com/u/41265413?v=5',
    kind: 'friends',
  },
  {
    name: 'Nova Eon',
    url: 'https://eonova.me',
    description: '记录着一个爱捣鼓的博主',
    image: 'https://eonova.me/avatar.jpg',
    kind: 'friends',
  },
  {
    name: 'SuemorのBlog',
    url: 'https://www.suemor.com/',
    description: '在探索的过程中遇见更好的自己',
    image: 'https://y.suemor.com/suemor-avatar.jpeg',
    kind: 'friends',
  },
  {
    name: 'Homulilly',
    url: 'https://homulilly.com',
    description: '圆环之外，仍有未尽之愿。',
    image: 'https://homulilly.com/images/avatar.jpg',
    kind: 'friends',
  },
  {
    name: '博客大平台',
    url: 'https://bo.ke/',
    description: '中文博客聚合与收录平台，独立博客都在这里互相发现。',
    kind: 'network',
  },
  {
    name: 'BlogFinder',
    url: 'https://bf.zzxworld.com/',
    description: '发现优秀的个人博客的聚合平台，收录独立博客与最新文章。',
    kind: 'network',
  },
];
