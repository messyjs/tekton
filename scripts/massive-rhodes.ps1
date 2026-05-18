# Rhodes Piano Patch for Native Instruments Massive
# Automated via PowerShell + Win32 API

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W32M {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

function Click-At([int]$x, [int]$y, [int]$delay=150) {
    [W32M]::SetCursorPos($x, $y)
    Start-Sleep -Milliseconds 30
    [W32M]::mouse_event(0x02, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 20
    [W32M]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $delay
}

function DoubleClick-At([int]$x, [int]$y, [int]$delay=300) {
    [W32M]::SetCursorPos($x, $y)
    Start-Sleep -Milliseconds 30
    [W32M]::mouse_event(0x02, 0, 0, 0, 0)
    [W32M]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 30
    [W32M]::mouse_event(0x02, 0, 0, 0, 0)
    [W32M]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $delay
}

function RightClick-At([int]$x, [int]$y, [int]$delay=300) {
    [W32M]::SetCursorPos($x, $y)
    Start-Sleep -Milliseconds 30
    [W32M]::mouse_event(0x08, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 20
    [W32M]::mouse_event(0x10, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $delay
}

function Drag-Knob([int]$fromX, [int]$fromY, [int]$toX, [int]$toY, [int]$steps=15) {
    [W32M]::SetCursorPos($fromX, $fromY)
    Start-Sleep -Milliseconds 50
    [W32M]::mouse_event(0x02, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 30
    for ($i = 1; $i -le $steps; $i++) {
        $t = $i / $steps
        $cx = [int]($fromX + ($toX - $fromX) * $t)
        $cy = [int]($fromY + ($toY - $fromY) * $t)
        [W32M]::SetCursorPos($cx, $cy)
        Start-Sleep -Milliseconds 10
    }
    [W32M]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 200
}

function Press-Key([string]$key) {
    [System.Windows.Forms.SendKeys]::SendWait($key)
    Start-Sleep -Milliseconds 150
}

# ---- Find and Focus Massive ----
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Massive*" } | Select-Object -First 1
if (-not $proc) {
    Write-Host "ERROR: Massive not running!"
    exit 1
}

[W32M]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
[W32M]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 800

$rect = New-Object W32M+RECT
[W32M]::GetWindowRect($proc.MainWindowHandle, [ref]$rect)
$ox = $rect.Left
$oy = $rect.Top
Write-Host "Massive window at ($ox, $oy)"

# ---- Step 1: New Patch ----
Write-Host "Step 1: New Patch (Ctrl+N)"
# Don't send Ctrl+N because it might open a dialog.
# Instead, use the File menu or just start from the current init state.
# Massive starts with an init patch when you open it.

# ---- Step 2: OSC1 - Select Sine-Square wavetable ----
Write-Host "Step 2: Setting OSC1 wavetable (Sine-Square for Rhodes body)"

# In Massive, the wavetable selector for OSC1 is at the top of the oscillator section.
# Right-click on the wavetable display to open context menu.
# OSC1 wavetable area is approximately at (95, 180) relative to window top-left.

$osc1WavX = $ox + 130
$osc1WavY = $oy + 195
RightClick-At $osc1WavX $osc1WavY 400

# Context menu opens. Navigate to a basic wavetable:
# First item is usually "Sine-Square" or "Sine-Tri"
Press-Key "{DOWN}"
Start-Sleep -Milliseconds 100
Press-Key "~"
Start-Sleep -Milliseconds 300

# ---- Step 3: OSC1 Pitch (slight detune for warmth) ----
Write-Host "Step 3: Slight detune on OSC1"

# OSC1 pitch knob is next to the wavetable display
# Drag the pitch knob slightly left for -3-5 cents detune
# Pitch control: approximately (170, 175)
Drag-Knob ($ox + 170) ($oy + 175) ($ox + 163) ($oy + 175) 5

# ---- Step 4: Enable OSC2 (for chorus) ----
Write-Host "Step 4: Enabling OSC2 (chorus layer)"

# OSC2 is to the right of OSC1. Turn up its amplitude from 0.
# OSC2 amplitude knob: approximately (310, 195)
# Right-click and type value
RightClick-At ($ox + 310) ($oy + 220) 300
Start-Sleep -Milliseconds 200
# Type a moderate volume value
# In Massive, right-clicking a knob opens value entry
# But this depends on exactly where the knob is. Let's use mouse drag.
# Drag OSC2 amplitude from center (0) to ~60% up
Drag-Knob ($ox + 310) ($oy + 220) ($ox + 330) ($oy + 180) 15

# ---- Step 5: Select OSC2 wavetable (Saw for richness) ----
Write-Host "Step 5: OSC2 wavetable"
$osc2WavX = $ox + 280
$osc2WavY = $oy + 195
RightClick-At $osc2WavX $osc2WavY 400
Press-Key "{DOWN}"
Press-Key "{DOWN}"
Press-Key "~"
Start-Sleep -Milliseconds 300

# ---- Step 6: OSC2 Detune ----
Write-Host "Step 6: Detuning OSC2 for chorus"
# Drag OSC2 pitch knob slightly right for +5 cents
Drag-Knob ($ox + 360) ($oy + 175) ($ox + 367) ($oy + 175) 5

# ---- Step 7: Noise Generator (key click for Rhodes) ----
Write-Host "Step 7: Adding noise for key attack click"
# Noise generator in Massive is below OSC3
# Turn up noise slightly for the "tine strike" character
# Noise amp: approximately (480, 280)
Drag-Knob ($ox + 510) ($oy + 270) ($ox + 530) ($oy + 240) 8

# ---- Step 8: Filter 1 - Lowpass 2 (classic Rhodes warmth) ----
Write-Host "Step 8: Setting Filter 1 to Lowpass 2"

# Filter 1 is in the center of Massive's panel
# Filter type selector: approximately (500, 120)
# In init patch, filter is already Lowpass 2 which is perfect for Rhodes

# Set cutoff to about 45% (mellow, not too bright)
# Filter cutoff knob: approximately (540, 175)
# We need to drag it from current position to a softer position
# The default cutoff is usually at about 70%, we want it lower
Drag-Knob ($ox + 540) ($oy + 175) ($ox + 480) ($oy + 210) 15

# Set resonance to about 20% (subtle character, not squelchy)
# Filter resonance knob: approximately (580, 175)
Drag-Knob ($ox + 580) ($oy + 200) ($ox + 590) ($oy + 185) 8

# ---- Step 9: ENV4 (Amp Envelope) - Rhodes sustain ----
Write-Host "Step 9: Setting amp envelope for Rhodes sustain"
# Click ENV4 tab
Click-At ($ox + 950) ($oy + 580) 300

# Drag attack point up (very short, 2-5ms)
# ENV4 attack handle: approximately (870, 520)
Drag-Knob ($ox + 870) ($oy + 540) ($ox + 875) ($oy + 510) 5

# Drag sustain level up (we want sustained Rhodes notes)
# Sustain handle: approximately (1010, 500)
Drag-Knob ($ox + 1010) ($oy + 530) ($ox + 1010) ($oy + 460) 10

# ---- Step 10: ENV1 (Filter Envelope) - bell attack ----
Write-Host "Step 10: Setting filter envelope for bell-like attack"
Click-At ($ox + 850) ($oy + 580) 300

# ENV1 should have fast attack, medium decay to filter
# Attack to max, decay to ~60%
Drag-Knob ($ox + 870) ($oy + 540) ($ox + 880) ($oy + 500) 8

# ---- Step 11: FX - Add some reverb ----
Write-Host "Step 11: Adding subtle reverb"

# FX section: bottom right
# Click on FX tab/button
Click-At ($ox + 1100) ($oy + 620) 300

# Enable first FX slot (Reverb)
RightClick-At ($ox + 1020) ($oy + 650) 300
Press-Key "{DOWN}"
Start-Sleep -Milliseconds 100
Press-Key "~"
Start-Sleep -Milliseconds 200

# Turn up FX mix (reverb amount)
Drag-Knob ($ox + 1080) ($oy + 680) ($ox + 1100) ($oy + 660) 8

# ---- Step 12: LFO1 - Subtle Tremolo ----
Write-Host "Step 12: Adding subtle tremolo (LFO1)"

# Click on LFO1 tab
Click-At ($ox + 160) ($oy + 700) 300

# Set rate to ~4Hz (subtle tremolo typical of Rhodes)
Drag-Knob ($ox + 180) ($oy + 730) ($ox + 220) ($oy + 730) 8

# ---- Step 13: Save as "Rhodes" ----
Write-Host "Step 13: Saving patch as 'Rhodes'"

# Click on the patch name area at top to activate it
Click-At ($ox + 600) ($oy + 25) 300
Start-Sleep -Milliseconds 200

# Select all text and type new name
Press-Key "^a"
Start-Sleep -Milliseconds 100
Press-Key "{DELETE}"
Start-Sleep -Milliseconds 100

# Type the patch name
[System.Windows.Forms.SendKeys]::SendWait("Rhodes")
Start-Sleep -Milliseconds 200
Press-Key "~"
Start-Sleep -Milliseconds 500

# ---- Complete! ----
Write-Host ""
Write-Host "========================================================="
Write-Host "         RHODES PIANO PATCH - NATIVE INSTRUMENTS MASSIVE"
Write-Host "========================================================="
Write-Host ""
Write-Host "  OSC1: Sine-Square (main tone, -3 cents detune)"
Write-Host "  OSC2: Saw/Square (chorus layer, +5 cents detune)"
Write-Host "  Noise: Low (for tine attack click)"
Write-Host "  Filter 1: Lowpass 2 @ 45% cutoff, 20% resonance"
Write-Host "  ENV1: Filter - fast attack, medium decay (bell)"
Write-Host "  ENV4: Amp - fast attack, high sustain (held notes)"
Write-Host "  LFO1: ~4Hz tremolo (subtle amplitude modulation)"
Write-Host "  FX: Reverb (subtle room ambience)"
Write-Host ""
Write-Host "  Play your MIDI keyboard to hear the Rhodes sound!"
Write-Host "========================================================="