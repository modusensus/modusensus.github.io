// ── Waline 全站最新留言：recent API 拉取 + 渲染（主页 03 卡片与留言板复用） ──
// 接口：GET {serverURL}/api/comment?type=recent&count=N → { errno, data: [...] }
// 每条含 nick / avatar / comment(HTML) / insertedAt / path 等字段；
// comment 是服务端已净化过的 HTML，展示时只取纯文本摘要，渲染全部走 textContent 防 XSS。

export interface RecentComment {
  nick?: string;
  avatar?: string;
  comment?: string;
  insertedAt?: string;
  time?: string | number;
  path?: string;
}

export async function fetchRecentComments(serverURL: string, count = 5): Promise<RecentComment[]> {
  const base = serverURL.replace(/\/$/, '');
  const r = await fetch(`${base}/api/comment?type=recent&count=${count}&lang=zh-CN`);
  const j = await r.json();
  return Array.isArray(j && j.data) ? (j.data as RecentComment[]) : [];
}

export function commentExcerpt(html: string, max = 64): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function relTime(iso?: string | number): string {
  const t = new Date(iso ?? '').getTime();
  if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(t).toLocaleDateString('zh-CN');
}

export function renderRecentList(el: HTMLElement, items: RecentComment[]): void {
  el.innerHTML = '';
  for (const c of items) {
    const row = document.createElement('div');
    row.className = 'rc-row';

    if (c.avatar) {
      const avatar = document.createElement('img');
      avatar.className = 'rc-avatar';
      avatar.loading = 'lazy';
      avatar.alt = '';
      avatar.src = c.avatar;
      row.appendChild(avatar);
    }

    const main = document.createElement('div');
    main.className = 'rc-main';

    const head = document.createElement('div');
    head.className = 'rc-head';
    const nick = document.createElement('span');
    nick.className = 'rc-nick';
    nick.textContent = c.nick || '匿名';
    const time = document.createElement('span');
    time.className = 'rc-time';
    time.textContent = relTime(c.insertedAt ?? c.time);
    head.append(nick, time);

    // 来源：留言板自身的留言不加链接，文章评论链回原文
    if (c.path && c.path !== '/guestbook') {
      const src = document.createElement('a');
      src.className = 'rc-src';
      src.href = c.path;
      src.textContent = '来自文章 ↗';
      head.appendChild(src);
    }

    const text = document.createElement('div');
    text.className = 'rc-text';
    text.textContent = commentExcerpt(c.comment || '');

    main.append(head, text);
    row.appendChild(main);
    el.appendChild(row);
  }
}
