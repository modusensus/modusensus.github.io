# 本机状态自动同步

检测 Windows 前台窗口,把"此刻在干嘛"自动推送到博客右下角小部件。

## 运行

```bash
node watch-status.mjs
```

- 每 30 秒检测一次,状态变化才推送(如"写代码中"→"听音乐中")
- 有歌在播放时(后台/最小化也算)自动显示"听音乐中 · 歌名 — 歌手",数据来自 Windows 系统媒体控制(SMTC),网易云/QQ音乐/Spotify/浏览器播放都支持
- 空闲 10 分钟以上自动显示"离开中"
- 程序识别规则在 `config.json` 的 `apps` 表里,想改措辞/加程序直接编辑

## 本地控制台(手动切换)

脚本启动时同时开一个本地页面 **<http://127.0.0.1:8787>**(仅本机可访问):

- 一键切换状态(写代码/听歌/离开/睡觉/自定义…),设置后进入**手动模式**,自动检测暂停,不再被窗口覆盖
- 点"恢复自动同步"回到自动检测
- **下线/上线**:下线即停止一切推送(含心跳),博客状态灯约 6 分钟后自动变灰;上线恢复同步,灯变绿。面板顶部呼吸灯实时对应
- 显示最近推送记录、关机监听是否正常

手动模式仍每 4 分钟心跳重推,维持博客状态灯在线。睡前/离开前手动点"睡觉中"比任何自动关机检测都可靠。

手动点"听音乐中"时会抓当前歌名/歌手推出去,之后每 30 秒刷新一次,切歌自动更新(音乐信息与窗口检测无关,不受手动模式影响)。

## 配置

- `config.json`：端点、检测间隔、空闲阈值、程序识别规则表(`apps`)、兜底文案——改行为不用动代码
- `.env`：`STATUS_KEY`(已 gitignore,不会提交)。规则里的正则不写 `i` 标记,默认忽略大小写

规则表是字符串正则,JSON 里转义斜杠:匹配 `cmd.exe` 写 `^cmd\\.exe$`。

## 关机 → 自动显示"睡觉中"

两条通道，互相兜底，但**都不完全可靠**：

1. **watch-status.mjs 内建 WMI 关机监听**（主通道）：PowerShell 轮询
   `ShutdownInProgress`。⚠️ 收到该事件**需要管理员权限**——开机自启的
   `watch-status.vbs` 是普通权限，所以默认情况下这条通道**收不到关机事件**
   （控制台页面会显示"关机监听 掉线"）。以管理员身份启动脚本才生效。
2. **任务计划程序 `ModusensusStatusShutdown`**（AtShutdown 兜底）：跑
   `shutdown-notify.mjs`。关机时网络窗口极短，Node 冷启动 + HTTPS 握手容易来不及
   （上次结果 0xC000026B = 系统关机终止），所以只作备份。

**最可靠的路径是手动**：睡前/离开前打开本地控制台点"睡觉中"。

状态卡片显示灯基于 `updated_at` 时效判定：watch-status 每 4 分钟强制推一次
（"在线心跳"），超过 6 分钟无新推送 → 灯变灰（关机/睡眠/脚本停止都算下线）。

## 桌面小组件

控制台可以做成桌面小组件窗口(无地址栏、独立小窗、任务栏固定):

```bash
# 手动打开
cscript //nologo start-widget.vbs
```

- 用 Edge 应用模式打开 `http://127.0.0.1:8787`,独立 profile(`.edge-widget/`,不影响主 Edge)
- 已放入启动文件夹 `modusensus-status-widget.vbs`,登录自动弹出(在 watcher 之后,含 3 秒延时)
- 换机时重新复制 `start-widget.vbs` 到启动文件夹即可

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
