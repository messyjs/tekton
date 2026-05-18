' Tekton Dashboard Auto-Start (Windows)
' Checks if dashboard is running before starting, avoids duplicate processes
On Error Resume Next

' Kill any stale node processes on port 7700 that aren't responding
Set WshShell = CreateObject("WScript.Shell")

' Check if dashboard is already running on port 7700
Set http = CreateObject("MSXML2.XMLHTTP")
On Error Resume Next
http.Open "GET", "http://127.0.0.1:7700/api/status", False
http.setRequestHeader "Connection", "close"
http.Send
If Err.Number = 0 And http.Status = 200 Then
    ' Dashboard already running, just open browser
    WshShell.Run "http://127.0.0.1:7700", 1, False
    WScript.Quit
End If
On Error GoTo 0

' Start the dashboard server silently
WshShell.Run """C:\Program Files\nodejs\node.exe"" ""D:\AI Drive\pi-agent\tekton\dashboard-enhanced.mjs"" --port 7700", 0, False

' Wait up to 15 seconds for the server to be ready
For i = 1 To 15
    WScript.Sleep 1000
    On Error Resume Next
    Set http2 = CreateObject("MSXML2.XMLHTTP")
    http2.Open "GET", "http://127.0.0.1:7700/api/status", False
    http2.setRequestHeader "Connection", "close"
    http2.Send
    If Err.Number = 0 And http2.Status = 200 Then
        WshShell.Run "http://127.0.0.1:7700", 1, False
        WScript.Quit
    End If
    On Error GoTo 0
Next

' Fallback: open browser anyway after timeout
WshShell.Run "http://127.0.0.1:7700", 1, False
