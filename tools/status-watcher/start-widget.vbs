' MODUSENSUS status widget - open console in Edge app window (ASCII only)
' Usage: run at startup, or double-click to open the widget window
Set fso = CreateObject("Scripting.FileSystemObject")
Dim edge
If fso.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
  edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists("C:\Program Files\Microsoft\Edge\Application\msedge.exe") Then
  edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
Else
  MsgBox "Edge not found", 16, "Status Widget"
  WScript.Quit
End If
WScript.Sleep 3000 ' wait for watch-status to finish starting
Set sh = CreateObject("WScript.Shell")
sh.Run """" & edge & """ --app=http://127.0.0.1:8787 --window-size=400,620 --user-data-dir=""D:\modusensus.github.io\tools\status-watcher\.edge-widget""", 1, False
