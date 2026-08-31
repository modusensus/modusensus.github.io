// ── 在线人数心跳接口 ──
// 前端每次进入/切换页面以及每 25 秒上报一次随机会话标识（sid，不含任何个人信息），
// 服务端以「最近 65 秒有心跳的会话数」作为在线人数。数据存 Neon，心跳行 10 分钟自动清理。
// 注意：不能把写入和统计合并进一条带 CTE 的语句——PostgreSQL 数据修改 CTE 与主查询共享
// 快照，主查询看不到本次写入，会把当前访客少算一个（本地实测 beat B 应为 2 却返回 1）。
import { neon } from '@neondatabase/serverless';

type Req = { method?: string; body?: { sid?: unknown } };
type Res = {
  status: (code: number) => Res;
  setHeader: (key: string, value: string) => void;
  json: (data: unknown) => void;
};

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const rawSid = req.body?.sid;
  const sid = typeof rawSid === 'string' ? rawSid.slice(0, 64) : '';
  if (!sid) return res.status(400).json({ error: 'sid required' });

  try {
    // 1) 清理 10 分钟无心跳的旧会话（独立语句，快照语义才正确）
    await sql`DELETE FROM site_online WHERE last_seen < now() - interval '10 minutes'`;
    // 2) 记录/刷新本次心跳
    await sql`INSERT INTO site_online (sid, last_seen) VALUES (${sid}, now())
              ON CONFLICT (sid) DO UPDATE SET last_seen = now()`;
    // 3) 65 秒窗口内的会话数即在线人数
    const rows = await sql`SELECT count(*)::int AS online FROM site_online
                           WHERE last_seen > now() - interval '65 seconds'`;
    return res.status(200).json({ online: rows[0].online });
  } catch {
    return res.status(500).json({ error: 'db unavailable' });
  }
}
