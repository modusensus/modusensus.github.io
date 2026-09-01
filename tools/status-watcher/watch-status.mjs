// ── 本机状态自动同步（Windows）──────────────────────────────
// 每 30s 检测一次前台窗口 + 空闲时间，状态变化时 POST 到博客 /api/status，
// 右下角小部件自动显示"此刻在干嘛"。口令从 .env 读取，不硬编码。
// 用法：node watch-status.mjs    （Ctrl+C 停止）
// 开机自启：见 README.md（任务计划程序）
import { execFile, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'node:http';

const here = path.dirname(fileURLToPath(import.meta.url));

// ── 配置：config.json（端点/间隔/规则表），口令单独在 .env，避免密钥进 git ──
const CONFIG = JSON.parse(readFileSync(path.join(here, 'config.json'), 'utf8'));
const ENDPOINT = CONFIG.endpoint;
const POLL_MS = CONFIG.pollMs ?? 30_000;          // 检测间隔
const IDLE_MIN = CONFIG.idleMin ?? 10;            // 空闲超过多少分钟显示"离开"
const MAP_WITH_APP = CONFIG.mapWithApp ?? false;  // true: "写代码中 · VSCode"；false: "写代码中"
const FORCE_PUSH_EVERY = CONFIG.forcePushEvery ?? 8;
const APPS = (CONFIG.apps || []).map((a) => ({
  name: a.name,
  match: a.match.map((re) => new RegExp(re, 'i')),
}));
const fallback = (title, proc) => (title && proc
  ? CONFIG.fallbackWithTitle.replace('{proc}', proc)
  : (CONFIG.fallback || '摸鱼中'));

// ── 口令：环境变量 STATUS_KEY > tools/status-watcher/.env ──
function loadKey() {
  if (process.env.STATUS_KEY) return process.env.STATUS_KEY;
  try {
    const line = readFileSync(path.join(here, '.env'), 'utf8')
      .split(/\r?\n/).find((l) => l.trim().startsWith('STATUS_KEY='));
    const v = line?.slice('STATUS_KEY='.length).trim();
    if (v) return v;
  } catch { /* 无 .env 文件，交给下方提示 */ }
  return null;
}
const STATUS_KEY = loadKey();
if (!STATUS_KEY) {
  console.error('缺少口令：在 tools/status-watcher/.env 写 STATUS_KEY=xxx');
  process.exit(1);
}

// ── 用 PowerShell 一次性取：前台窗口标题 / 进程名 / 空闲秒数 ──
const PS_SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder t, int c);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
[DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LI plii);
public struct LI { public uint cbSize; public uint dwTime; }' -Name W -Namespace N
$h = [N.W]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[N.W]::GetWindowText($h, $sb, 512) | Out-Null
$p = [uint32]0
[N.W]::GetWindowThreadProcessId($h, [ref]$p) | Out-Null
$proc = (Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName
$li = New-Object N.W+LI
$li.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($li)
[N.W]::GetLastInputInfo([ref]$li) | Out-Null
[PSCustomObject]@{ title = $sb.ToString(); proc = $proc; idle = [math]::Round(([Environment]::TickCount - $li.dwTime) / 1000) } | ConvertTo-Json -Compress
`;

function queryWindow() {
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT],
      { windowsHide: true, timeout: 10_000 }, (_err, stdout) => {
        try {
          const j = JSON.parse(stdout);
          resolve({ title: String(j.title || '').trim(), proc: String(j.proc || '').trim(), idle: Number(j.idle) || 0 });
        } catch { resolve(null); } // 查询失败这轮跳过，维持旧状态
      });
  });
}

// ── 用 SMTC（系统媒体控制）取当前歌曲：所有接入系统媒体控制的播放器都能读到 ──
const NP_SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.System, ContentType = WindowsRuntime] | Out-Null
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
try {
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $playing = $null
  foreach ($s in $mgr.GetSessions()) {
    if ($s.GetPlaybackInfo().PlaybackStatus -eq 4) { $playing = $s; break }  # 4 = Playing
  }
  if (-not $playing) { '{"playing":false}'; exit }
  $props = Await ($playing.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  [PSCustomObject]@{ playing = $true; title = $props.Title; artist = $props.Artist } | ConvertTo-Json -Compress
} catch { '{}' }
`;

function queryNowPlaying() {
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', NP_SCRIPT],
      { windowsHide: true, timeout: 10_000 }, (_err, stdout) => {
        try {
          const j = JSON.parse(stdout);
          resolve({ playing: !!j.playing, title: String(j.title || '').trim(), artist: String(j.artist || '').trim() });
        } catch { resolve({ playing: false, title: '', artist: '' }); }
      });
  });
}

