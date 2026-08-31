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

export interface RenderListOptions {
  /** 来源链接形式：auto = 非留言板显示「来自文章 ↗」（默认）；slug = 显示文章 slug；none = 不显示 */
  src?: 'auto' | 'slug' | 'none';
}

export function renderRecentList(el: HTMLElement, items: RecentComment[], opts: RenderListOptions = {}): void {
  const srcMode = opts.src ?? 'auto';
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

    // 来源链接
    if (c.path && srcMode !== 'none') {
      const isGuestbook = c.path.replace(/\/$/, '') === '/guestbook';
      const show = srcMode === 'slug' || (srcMode === 'auto' && !isGuestbook);
      if (show) {
        const src = document.createElement('a');
        src.className = 'rc-src';
        src.href = c.path;
        src.textContent = srcMode === 'slug'
          ? `${(c.path.replace(/\/$/, '').split('/').pop() || 'post')} ↗`
          : '来自文章 ↗';
        head.appendChild(src);
      }
    }

    const text = document.createElement('div');
    text.className = 'rc-text';
    text.textContent = commentExcerpt(c.comment || '');

    main.append(head, text);
    row.appendChild(main);
    el.appendChild(row);
  }
}

// ── 便签墙变体：留言板用（与 FRAGMENTS 便签同一套视觉语言） ──
const NOTE_ACCENTS = ['var(--c-pink)', 'var(--c-blue)', 'var(--c-yellow)', 'var(--c-green)', 'var(--c-purple)'];

export function renderNoteWall(el: HTMLElement, items: RecentComment[]): void {
  el.innerHTML = '';
  items.forEach((c, i) => {
    const note = document.createElement('article');
    note.className = 'gb-note';
    note.style.setProperty('--note-accent', NOTE_ACCENTS[i % NOTE_ACCENTS.length]);

    const tape = document.createElement('span');
    tape.className = 'gb-note-tape';
    tape.setAttribute('aria-hidden', 'true');
    note.appendChild(tape);

    const meta = document.createElement('div');
    meta.className = 'gb-note-meta';
    if (c.avatar) {
      const avatar = document.createElement('img');
      avatar.className = 'gb-note-avatar';
      avatar.loading = 'lazy';
      avatar.alt = '';
      avatar.src = c.avatar;
      meta.appendChild(avatar);
    }
    const nick = document.createElement('span');
    nick.className = 'gb-note-nick';
    nick.textContent = c.nick || '匿名';
    const time = document.createElement('span');
    time.className = 'gb-note-time';
    time.textContent = relTime(c.insertedAt ?? c.time);
    meta.append(nick, time);
    note.appendChild(meta);

    const text = document.createElement('div');
    text.className = 'gb-note-text';
    text.textContent = commentExcerpt(c.comment || '', 140);
    note.appendChild(text);

    if (c.path && c.path !== '/guestbook') {
      const src = document.createElement('a');
      src.className = 'gb-note-src';
      src.href = c.path;
      src.textContent = '来自文章 ↗';
      note.appendChild(src);
    }

    el.appendChild(note);
  });
}
