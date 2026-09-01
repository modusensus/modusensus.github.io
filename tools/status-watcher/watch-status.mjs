// ── 本机状态自动同步（Windows）──────────────────────────────
// 每 30s 检测一次前台窗口 + 空闲时间，状态变化时 POST 到博客 /api/status，
// 右下角小部件自动显示"此刻在干嘛"。口令从 .env 读取，不硬编码。
// 用法：node watch-status.mjs    （Ctrl+C 停止）
// 开机自启：见 README.md（任务计划程序）
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

// ── 配置 ──
const ENDPOINT = 'https://www.modusensus.space/api/status';
const POLL_MS = 30_000;        // 检测间隔
const IDLE_MIN = 10;           // 空闲超过多少分钟显示"离开"
const MAP_WITH_APP = false;    // true: "写代码中 · VSCode"；false: "写代码中"
const APPS = [
  { name: '写代码中',      match: [/^code$/i, /cursor/i, /webstorm/i, /pycharm/i] },
  { name: '敲命令行中',    match: [/windows terminal/i, /powershell/i, /cmd\.exe/i, /mintty/i] },
  { name: '聊微信中',      match: [/wechat/i, /微信/i] },
  { name: '听音乐中',      match: [/spotify/i, /cloudmusic/i, /网易云/i, /foobar/i] },
  { name: '打游戏中',      match: [/steam/i, /valorant/i, /league of legends/i, /原神/i, /genshin/i] },
  { name: '网上冲浪中',    match: [/chrome/i, /msedge/i, /firefox/i, /bilibili/i, /youtube/i] },
  { name: '看文档中',      match: [/word\.exe/i, /wps/i, /obsidian/i, /notion/i] },
  { name: '敲代码中',      match: [/visual studio/i, /studio code/i, /vs code/i] },
];
const fallback = (title, proc) => (title && proc ? `用 ${proc}` : '摸鱼中');

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

// ── 状态合成：有歌在播放（不限前台窗口）→ 听音乐中 · 歌曲；否则按前台窗口 ──
async function composeStatus(w) {
  if (!w) return null;
  if (w.idle >= IDLE_MIN * 60) return '离开中';
  const np = await queryNowPlaying();
  if (np.playing && np.title) return np.artist ? `听音乐中 · ${np.title} — ${np.artist}` : `听音乐中 · ${np.title}`;
  const hit = APPS.find((a) =>
    a.match.some((re) => re.test(w.title) || re.test(w.proc)));
  if (!hit) return fallback(w.title, w.proc);
  return MAP_WITH_APP && w.proc ? `${hit.name} · ${w.proc}` : hit.name;
}

// ── 推送到博客接口（仅状态变化时发送）──
let lastSent = '';
async function push(text) {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STATUS_KEY, text }),
    });
    if (r.ok) {
      lastSent = text;
      console.log(new Date().toLocaleTimeString('zh-CN', { hour12: false }), '→', text);
    } else {
      console.error('推送失败:', r.status);
    }
  } catch { /* 断网/接口不可用时静默跳过，下轮重试 */ }
}

console.log('状态同步已启动，Ctrl+C 停止。检测间隔', POLL_MS / 1000, 's');
(async function loop() {
  const w = await queryWindow();
  const text = await composeStatus(w);
  if (text && text !== lastSent) await push(text);
  setTimeout(loop, POLL_MS);
})();
