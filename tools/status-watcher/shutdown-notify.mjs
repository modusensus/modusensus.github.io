// ── 关机前推送"睡觉中" ──
// 由 Windows 任务计划（AtShutdown 触发器）调用；口令读取逻辑与 watch-status 一致。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

function loadKey() {
  if (process.env.STATUS_KEY) return process.env.STATUS_KEY;
  try {
    const line = readFileSync(path.join(here, '.env'), 'utf8')
      .split(/\r?\n/).find((l) => l.trim().startsWith('STATUS_KEY='));
    const v = line?.slice('STATUS_KEY='.length).trim();
    if (v) return v;
  } catch { /* 无 .env 文件 */ }
  return null;
}

(async () => {
  const key = loadKey();
  if (!key) process.exit(1);
  const endpoint = JSON.parse(readFileSync(path.join(here, 'config.json'), 'utf8')).endpoint;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, text: '睡觉中' }),
    });
  } catch { /* 关机网络栈已不可用时静默 */ }
  process.exit(0);
})();
