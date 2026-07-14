# nowornever17's Blog

基于 Astro + GitHub Pages 的个人博客 & 作品集。
Editorial Brutalism 风格，黑白灰 + 橄榄绿配色。

## 本地启动

```bash
npm install
npm run dev
# 访问 http://localhost:4321
```

## 写新文章

在 `src/content/blog/` 新建 `.md` 文件：

```markdown
---
title: 文章标题
date: 2025-07-01
tag: 技术折腾        # 学习成长 / 技术折腾 / 专业思考 / 项目日志
excerpt: 一句话摘要
---

正文内容...
```

## 部署到 GitHub Pages

1. 把这个仓库推送到 GitHub
2. 修改 `astro.config.mjs` 里的 `site` 为你的 GitHub Pages 地址
3. GitHub 仓库 → Settings → Pages → Source 选 **GitHub Actions**
4. 之后每次 push main 分支自动部署 ✓

## 个性化修改

| 要改的内容 | 文件位置 |
|-----------|---------|
| 姓名 / 介绍 | `src/pages/index.astro` & `src/pages/about.astro` |
| 项目列表 | `src/pages/projects.astro` & `src/pages/index.astro` |
| 主色调（橄榄绿） | `src/styles/global.css` → `--olive` |
| GitHub / 邮箱链接 | `src/pages/about.astro` |
| 网站地址 | `astro.config.mjs` → `site` |
