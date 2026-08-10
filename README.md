# MODUSENSUS

> 独立数字工作室 · 关注城市、数据与创造力的交汇处

基于 Astro 构建的个人数字杂志站点，LinkedIn 三栏布局 × 杂志编辑风（Editorial Brutalism）。

🔗 **[modusensus.space](https://modusensus.space)**

---

## 栏目

- **Threshold Notes** — 数字思想杂志
- **Modusensus Lab** — AI 实验、工具与自动化
- **Archive** — 知识档案与持续更新的学习项目
- **Colophon** — 关于工作室

## 功能特性

- **LinkedIn 式三栏布局**：左侧 Profile 卡片 + 中间文章 Feed + 右侧栏目推荐
- **写文章后台**（`/write`）：密码认证 + Medium 风格 Markdown 编辑器，支持图片上传、导入 MD、直接经 GitHub Contents API 发布触发自动部署
- **Design Archive**：保留站点历史版本（V1 原始站点 / V2 数字杂志版）作为网页设计作品集
- RSS 订阅

## 本地运行

```bash
npm install
npm run dev
```

## 部署

Push 到 main 分支 → GitHub Actions 自动构建并部署到 GitHub Pages（自定义域名 `modusensus.space`）。

## 技术栈

Astro · MDX · marked · GitHub Pages · GitHub Actions

---

© MODUSENSUS · Built with Astro
