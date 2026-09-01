# 本机状态自动同步

检测 Windows 前台窗口,把"此刻在干嘛"自动推送到博客右下角小部件。

## 运行

```bash
node watch-status.mjs
```

- 每 30 秒检测一次,状态变化才推送(如"在写代码"→"在听音乐")
- 空闲 10 分钟以上自动显示"离开了一下"
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
