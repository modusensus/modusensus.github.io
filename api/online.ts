// ── 站点统计接口（Upstash KV / Redis）──
// 前端进入页面/切换路由时 POST { sid, type:'view' }：总浏览量 +1 并刷新在线心跳；
// 停留期间每 25 秒 POST { sid, type:'beat' }：只刷新在线心跳。
// 在线人数 = 有序集合 online:actives 里 65 秒内有心跳的会话数（member=sid, score=时间戳）。
// 未配置 KV 变量（如本地开发）时返回 503，前端保持统计隐藏。
import { Redis } from '@upstash/redis';

type Req = { method?: string; body?: { sid?: unknown; type?: unknown } };
type Res = {
  status: (code: number) => Res;
  setHeader: (key: string, value: string) => void;
  json: (data: unknown) => void;
};

const kv = Redis.fromEnv();

const ONLINE_WINDOW_MS = 65_000;

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const rawSid = req.body?.sid;
  const sid = typeof rawSid === 'string' ? rawSid.slice(0, 64) : '';
  const type = req.body?.type === 'view' ? 'view' : 'beat';
  if (!sid) return res.status(400).json({ error: 'sid required' });

  try {
    const now = Date.now();
    // 1) 浏览计数：只有进入页面/切换路由（view）才算一次浏览
    if (type === 'view') await kv.incr('stats:visits');
    // 2) 记录/刷新本次心跳
    await kv.zadd('online:actives', { score: now, member: sid });
    // 3) 清理窗口外旧会话 + 计数（ZREMRANGEBYSCORE + ZCARD，原子且轻量）
    const [online, visits] = await Promise.all([
      kv.zremrangebyscore('online:actives', 0, now - ONLINE_WINDOW_MS).then(() => kv.zcard('online:actives')),
      kv.get<number>('stats:visits'),
    ]);
    return res.status(200).json({ online, visits: Number(visits) || 0 });
  } catch {
    return res.status(503).json({ error: 'stats unavailable' });
  }
}
