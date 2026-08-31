// ── 站长状态接口 ──
// GET：公开读取最新一条状态（右下角状态小部件用）；
// POST：凭 STATUS_KEY 环境变量鉴权（管理页 /status 使用），更新状态。
// 单行表（id=1），表结构由 CREATE TABLE IF NOT EXISTS 幂等创建，无需单独迁移。
import { neon } from '@neondatabase/serverless';

type Req = { method?: string; body?: { key?: unknown; text?: unknown } };
type Res = {
  status: (code: number) => Res;
  setHeader: (key: string, value: string) => void;
  json: (data: unknown) => void;
};

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      await sql`CREATE TABLE IF NOT EXISTS site_status
                (id int PRIMARY KEY, text text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
      const rows = await sql`SELECT text, updated_at FROM site_status WHERE id = 1`;
      const row = rows[0];
      return res.status(200).json(row ? { text: row.text, at: row.updated_at } : { text: null, at: null });
    } catch {
      return res.status(500).json({ error: 'db unavailable' });
    }
  }

  if (req.method === 'POST') {
    const key = typeof req.body?.key === 'string' ? req.body.key : '';
    const expected = process.env.STATUS_KEY || '';
    if (!expected || key !== expected) return res.status(401).json({ error: 'unauthorized' });

    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 120) : '';
    if (!text) return res.status(400).json({ error: 'text required' });

    try {
      await sql`CREATE TABLE IF NOT EXISTS site_status
                (id int PRIMARY KEY, text text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
      await sql`INSERT INTO site_status (id, text, updated_at) VALUES (1, ${text}, now())
                ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, updated_at = now()`;
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'db unavailable' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
}
