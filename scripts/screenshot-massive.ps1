Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W32R {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Massive*" } | Select-Object -First 1
if ($proc) {
    [W32R]::ShowWindow($proc.MainWindowHandle, 3) | Out-Null
    [W32R]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 500

    $r = New-Object W32R+RECT
    [W32R]::GetWindowRect($proc.MainWindowHandle, [ref]$r)
    Write-Host ("Window: L={0} T={1} W={2} H={3}" -f $r.Left, $r.Top, ($r.Right-$r.Left), ($r.Bottom-$r.Top))

    $bmp = New-Object System.Drawing.Bitmap(($r.Right-$r.Left), ($r.Bottom-$r.Top))
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)

    $nw = 640
    $ratio = $nw / $bmp.Width
    $nh = [int]($bmp.Height * $ratio)
    $sm = New-Object System.Drawing.Bitmap($nw, $nh)
    $g2 = [System.Drawing.Graphics]::FromImage($sm)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
    $g2.DrawImage($bmp, 0, 0, $nw, $nh)

    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $p = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 30L)
    $sm.Save("D:\AI Drive\pi-agent\tekton\massive-init.jpg", $enc, $p)

    $bmp.Dispose(); $sm.Dispose(); $gfx.Dispose(); $g2.Dispose()
    Write-Host "screenshot saved"
}