// ── 降级通道：网易云主窗口标题 "歌名 - 歌手"（SMTC 读不到时用） ──
function queryCloudTitle() {
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      '[Console]::OutputEncoding = [Text.Encoding]::UTF8; (Get-Process -Name cloudmusic -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle'],
      { windowsHide: true, timeout: 10_000 }, (_err, stdout) => {
        resolve(String(stdout || '').trim());
      });
  });
}
function parseCloudTitle(title) {
  const parts = title.split(' - ').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { title: parts[0], artist: parts[1] };
  if (parts.length === 1) return { title: parts[0], artist: '' };
  return null;
}
const songText = (t, a) => (a ? `听音乐中 · ${t} — ${a}` : `听音乐中 · ${t}`);

// ── 音乐合成：SMTC（所有播放器）→ 网易云窗口标题；与窗口检测无关，自动/手动模式共用 ──
async function composeMusic() {
  const np = await queryNowPlaying();
  if (np.playing && np.title) return songText(np.title, np.artist);
  // SMTC 没读到（如网易云未注册媒体会话）→ 从网易云窗口标题解析。
  // 局限：网易云暂停时标题仍留旧歌，可能短暂误报，实测后再说。
  const ct = await queryCloudTitle();
  const cloud = parseCloudTitle(ct);
  if (cloud) return songText(cloud.title, cloud.artist);
  return null; // 没在放歌
}

// ── 状态合成：SMTC（所有播放器）→ 网易云窗口标题 → 前台窗口 ──
async function composeStatus(w) {
  if (!w) return null;
  if (w.idle >= IDLE_MIN * 60) return '离开中';
  const music = await composeMusic();
  if (music) return music;
  const hit = APPS.find((a) =>
    a.match.some((re) => re.test(w.title) || re.test(w.proc)));
  if (!hit) return fallback(w.title, w.proc);
  return MAP_WITH_APP && w.proc ? `${hit.name} · ${w.proc}` : hit.name;
}

// ── 本地控制台（127.0.0.1:8787）：手动切换优先于自动检测 ──
// 手动设置后进入 manual 锁定，不再被窗口检测覆盖；点"恢复自动同步"回到 auto。
const PANEL_PORT = 8787;
let mode = 'auto';              // 'auto' | 'manual'
let manualText = '';
let manualMusic = false;        // 手动"听音乐中"：持续刷新歌名，不随窗口检测覆盖
let shutdownWatchAlive = true;  // WMI 监听子进程是否存活（面板显示）

// ── 推送到博客接口（仅状态变化时发送）──
let lastSent = '';
const history = []; // 最近推送记录（本地控制台展示）
const now = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });
async function push(text) {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STATUS_KEY, text }),
    });
    if (r.ok) {
      lastSent = text;
      history.unshift({ time: now(), text });
      if (history.length > 20) history.pop();
      console.log(now(), '→', text);
    } else {
      console.error('推送失败:', r.status);
    }
  } catch { /* 断网/接口不可用时静默跳过，下轮重试 */ }
}

