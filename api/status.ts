// ── 站长状态接口 ──
// GET：公开读取最新一条状态（右下角状态小部件用）；
// POST：凭 STATUS_KEY 环境变量鉴权（管理页 /status 使用），更新状态。
// 单行表（id=1），表结构由 CREATE TABLE IF NOT EXISTS 幂等创建，无需单独迁移。
import { neon } from '@neondatabase/serverless';

type Req = { method?: string; body?: { key?: unknown; text?: unknown; offline?: unknown } };
type Res = {
  status: (code: number) => Res;
  setHeader: (key: string, value: string) => void;
  json: (data: unknown) => void;
};

const sql = neon(process.env.DATABASE_URL || '');

// 建表（幂等）+ 给旧表补 offline 列（ADD COLUMN IF NOT EXISTS，Postgres 支持）
async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS site_status
            (id int PRIMARY KEY, text text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(),
             offline boolean NOT NULL DEFAULT false)`;
  await sql`ALTER TABLE site_status ADD COLUMN IF NOT EXISTS offline boolean NOT NULL DEFAULT false`;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      await ensureTable();
      const rows = await sql`SELECT text, updated_at, offline FROM site_status WHERE id = 1`;
      const row = rows[0];
      return res.status(200).json(row
        ? { text: row.text, at: row.updated_at, offline: !!row.offline }
        : { text: null, at: null, offline: false });
    } catch {
      return res.status(500).json({ error: 'db unavailable' });
    }
  }

  if (req.method === 'POST') {
    const key = typeof req.body?.key === 'string' ? req.body.key : '';
    const expected = process.env.STATUS_KEY || '';
    if (!expected || key !== expected) return res.status(401).json({ error: 'unauthorized' });

    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 120) : '';
    const hasOffline = typeof req.body?.offline === 'boolean';
    const offline = hasOffline ? req.body.offline : false;
    if (!text && !hasOffline) return res.status(400).json({ error: 'text or offline required' });

    try {
      await ensureTable();
      // 三种更新形态：文字+标记同推 / 仅文字（保持原标记）/ 仅标记（下线时无文案也要让灯立即变灰）
      if (text && hasOffline) {
        await sql`INSERT INTO site_status (id, text, offline, updated_at) VALUES (1, ${text}, ${offline}, now())
                  ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, offline = EXCLUDED.offline, updated_at = now()`;
      } else if (text) {
        await sql`INSERT INTO site_status (id, text, offline, updated_at) VALUES (1, ${text}, false, now())
                  ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, updated_at = now()`;
      } else {
        await sql`INSERT INTO site_status (id, text, offline, updated_at) VALUES (1, '', ${offline}, now())
                  ON CONFLICT (id) DO UPDATE SET offline = EXCLUDED.offline, updated_at = now()`;
      }
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'db unavailable' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
}
