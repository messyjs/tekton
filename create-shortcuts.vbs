Set oWS = CreateObject("WScript.Shell")
sDesktop = oWS.SpecialFolders("Desktop")

' Create PLAY shortcut
Set oLnk = oWS.CreateShortcut(sDesktop & "\TEKTON PLAY.lnk")
oLnk.TargetPath = "D:\AI Drive\pi-agent\tekton\PLAY.cmd"
oLnk.WorkingDirectory = "D:\AI Drive\pi-agent\tekton"
oLnk.Description = "Resume Tekton from checkpoint with services"
oLnk.IconLocation = "D:\AI Drive\pi-agent\tekton\.tekton\checkpoints\pause_20260507_001500.json,0"
oLnk.Save

' Create PAUSE shortcut
Set oLnk2 = oWS.CreateShortcut(sDesktop & "\TEKTON PAUSE.lnk")
oLnk2.TargetPath = "D:\AI Drive\pi-agent\tekton\PAUSE.cmd"
oLnk2.WorkingDirectory = "D:\AI Drive\pi-agent\tekton"
oLnk2.Description = "Save Tekton checkpoint and stop"
oLnk2.Save

WScript.Echo "Shortcuts created on Desktop:"
WScript.Echo "  - TEKTON PLAY.lnk"
WScript.Echo "  - TEKTON PAUSE.lnk"