// ── 关机监听：WMI 检测 ShutdownInProgress，关机流程一开始就推"睡觉中" ──
// 比 AtShutdown 任务可靠：触发更早，网络栈还没断。AtShutdown 任务保留作兜底。
const SHUTDOWN_WATCH = `
$q = "SELECT * FROM __InstanceModificationEvent WITHIN 2 WHERE TargetInstance ISA 'Win32_OperatingSystem' AND TargetInstance.ShutdownInProgress = TRUE"
Register-WmiEvent -Query $q -SourceIdentifier sw-shutdown
Wait-Event -SourceIdentifier sw-shutdown | Out-Null
Write-Output 'SHUTDOWN'
`;
const watchShutdown = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', SHUTDOWN_WATCH],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
watchShutdown.stdout.on('data', () => {
  console.log(now(), '→', '检测到关机，推送睡觉中');
  push('睡觉中');
});
watchShutdown.on('exit', () => { shutdownWatchAlive = false; }); // WMI 监听进程退出 → 控制台显示掉线

// ── 本地控制台 HTTP 服务：GET / 面板页；GET /api/state 状态；POST /api/set 手动切换；POST /api/resume 恢复自动 ──
const panelHtml = readFileSync(path.join(here, 'panel.html'), 'utf8');
createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const send = (code, body, type = 'application/json') => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };
  if (req.method === 'GET' && url.pathname === '/') return send(200, panelHtml, 'text/html; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return send(200, {
      mode,
      text: history[0]?.text || '',
      lastPushAt: history[0]?.time || null,
      history,
      shutdownWatch: shutdownWatchAlive,
    });
  }
  if (req.method === 'POST' && url.pathname === '/api/set') {
    let body = '';
    for await (const c of req) body += c;
    try {
      const { text } = JSON.parse(body);
      if (!text || text.length > 30) return send(400, { error: '状态文字无效（1-30 字符）' });
      mode = 'manual';
      manualText = text;
      manualMusic = text === '听音乐中';
      if (manualMusic) {
        // 手动听音乐：立即抓当前歌名拼好再推，之后每轮自动刷新
        const music = await composeMusic();
        await push(music || text);
        return send(200, { ok: true, text: music || text });
      }
      await push(text);
      return send(200, { ok: true, text });
    } catch { return send(400, { error: '请求体解析失败' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/resume') {
    mode = 'auto';
    manualText = '';
    manualMusic = false;
    lastSent = ''; // 清空后下一轮立即推送真实窗口状态
    return send(200, { ok: true });
  }
  send(404, { error: 'not found' });
}).listen(PANEL_PORT, '127.0.0.1', () => {
  console.log(`本地控制台：http://127.0.0.1:${PANEL_PORT}（手动切换状态；Ctrl+C 退出）`);
});

console.log('状态同步已启动，Ctrl+C 停止。检测间隔', POLL_MS / 1000, 's');
let forceTick = 0;
(async function loop() {
  if (mode === 'auto') {
    const w = await queryWindow();
    const text = await composeStatus(w);
    // 每 8 轮（4 分钟）强制推一次：既覆盖外部写入的状态（如关机通知"睡觉中"），
    // 也作为"在线心跳"刷新 updated_at，供前端状态灯判定在线/离线
    forceTick++;
    if (text && (forceTick % FORCE_PUSH_EVERY === 0 || text !== lastSent)) await push(text);
  } else if (manualText) {
    // 手动模式：不检测窗口，仅按心跳节奏重推手动状态，维持在线灯。
    // 手动"听音乐中"例外：每轮刷新歌名/歌手，歌变了立即推（音乐与窗口无关）
    forceTick++;
    if (manualMusic) {
      const music = await composeMusic();
      if (music && (forceTick % FORCE_PUSH_EVERY === 0 || music !== lastSent)) await push(music);
    } else if (forceTick % FORCE_PUSH_EVERY === 0 && manualText !== lastSent) {
      await push(manualText);
    }
  }
  setTimeout(loop, POLL_MS);
})();
