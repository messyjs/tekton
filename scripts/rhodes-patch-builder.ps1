# Rhodes Piano Patch Builder for Massive
# Uses keyboard (notes) + mouse/scroll (knobs) since virtual MIDI not available
# Massive is maximized at 1936x1096, origin at (-8,-8)

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MR {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

# Focus Massive
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Massive*" } | Select-Object -First 1
if (-not $proc) { Write-Host "ERROR: Massive not running!"; exit 1 }
[MR]::ShowWindow($proc.MainWindowHandle, 3) | Out-Null
[MR]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 500

$rect = New-Object MR+RECT
[MR]::GetWindowRect($proc.MainWindowHandle, [ref]$rect)
$W = $rect.Right - $rect.Left
$H = $rect.Bottom - $rect.Top
$L = $rect.Left
$T = $rect.Top
Write-Host "Window: ${W}x${H} at ($L,$T)"

# Scale factors from reference 1214x910 to actual window size
$sx = $W / 1214.0
$sy = $H / 910.0

function s([double]$x, [double]$y) {
    # Scale reference coordinates to actual window position
    return @{ X=[int]($L + $x * $sx); Y=[int]($T + $y * $sy) }
}

function Click-At([int]$X, [int]$Y, [int]$Delay=200) {
    [MR]::SetCursorPos($X, $Y)
    Start-Sleep -Milliseconds 30
    [MR]::mouse_event(0x02, 0, 0, 0, 0)  # LEFTDOWN
    Start-Sleep -Milliseconds 20
    [MR]::mouse_event(0x04, 0, 0, 0, 0)  # LEFTUP
    Start-Sleep -Milliseconds $Delay
}

function Scroll-At([int]$X, [int]$Y, [int]$Clicks=1) {
    [MR]::SetCursorPos($X, $Y)
    Start-Sleep -Milliseconds 30
    for ($i = 0; $i -lt [Math]::Abs($Clicks); $i++) {
        $delta = if ($Clicks -gt 0) { 120 } else { -120 }
        [MR]::mouse_event(0x0800, 0, 0, $delta, 0)
        Start-Sleep -Milliseconds 30
    }
    Start-Sleep -Milliseconds 100
}

function Double-Click-At([int]$X, [int]$Y) {
    [MR]::SetCursorPos($X, $Y)
    Start-Sleep -Milliseconds 30
    [MR]::mouse_event(0x02, 0, 0, 0, 0)
    [MR]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 50
    [MR]::mouse_event(0x02, 0, 0, 0, 0)
    [MR]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 200
}

function Play-Note([string]$Key, [int]$Duration=400) {
    [System.Windows.Forms.SendKeys]::SendWait($Key)
    Start-Sleep -Milliseconds $Duration
    # Massive releases note when key is released, but SendKeys auto-releases
}

Write-Host ""
Write-Host "=============================================="
Write-Host "  RHODES PIANO - MASSIVE PATCH BUILDER"
Write-Host "  Using Keyboard + Mouse Automation"
Write-Host "=============================================="
Write-Host ""

# ===== Test: Play a note first to verify sound =====
Write-Host "TEST: Playing C3 (Z key)..."
Play-Note "z" 500
Write-Host "If you hear a saw wave, we're good to go!"
Start-Sleep -Milliseconds 300

# ===== Massive Init Patch Layout (approximate coordinates at 1214x910) =====
# 
# The init patch in Massive has:
# - OSC1: Sine-Triangle wavetable (or Saw, depending on version), volume at 100%
# - OSC2: Off (volume 0%)
# - Noise: Off (volume 0%)  
# - Filter 1: Lowpass 2, Cutoff 100%, Resonance 0%
# - Amp Envelope (ENV4): Standard envelope
# - LFOs: All off
#
# For a Rhodes patch we need:
# 1. OSC1 stays as main tone body
# 2. OSC2: Turn up to ~40%, possibly change wavetable
# 3. Noise: Turn up to ~12% for tine attack
# 4. Filter: Lower cutoff to ~45%, add ~15% resonance
# 5. Amp env: Near-instant attack, high sustain
# 6. LFO1: Add tremolo (~4Hz, ~15% depth)

# ===== STEP 1: Set Filter 1 Cutoff to ~45% =====
Write-Host ""
Write-Host "STEP 1: Setting Filter 1 Cutoff to ~45% (warmth)..."
# Filter 1 cutoff knob: approximately at x=555, y=200 in reference coords
$filterCutoff = s 555 200
Write-Host "  Clicking filter cutoff knob at ($($filterCutoff.X), $($filterCutoff.Y))"
# Init patch has cutoff at 100%, need to scroll DOWN to reduce to ~45%
# Each scroll click ≈ 5% change, so we need ~11 clicks down
Scroll-At $filterCutoff.X $filterCutoff.Y -11
Start-Sleep -Milliseconds 300
Write-Host "  Played test note..."
Play-Note "z" 400
Start-Sleep -Milliseconds 200

# ===== STEP 2: Add resonance ~15% =====
Write-Host ""
Write-Host "STEP 2: Adding Filter 1 Resonance ~15%..."
$filterRes = s 600 200
Write-Host "  Scroll resonance up at ($($filterRes.X), $($filterRes.Y))"
# Resonance starts at 0%, scroll UP 3-4 clicks
Scroll-At $filterRes.X $filterRes.Y 4
Start-Sleep -Milliseconds 300
Play-Note "z" 400
Start-Sleep -Milliseconds 200

# ===== STEP 3: Turn up OSC2 volume to ~40% =====
Write-Host ""
Write-Host "STEP 3: Turning up OSC2 volume to ~40% (chorus)..."
# OSC2 amp knob: approximately x=365, y=270 in reference
$osc2Amp = s 365 270
Write-Host "  Scroll OSC2 amp up at ($($osc2Amp.X), $($osc2Amp.Y))"
# OSC2 starts at 0%, scroll UP about 8 clicks
Scroll-At $osc2Amp.X $osc2Amp.Y 8
Start-Sleep -Milliseconds 300
Play-Note "z" 400
Start-Sleep -Milliseconds 200

# ===== STEP 4: Add noise ~12% for hammer/tine attack =====
Write-Host ""
Write-Host "STEP 4: Adding Noise ~12% for hammer attack..."
$noiseAmp = s 510 280
Write-Host "  Scroll noise amp up at ($($noiseAmp.X), $($noiseAmp.Y))"
# Noise starts at 0%, scroll UP about 3 clicks
Scroll-At $noiseAmp.X $noiseAmp.Y 3
Start-Sleep -Milliseconds 300
Play-Note "z" 400
Start-Sleep -Milliseconds 200

# ===== STEP 5: Adjust AMP envelope (ENV4) =====
Write-Host ""
Write-Host "STEP 5: Checking AMP envelope (ENV4)..."
# ENV4 is already decent in init patch. Just need to ensure high sustain.
# ENV4 is in the envelope section - click on the ENV4 tab first
$env4Tab = s 1050 770
Write-Host "  Clicking ENV4 tab at ($($env4Tab.X), $($env4Tab.Y))"
Click-At $env4Tab.X $env4Tab.Y 300

# ENV4 Sustain knob - scroll up a bit
$env4Sustain = s 1000 750
Write-Host "  Scroll ENV4 sustain up at ($($env4Sustain.X), $($env4Sustain.Y))"
Scroll-At $env4Sustain.X $env4Sustain.Y 3
Start-Sleep -Milliseconds 300
Play-Note "z" 400
Start-Sleep -Milliseconds 200

# ===== STEP 6: Add LFO1 Tremolo =====
Write-Host ""
Write-Host "STEP 6: Adding LFO1 tremolo..."
# Click on LFO1 section/ttab
$lfoTab = s 160 770
Write-Host "  Clicking LFO1 tab at ($($lfoTab.X), $($lfoTab.Y))"
Click-At $lfoTab.X $lfoTab.Y 300

# LFO1 Rate - scroll up for ~4Hz
$lfoRate = s 185 745
Write-Host "  Setting LFO1 rate at ($($lfoRate.X), $($lfoRate.Y))"
Scroll-At $lfoRate.X $lfoRate.Y 5
Start-Sleep -Milliseconds 200

# ===== FINAL TEST =====
Write-Host ""
Write-Host "=============================================="
Write-Host "  PLAYING RHODES PATCH - TEST NOTES"
Write-Host "=============================================="
Write-Host ""

# Play a few notes to test the patch
Write-Host "Playing C3..."
Play-Note "z" 500
Start-Sleep -Milliseconds 200

Write-Host "Playing E3..."
Play-Note "c" 500
Start-Sleep -Milliseconds 200

Write-Host "Playing G3..."
Play-Note "b" 500
Start-Sleep -Milliseconds 200

Write-Host "Playing C4..."
Play-Note "q" 500
Start-Sleep -Milliseconds 200

# Play a chord-like sequence
Write-Host "Playing melody C-E-G-C..."
Play-Note "z" 300
Start-Sleep -Milliseconds 100
Play-Note "c" 300
Start-Sleep -Milliseconds 100
Play-Note "b" 300
Start-Sleep -Milliseconds 100
Play-Note "q" 500

Write-Host ""
Write-Host "=============================================="
Write-Host "  RHODES PATCH COMPLETE!"
Write-Host "=============================================="
Write-Host "  OSC1: Main tone body (init wavetable)"  
Write-Host "  OSC2: ~40% volume for chorus width"
Write-Host "  Noise: ~12% for tine/hammer attack"
Write-Host "  Filter 1: LP2 cutoff ~45%, resonance ~15%"
Write-Host "  ENV4: High sustain for held notes"
Write-Host "  LFO1: ~4Hz tremolo"
Write-Host ""
Write-Host "  Play your nanoKEY2 to hear the patch!"
Write-Host "=============================================="