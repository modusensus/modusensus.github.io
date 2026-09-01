// ── 文章点赞计数接口（Upstash KV / Redis）──
// GET  /api/like?slug=x           → { likes } 读取当前累计数
// POST /api/like { slug, liked }  → 按浏览器 cookie 去重：
//     liked=true  首次点赞 INCR 并种 cookie（同浏览器重复赞不再加）；
//     liked=false 且本浏览器点过赞时 DECR 并清 cookie。
// 未配置 KV 变量（如本地开发）时返回 503，前端退回本地计数。
import { Redis } from '@upstash/redis';

type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string | undefined>;
  body?: { slug?: unknown; liked?: unknown };
};
type Res = {
  status: (code: number) => Res;
  setHeader: (key: string, value: string) => void;
  json: (data: unknown) => void;
};

const kv = Redis.fromEnv();

const SLUG_RE = /^[a-z0-9-]{1,80}$/; // 与文章 slug 命名一致，防 key 注入

function hasLikedCookie(cookie: string | undefined, slug: string): boolean {
  if (!cookie) return false;
  // 按名精确匹配：cookie 头可能只有一个 cookie（无尾分号），不能用 startsWith
  return cookie.split(';').some((c) => {
    const [name, value] = c.trim().split('=', 2);
    return name === `modusensus_like_${slug}` && value === '1';
  });
}

const LIKE_COOKIE_MAX_AGE = 365 * 24 * 3600;

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  const slug = (typeof req.query?.slug === 'string' ? req.query.slug : '') ||
    (typeof req.body?.slug === 'string' ? req.body.slug : '');
  if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'slug required' });

  const key = `stats:like:${slug}`;
  const read = async () => Number((await kv.get<number>(key)) || 0);

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ likes: await read() });
    }

    if (req.method === 'POST') {
      const liked = req.body?.liked === true;
      const already = hasLikedCookie(req.headers?.cookie, slug);
      let likes: number;

      if (liked) {
        if (!already) {
          likes = await kv.incr(key);
          res.setHeader(
            'Set-Cookie',
            `modusensus_like_${slug}=1; Max-Age=${LIKE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`,
          );
        } else {
          likes = await read(); // 本浏览器已点过赞：不再重复累计
        }
      } else {
        if (already) {
          likes = await kv.decr(key);
          if (likes < 0) likes = await kv.set(key, 0); // 防 DECR 溢出负数
          res.setHeader('Set-Cookie', `modusensus_like_${slug}=1; Max-Age=0; Path=/; SameSite=Lax`);
        } else {
          likes = await read(); // 本浏览器没点过赞：不扣减
        }
      }
      return res.status(200).json({ likes: Math.max(0, likes) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch {
    return res.status(503).json({ error: 'likes unavailable' });
  }
}
