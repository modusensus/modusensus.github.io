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

## 配置

- `config.json`：端点、检测间隔、空闲阈值、程序识别规则表(`apps`)、兜底文案——改行为不用动代码
- `.env`：`STATUS_KEY`(已 gitignore,不会提交)。规则里的正则不写 `i` 标记,默认忽略大小写

规则表是字符串正则,JSON 里转义斜杠:匹配 `cmd.exe` 写 `^cmd\\.exe$`。

## 关机 → 自动显示"睡觉中"

两条通道，互相兜底：

1. **watch-status.mjs 内建 WMI 关机监听**（主通道）：PowerShell 每 2 秒轮询
   `ShutdownInProgress`，关机流程一开始就推送"睡觉中"。此时网络栈还没断，比任务计划可靠。
2. **任务计划程序 `ModusensusStatusShutdown`**（AtShutdown 兜底）：跑
   `shutdown-notify.mjs`。关机时网络窗口极短，Node 冷启动 + HTTPS 握手容易来不及
   （上次结果 0xC000026B = 系统关机终止），所以只作备份。

状态卡片显示灯基于 `updated_at` 时效判定：watch-status 每 4 分钟强制推一次
（"在线心跳"），超过 6 分钟无新推送 → 灯变灰（关机/睡眠/脚本停止都算下线）。

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
