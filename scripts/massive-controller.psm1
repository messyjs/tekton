# Massive Controller - Screenshot + Click Pipeline
# This script provides visual feedback for programming Massive

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MC {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

function Get-MassiveWindow {
    $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Massive*" } | Select-Object -First 1
    if (-not $proc) { Write-Host "ERROR: Massive not running!"; return $null }
    [MC]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
    [MC]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 500
    $rect = New-Object MC+RECT
    [MC]::GetWindowRect($proc.MainWindowHandle, [ref]$rect)
    return @{ Proc=$proc; Left=$rect.Left; Top=$rect.Top; Right=$rect.Right; Bottom=$rect.Bottom; Width=($rect.Right-$rect.Left); Height=($rect.Bottom-$rect.Top) }
}

function Take-Screenshot {
    param([string]$Path = "D:\AI Drive\pi-agent\tekton\massive-state.jpg", [int]$MaxWidth = 400)
    $win = Get-MassiveWindow
    if (-not $win) { return }
    
    $bmp = New-Object System.Drawing.Bitmap($win.Width, $win.Height)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($win.Left, $win.Top, 0, 0, $bmp.Size)
    
    # Resize to max width
    $ratio = $MaxWidth / $win.Width
    $newH = [int]($win.Height * $ratio)
    $sm = New-Object System.Drawing.Bitmap($MaxWidth, $newH)
    $g2 = [System.Drawing.Graphics]::FromImage($sm)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
    $g2.DrawImage($bmp, 0, 0, $MaxWidth, $newH)
    
    # Save as JPEG with low quality
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $p = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 25L)
    $sm.Save($Path, $enc, $p)
    
    $size = [Math]::Round((New-Object System.IO.FileInfo($Path)).Length / 1024)
    Write-Host "Screenshot: $Path ($size KB) Window: $($win.Left),$($win.Top) $($win.Width)x$($win.Height)"
    
    $bmp.Dispose(); $sm.Dispose(); $gfx.Dispose(); $g2.Dispose()
    return $win
}

function Click-At {
    param([int]$X, [int]$Y, [int]$Delay=200, [switch]$Right, [switch]$Double)
    $win = Get-MassiveWindow
    if (-not $win) { return }
    
    [MC]::SetCursorPos($X, $Y)
    Start-Sleep -Milliseconds 30
    
    if ($Right) {
        [MC]::mouse_event(0x08, 0, 0, 0, 0)
        Start-Sleep -Milliseconds 20
        [MC]::mouse_event(0x10, 0, 0, 0, 0)
    } elseif ($Double) {
        [MC]::mouse_event(0x02, 0, 0, 0, 0)
        [MC]::mouse_event(0x04, 0, 0, 0, 0)
        Start-Sleep -Milliseconds 30
        [MC]::mouse_event(0x02, 0, 0, 0, 0)
        [MC]::mouse_event(0x04, 0, 0, 0, 0)
    } else {
        [MC]::mouse_event(0x02, 0, 0, 0, 0)
        Start-Sleep -Milliseconds 20
        [MC]::mouse_event(0x04, 0, 0, 0, 0)
    }
    Start-Sleep -Milliseconds $Delay
}

function Drag-Knob {
    param([int]$FromX, [int]$FromY, [int]$ToX, [int]$ToY, [int]$Steps=20)
    $win = Get-MassiveWindow
    if (-not $win) { return }
    
    [MC]::SetCursorPos($FromX, $FromY)
    Start-Sleep -Milliseconds 50
    [MC]::mouse_event(0x02, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 50
    for ($i = 1; $i -le $Steps; $i++) {
        $t = $i / $Steps
        $cx = [int]($FromX + ($ToX - $FromX) * $t)
        $cy = [int]($FromY + ($ToY - $FromY) * $t)
        [MC]::SetCursorPos($cx, $cy)
        Start-Sleep -Milliseconds 10
    }
    [MC]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 200
}

function Send-Keys([string]$Keys, [int]$Delay=100) {
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    Start-Sleep -Milliseconds $Delay
}

function Scroll-At([int]$X, [int]$Y, [int]$Clicks=5) {
    [MC]::SetCursorPos($X, $Y)
    Start-Sleep -Milliseconds 30
    for ($i = 0; $i -lt [Math]::Abs($Clicks); $i++) {
        [MC]::mouse_event(0x0800, 0, 0, $(if ($Clicks -gt 0) { 120 } else { -120 }), 0)
        Start-Sleep -Milliseconds 30
    }
    Start-Sleep -Milliseconds 100
}

# Export functions for use in other scripts
Export-ModuleMember -Function Get-MassiveWindow, Take-Screenshot, Click-At, Drag-Knob, Send-Keys, Scroll-At