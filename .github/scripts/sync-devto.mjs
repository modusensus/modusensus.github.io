#!/usr/bin/env node
// 同步博客文章到 dev.to。
// 只处理 frontmatter 里声明了 `devto: true`（或对象）的文章，canonical URL 永远指回博客原文。
// 用法：
//   node .github/scripts/sync-devto.mjs [--dry-run] [--all]
//   --dry-run  只打印 payload，不调 API、不写 manifest
//   --all      预览模式：把所有文章当作已声明 devto，且强制 --dry-run
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const POSTS_DIR = path.join(REPO_ROOT, 'src', 'content', 'blog');
const MANIFEST_PATH = path.join(SCRIPT_DIR, 'devto-manifest.json');
const SITE_URL = (process.env.SITE_URL || 'https://modusensus.space').replace(/\/+$/, '');
// 唯一的网络出口：dev.to API。host 硬编码，不接受外部输入拼 URL。
const DEVTO_API = 'https://dev.to/api/articles';

const argv = process.argv.slice(2);
let dryRun = argv.includes('--dry-run');
const previewAll = argv.includes('--all');
if (previewAll) dryRun = true; // --all 只用于本地预览，强制不发布

const API_KEY = process.env.DEVTO_API_KEY || '';
if (!dryRun && !API_KEY) {
  console.error('✗ 缺少 DEVTO_API_KEY（GitHub secret 或本地环境变量）。预览请加 --dry-run。');
  process.exit(1);
}

let matter;
try {
  matter = (await import('gray-matter')).default;
} catch {
  console.error('✗ 缺少依赖：请先执行 npm install --no-save gray-matter');
  process.exit(1);
}

// ---------- URL 校验（SSRF 防护）：仅 http/https，拒绝本地/私有/保留地址 ----------
export function safePublicUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const h = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '' ||
    h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home.arpa') ||
    /^(127|10)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^0\./.test(h) || h.startsWith('::ffff:127.')
  ) return null;
  if (h.includes(':')) { // IPv6 字面量
    if (/^(::1|f[cd][0-9a-f]{2}:|fe80:)/i.test(h)) return null;
  }
  return url;
}

// ---------- 文章收集 ----------
function listPosts(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listPosts(p));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

// MDX 文件头部可能有 JS import/export；只剥离开头的模块语句，正文代码块里的 Python import 不受影响
function stripLeadingModuleSyntax(body) {
  const lines = body.split('\n');
  const re = /^\s*(import\s+[^;]*\bfrom\s*['"][^'"]+['"];?|import\s*['"][^'"]+['"];?|export\s+(default\s+)?(const|let|var|function|class)\b)/;
  let i = 0, skippedBlank = 0, stripped = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { // 只允许连续空行穿插在头部语句之间
      if (stripped.length) { i++; skippedBlank++; continue; }
      break;
    }
    if (re.test(line)) { stripped.push(line); i++; continue; }
    break;
  }
  if (!stripped.length) return { body, jsxLeftovers: [] };
  const rest = lines.slice(i).join('\n');
  return { body: rest, jsxLeftovers: scanJsx(rest) };
}

// 检测正文（代码块外）残留的大写开头 JSX 组件——dev.to 不渲染，只会显示为纯文本
function scanJsx(body) {
  const found = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    for (const m of line.matchAll(/<([A-Z][A-Za-z0-9.]*)[\s/>]/g)) found.push(m[1]);
  }
  return [...new Set(found)];
}

