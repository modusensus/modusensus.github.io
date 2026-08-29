# MODUSENSUS 社区栏目设计

## 目标

在不增加首页信息密度和日常维护负担的前提下，为个人博客增加三个独立入口：

- `FRAGMENTS` / 片段：偶尔想到的短想法、未完成的观察和碎碎念。
- `ELSEWHERE` / 远方：友链、朋友的网站、常去的地方和灵感来源。
- `GUESTBOOK` / 留言板：访客使用 GitHub 账号留下公开留言。

现有 Hero、首页 `Recent Posts + Visual Rail` 和文章阅读体验保持不变；新增栏目通过左侧导航进入，不把更多内容塞回首页。

## 信息架构

桌面端左侧固定导航：

```text
MODUSENSUS

THRESHOLD
LAB
ARCHIVE
FRAGMENTS
ELSEWHERE
GUESTBOOK
COLOPHON

VOL.3 / 2026
```

移动端继续使用顶部横向导航，允许横向滚动但隐藏滚动条。

## 栏目实现

### Fragments

- 新建 `src/content/fragments/`，每条碎片使用一个 Markdown 文件。
- frontmatter 只需要 `date`，可选 `mood` 和 `color`；正文就是短文本。
- 新建 `/fragments` 页面，按日期倒序显示。
- 页面使用现有浅色编辑排版：编号、日期、正文、主题色细线；不做卡片堆叠、不做复杂编辑后台。
- 没有碎片时显示明确的空状态，不显示空白页面。

### Elsewhere

- 新建 `src/data/elsewhere.ts`，集中维护友链数据。
- 每个条目包含 `name`、`url`、`description` 和 `kind`。
- 新建 `/elsewhere` 页面，按 `FRIENDS`、`READING` 等类型分组。
- 外链使用 `target="_blank"`、`rel="noopener noreferrer"`，页面不抓取第三方内容。
- 没有条目时显示明确的空状态。

### Guestbook

- 新建 `/guestbook` 页面，正文说明留言规则，下面嵌入 Giscus。
- Giscus 连接 `modusensus/modusensus.github.io` 的 GitHub Discussions。
- 映射方式使用 `pathname`，留言分类使用专门的 `Guestbook` 分类。
- 开启主贴 reactions，评论框放在评论顶部，中文界面，启用 lazy loading。
- Giscus 所需的 repository/category ID 使用明确的配置常量；若 GitHub Discussions 或 Giscus App 尚未启用，页面显示配置提示，不伪装成已可用。
- 不自建匿名留言 API、不把 token 放进前端、不把留言写入仓库文件。

## 视觉系统

- 继续使用 `global.css` 里的 `--paper`、`--ink`、`--muted`、`--rule` 和字体 token。
- 栏目标题沿用 `mono-label`；文章/碎片使用 `ar-item` 风格的轻量分隔线。
- Guestbook 的嵌入容器只负责宽度和上下间距，Giscus iframe 内部主题使用与浅色页面接近的主题。
- 所有新增链接具备可见的 hover、focus-visible 状态；不新增阴影、渐变卡片或常驻动画。

## 安全与维护边界

- 友链 URL 是维护者写入的数据，不渲染远程 HTML。
- 碎片内容来自本地 Markdown/MDX 构建流程，不开放运行时 HTML 注入。
- Giscus 只加载官方 `https://giscus.app/client.js`，不在项目中保存 GitHub 凭据。
- 留言审核通过 GitHub Discussions 完成；仓库需要公开、开启 Discussions 并安装 Giscus App。

## 验收标准

1. 左侧导航和移动端导航都能到达三个新页面，活动状态正确。
2. `npm run build` 成功，现有文章路由和 RSS 不受影响。
3. `/fragments` 能从内容目录读取并按日期排序，空目录也有可理解提示。
4. `/elsewhere` 只渲染数据文件中的友链，外链安全属性完整。
5. `/guestbook` 在配置完整时加载 Giscus；配置未完成时给出明确操作提示。
6. 桌面、移动端无横向溢出，键盘可以访问所有新增主要操作。
