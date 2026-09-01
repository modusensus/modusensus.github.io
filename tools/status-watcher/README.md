# 本机状态自动同步

检测 Windows 前台窗口,把"此刻在干嘛"自动推送到博客右下角小部件。

## 运行

```bash
node watch-status.mjs
```

- 每 30 秒检测一次,状态变化才推送(如"写代码中"→"听音乐中")
- 有歌在播放时(后台/最小化也算)自动显示"听音乐中 · 歌名 — 歌手",数据来自 Windows 系统媒体控制(SMTC),网易云/QQ音乐/Spotify/浏览器播放都支持
- 空闲 10 分钟以上自动显示"离开中"
- 程序识别规则在脚本顶部 `APPS` 表里,想改措辞/加程序直接编辑

## 口令

`STATUS_KEY` 在 `.env`(已 gitignore,不会提交)。

## 开机自启

已配置:启动文件夹有 `modusensus-status-watcher.vbs`(隐藏窗口,登录即运行)。
重装/换机时重新放一份到:

```
Win+R → shell:startup
```

vbs 内容(注意只能用 ASCII,中文注释会导致 wscript 解析失败):

```vbscript
CreateObject("Wscript.Shell").Run """D:\New Folder\node.exe"" ""D:\modusensus.github.io\tools\status-watcher\watch-status.mjs""", 0, False
```