function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`_|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeTags(raw) {
  return [...new Set((raw || [])
    .map(t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean))]
    .slice(0, 4); // dev.to 最多 4 个标签
}

const RASTER = /\.(png|jpe?g|webp|gif|avif)$/i; // dev.to 封面不支持 svg，跳过
function resolveCover(cover) {
  if (!cover) return null;
  const abs = safePublicUrl(cover.startsWith('/') ? SITE_URL + cover : cover);
  if (!abs) return null;
  if (!RASTER.test(abs.pathname)) return null;
  return abs.href;
}

function buildPayload(fm, body, slug) {
  const flag = fm.devto;
  const over = flag && typeof flag === 'object' ? flag : {};
  const cleaned = stripLeadingModuleSyntax(body);
  const finalBody = (over.body || cleaned.body).trim();
  const description = over.description || fm.subtitle || fm.excerpt || toPlainText(finalBody).slice(0, 140);
  const article = {
    title: over.title || fm.title,
    body_markdown: finalBody,
    published: true,
    canonical_url: over.canonical || `${SITE_URL}/blog/${slug}`,
  };
  const tags = sanitizeTags(over.tags ?? fm.tags ?? (fm.tag ? [fm.tag] : []));
  if (tags.length) article.tags = tags;
  const cover = resolveCover(over.cover || fm.cover);
  if (cover) article.main_image = cover;
  return { article, jsxLeftovers: cleaned.jsxLeftovers, description };
}

// ---------- dev.to API ----------
async function devtoRequest(method, url, payload) {
  const res = await fetch(url, {
    method,
    headers: {
      'api-key': API_KEY,
      'content-type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 300) }; }
  return { ok: res.ok, status: res.status, data };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 主流程 ----------
const manifest = fs.existsSync(MANIFEST_PATH)
  ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  : {};
const posts = listPosts(POSTS_DIR);
const results = [];
let changed = false;

for (const filePath of posts.sort()) {
  const relPath = path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: fm, content } = matter(raw);
  if (fm.draft) { results.push([relPath, 'skip', '草稿']); continue; }
  if (!fm.devto && !previewAll) { continue; }
  const slug = path.basename(filePath).replace(/\.mdx?$/, '');
  const { article, jsxLeftovers, description } = buildPayload(fm, content, slug);
  const bodyHash = crypto.createHash('sha256').update(article.body_markdown).digest('hex').slice(0, 16);
  const prev = manifest[relPath];

  if (jsxLeftovers.length) {
    console.log(`⚠ ${relPath}: 含 dev.to 不支持的 JSX 组件（${jsxLeftovers.join(', ')}），建议在 frontmatter 用 devto.body 覆盖正文`);
  }

  if (dryRun) {
    const action = prev ? (prev.bodyHash === bodyHash ? 'unchanged' : 'update') : 'create';
    console.log(`\n== [dry-run] ${relPath} → ${action}`);
    console.log(JSON.stringify({ ...article, body_markdown: article.body_markdown.slice(0, 100) + '…' }, null, 2));
    results.push([relPath, 'dry-run', article.title]);
    continue;
  }

  try {
    if (prev && prev.bodyHash === bodyHash) {
      results.push([relPath, 'skip', '无改动']);
      continue;
    }
    let res;
    if (prev) {
      res = await devtoRequest('PUT', `${DEVTO_API}/${prev.id}`, { article });
    } else {
      res = await devtoRequest('POST', DEVTO_API, { article });
      // dev.to 要求标签必须已存在于站内，否则整体 422；去掉标签重试一次
      if (!res.ok && res.status === 422 && article.tags) {
        console.log(`  ↻ 标签被拒（${article.tags.join(', ')}），去掉标签重试`);
        const { tags, ...rest } = article;
        res = await devtoRequest('POST', DEVTO_API, { article: rest });
      }
    }
    if (!res.ok) {
      results.push([relPath, 'fail', `HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`]);
      console.error(`✗ ${relPath}: HTTP ${res.status}`, JSON.stringify(res.data).slice(0, 300));
      continue;
    }
    manifest[relPath] = {
      id: res.data.id ?? prev?.id,
      slug: res.data.slug ?? prev?.slug,
      bodyHash,
      syncedAt: new Date().toISOString(),
    };
    changed = true;
    results.push([relPath, prev ? 'update' : 'create', `dev.to/${manifest[relPath].slug}`]);
    console.log(`✓ ${relPath} → https://dev.to/modusensus/${manifest[relPath].slug}`);
    await sleep(400);
  } catch (err) {
    results.push([relPath, 'fail', String(err).slice(0, 200)]);
    console.error(`✗ ${relPath}:`, err);
  }
}

if (dryRun) {
  console.log(`\n(dry-run) 共 ${posts.length} 篇文章，未调 API、未写 manifest`);
} else {
  if (changed) fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const rows = results.map(([p, a, n]) => `| ${p} | ${a} | ${n} |`).join('\n');
    fs.appendFileSync(summaryPath, `| 文章 | 动作 | 备注 |\n|---|---|---|\n${rows || '| （无 devto 声明的文章） | - | - |'}\n`);
  }
  const failed = results.filter(r => r[1] === 'fail').length;
  console.log(`\n完成：${results.filter(r => ['create', 'update'].includes(r[1])).length} 篇同步，${failed} 篇失败`);
  if (failed) process.exit(1);
}
