# MODUSENSUS

> 独立数字工作室 · 关注城市、数据与创造力的交汇处

基于 Astro 构建的个人博客站点。V3 设计：深色涂鸦 Hero（GSAP 彩色拆字动画 + 头像贴纸）× 浅色三栏编辑排版，左侧 mix-blend 反色导航。

🔗 **[modusensus.space](https://modusensus.space)**

---

## 栏目

- **Threshold Notes** — 数字思想杂志
- **Modusensus Lab** — AI 实验、工具与自动化
- **Archive** — 知识档案与持续更新的学习项目
- **Fragments** — 偶尔想到的短想法与未完成观察
- **Elsewhere** — 友链、朋友和灵感来源
- **Guestbook** — 基于 GitHub Discussions 的留言板
- **Colophon** — 关于工作室 + 历代设计存档（V1 / V2 / V3）

## 写作

往 `src/content/blog/` 添加 `.mdx` 文件，push 到 main 即自动发布。frontmatter：

```yaml
title: 文章标题
subtitle: 副标题（可选）
date: 2026-08-29
issue: "04"          # 期号（可选）
category: ESSAY      # 分类（可选）
readingTime: "12"    # 阅读时长分钟（可选）
cover: /blog/images/xxx.png  # 封面（可选）
module: threshold    # threshold | lab | archive
```

### 更新 Fragments

在 `src/content/fragments/` 新建一个 Markdown 文件。只需要日期，也可以添加 `mood` 和 `color`：

```yaml
date: 2026-08-29
mood: late night
color: pink
```

正文写在 frontmatter 后面，push 后会自动出现在 `/fragments`。

### 更新 Elsewhere

在 `src/data/elsewhere.ts` 的 `elsewhereLinks` 数组中添加友链。`kind` 使用 `friends` 或 `reading`。

### 启用 Guestbook

Guestbook 使用 [Giscus](https://giscus.app)，留言保存在 GitHub Discussions，不需要自建数据库：

1. 在 `modusensus/modusensus.github.io` 开启 Discussions。
2. 安装 Giscus GitHub App，并创建 `Guestbook` 分类。
3. 在 [giscus.app](https://giscus.app) 生成 Repository ID 和 Category ID。
4. 把两个 ID 填入 `src/config/giscus.json`，不要填入任何 token 或密码。

在 ID 填好前，`/guestbook` 会显示配置提示，不会加载评论脚本。

## 本地运行

```bash
npm install
npm run dev
```

## 部署

Push 到 main 分支 → GitHub Actions 自动构建并部署到 GitHub Pages（自定义域名 `modusensus.space`）。

## 技术栈

Astro · MDX · GSAP · GitHub Pages · GitHub Actions

---

© MODUSENSUS · Built with Astro
