# Step 1: File -> New Sound in Massive
# This must be done FIRST before any parameter changes

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MC1 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

# Find and focus Massive
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Massive*" } | Select-Object -First 1
if (-not $proc) {
    Write-Host "ERROR: Massive not running!"
    exit 1
}
[MC1]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
[MC1]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 800

# Method: Use Alt+F to open File menu, then N for New Sound
# This is more reliable than clicking coordinates
Write-Host "Opening File menu via Alt+F..."
[System.Windows.Forms.SendKeys]::SendWait("%f")
Start-Sleep -Milliseconds 500

Write-Host "Selecting New Sound via N key..."
[System.Windows.Forms.SendKeys]::SendWait("n")
Start-Sleep -Milliseconds 500

# If a "Save changes?" dialog appears, press Escape to dismiss
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 300

# Try a second time in case the first attempt opened a submenu
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 300

Write-Host "New Sound command sent. Massive should now show init patch (single oscillator with Saw wavetable)."