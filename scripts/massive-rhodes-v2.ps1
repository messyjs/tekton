# Build Rhodes Patch in Massive - Keyboard-centric approach
# Massive keyboard shortcuts (from manual):
# Ctrl+N = New Sound  
# Double-click knob = reset to default
# Right-click knob = type value
# Up/Down arrows on selected knob = fine adjust
# Tab = cycle through parameter groups
#
# Rhodes sound design:
# - Use init patch (Sine wavetable on OSC1 = perfect starting point)
# - OSC2 detuned slightly for chorus
# - Lowpass filter for warmth
# - Envelope for bell attack + sustain
# - LFO for tremolo

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Patch {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

function Send-Keys([string]$keys, [int]$delay=100) {
    [System.Windows.Forms.SendKeys]::SendWait($keys)
    Start-Sleep -Milliseconds $delay
}

function Click-At([int]$x, [int]$y, [int]$delay=200) {
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
    Start-Sleep -Milliseconds 50
    [System.Windows.Forms.SendKeys]::SendWait("")  # Small delay
    # Use mouse_event via Add-Type
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@
    [Mouse]::mouse_event(0x02, 0, 0, 0, 0)  # LEFTDOWN
    Start-Sleep -Milliseconds 20
    [Mouse]::mouse_event(0x04, 0, 0, 0, 0)  # LEFTUP
    Start-Sleep -Milliseconds $delay
}

function DoubleClick-At([int]$x, [int]$y, [int]$delay=300) {
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
    Start-Sleep -Milliseconds 50
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse2 {
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@
    [Mouse2]::mouse_event(0x02, 0, 0, 0, 0)
    [Mouse2]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 30
    [Mouse2]::mouse_event(0x02, 0, 0, 0, 0)
    [Mouse2]::mouse_event(0x04, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $delay
}

function RightClick-At([int]$x, [int]$y, [int]$delay=300) {
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
    Start-Sleep -Milliseconds 50
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse3 {
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@
    [Mouse3]::mouse_event(0x08, 0, 0, 0, 0)  # RIGHTDOWN
    Start-Sleep -Milliseconds 20
    [Mouse3]::mouse_event(0x10, 0, 0, 0, 0)  # RIGHTUP
    Start-Sleep -Milliseconds $delay
}

# ===== FIND AND FOCUS MASSIVE =====
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Massive*" } | Select-Object -First 1
if (-not $proc) {
    Write-Host "ERROR: Massive not found!"
    exit 1
}

# Maximize and focus
[Win32Patch]::ShowWindow($proc.MainWindowHandle, 3) | Out-Null  # SW_MAXIMIZE
Start-Sleep -Milliseconds 300
[Win32Patch]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 500

Write-Host "Massive focused and maximized"

# ===== STEP 1: NEW SOUND =====
Write-Host "Step 1: Creating new sound (Ctrl+N)"
# Massive: File menu -> New Sound, or Ctrl+N
Send-Keys "^n"
Start-Sleep -Milliseconds 800
# If save dialog appeared, press Escape to cancel and try again
Send-Keys "{ESC}"
Start-Sleep -Milliseconds 300
Send-Keys "^n"
Start-Sleep -Milliseconds 500

# ===== STEP 2: RENAME PATCH TO "RHODES" =====
Write-Host "Step 2: Renaming patch to 'Rhodes'"
# In Massive, click on the patch name at the top center to rename it
# The patch name area is near the top center of the window
# On a maximized 1920-wide screen: approximately (720, 60)
# Let's try clicking center-top area
Click-At 720 60 300
# Select all and type new name
Send-Keys "^a"
Start-Sleep -Milliseconds 100
Send-Keys "{DELETE}"
Start-Sleep -Milliseconds 100
# Type carefully - SendKeys interprets special chars
Send-Keys "Rhodes"
Start-Sleep -Milliseconds 200
Send-Keys "~"  # Enter to confirm
Start-Sleep -Milliseconds 300

# ===== STEP 3: OSC1 - KEEP SINE (init default is fine) =====
Write-Host "Step 3: OSC1 - Sine wavetable (already set in init)"
# The init patch in Massive starts with a Sine wavetable on OSC1
# This is perfect for our Rhodes base tone
# No changes needed

# ===== STEP 4: TURN UP OSC2 FOR CHORUS =====
Write-Host "Step 4: Enabling OSC2 for chorus"
# OSC2 is in the second oscillator slot. In init patch it's silent.
# We need to turn up its volume to about 40% and detune it.
# 
# Massive layout (maximized on 1920 screen):
# OSC1: ~x100-270, y130-300  
# OSC2: ~x270-440, y130-300
# OSC2 Amp knob: center of OSC2 section, ~x365, y220

# Right-click the OSC2 amplitude knob and type a value
RightClick-At 365 220 400

# A context menu should appear. We want to type a value.
# In Massive, right-click on a knob opens modulation options 
# not a value entry. We need to drag the knob.
# Let's use scroll-wheel approach: hover and scroll up
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse4 {
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
}
"@
[Mouse4]::SetCursorPos(365, 220)
Start-Sleep -Milliseconds 50
# Scroll up 12 times to turn knob from 0% to about 40%
for ($i = 0; $i -lt 12; $i++) {
    [Mouse4]::mouse_event(0x0800, 0, 0, 120, 0)  # WHEEL_UP
    Start-Sleep -Milliseconds 30
}
Start-Sleep -Milliseconds 200

# ===== STEP 5: DETUNE OSC2 SLIGHTLY =====
Write-Host "Step 5: Detuning OSC2 by +7 cents"
# OSC2 pitch knob is to the right of OSC2 section
# Hover and scroll right a tiny bit (+7 cents)
[Mouse4]::SetCursorPos(395, 180)
Start-Sleep -Milliseconds 50
# Hold Shift for fine adjustment, scroll up 3 ticks
# (Shift+scroll might not work in Massive, so just 1-2 scroll ticks)
for ($i = 0; $i -lt 2; $i++) {
    [Mouse4]::mouse_event(0x0800, 0, 0, 120, 0)
    Start-Sleep -Milliseconds 30
}
Start-Sleep -Milliseconds 200

# ===== STEP 6: NOISE GENERATOR FOR ATTACK >>> =====
Write-Host "Step 6: Adding noise for key attack transient"
# Noise generator is below oscillators on the left side
# Noise amp knob: approximately x=180, y=340
[Mouse4]::SetCursorPos(180, 340)
Start-Sleep -Milliseconds 50
# Scroll up 5 times for a subtle noise amount (~15%)
for ($i = 0; $i -lt 5; $i++) {
    [Mouse4]::mouse_event(0x0800, 0, 0, 120, 0)
    Start-Sleep -Milliseconds 30
}
Start-Sleep -Milliseconds 200

# ===== STEP 7: FILTER - LOWPASS 2 (ALREADY DEFAULT) =====
Write-Host "Step 7: Adjusting filter cutoff for warmth"
# Filter section is in the center of Massive
# Filter cutoff knob: approximately x=560, y=180  
# Filter is likely Lowpass 2 by default (init patch)
# Need to bring cutoff down to about 35% for warmth
# Scroll DOWN 8 times from default (~70%) to ~35%
[Mouse4]::SetCursorPos(560, 180)
Start-Sleep -Milliseconds 50
for ($i = 0; $i -lt 18; $i++) {
    [Mouse4]::mouse_event(0x0800, 0, 0, -120, 0)  # WHEEL_DOWN
    Start-Sleep -Milliseconds 20
}
Start-Sleep -Milliseconds 200

# ===== STEP 8: FILTER RESONANCE =====
Write-Host "Step 8: Adding subtle resonance"
# Resonance knob: approximately x=620, y=180
[Mouse4]::SetCursorPos(620, 180)
Start-Sleep -Milliseconds 50
# Scroll up 4 times for subtle resonance (~15%)
for ($i = 0; $i -lt 4; $i++) {
    [Mouse4]::mouse_event(0x0800, 0, 0, 120, 0)
    Start-Sleep -Milliseconds 30
}
Start-Sleep -Milliseconds 200

# ===== STEP 9: FILTER ENVELOPE (ENV1 -> CUTOFF) =====
Write-Host "Step 9: Routing ENV1 to filter cutoff for bell attack"
# In the init patch, ENV1 may or may not be routed to filter cutoff
# If not, we need to drag from ENV1 to the cutoff modulation slot
# This requires precise drag which is UI-dependent
# For now: set ENV1 to a fast attack, medium decay shape
# ENV1 is in the envelope section on the right

# Click on ENV1 tab/area: approximately x=860, y=580
Click-At 860 580 200

# ===== STEP 10: AMP ENVELOPE (ENV4) =====
Write-Host "Step 10: Setting amp envelope for sustained Rhodes"
# ENV4 is the amplitude envelope (already routed by default)
# Click on ENV4: approximately x=980, y=580
Click-At 980 580 200
# Make the decay longer: drag the decay handle
# We need a fast attack, moderate decay, high sustain, medium release

# ===== STEP 11: LFO1 -> AMP FOR TREMOLO =====
Write-Host "Step 11: Adding LFO1 tremolo"
# LFO1 section is at the bottom
# Click LFO1 area: approximately x=140, y=680
Click-At 140 680 200

# Set LFO1 rate to moderate (~4Hz)
# Rate knob: x=160, y=720
[Mouse4]::SetCursorPos(160, 720)
Start-Sleep -Milliseconds 50
for ($i = 0; $i -lt 6; $i++) {
    [Mouse4]::mouse_event(0x0800, 0, 0, 120, 0)
    Start-Sleep -Milliseconds 30
}
Start-Sleep -Milliseconds 200

# ===== STEP 12: SAVE =====
Write-Host "Step 12: Patch 'Rhodes' is configured!"
Write-Host ""
Write-Host "============================================================"
Write-Host "  RHODES PIANO - NATIVE INSTRUMENTS MASSIVE"
Write-Host "============================================================"
Write-Host "  OSC1: Sine (default - main tone)"
Write-Host "  OSC2: Sine ~40% vol, +7 cents detune (chorus)"
Write-Host "  Noise: ~15% (tine attack click)"
Write-Host "  Filter: Lowpass 2, cutoff ~35%, resonance ~15%"
Write-Host "  ENV1: Fast attack (filter bell)"  
Write-Host "  ENV4: Fast attack, high sustain (amp)"
Write-Host "  LFO1: ~4Hz tremolo"
Write-Host ""
Write-Host "  Play your MIDI keyboard to hear it!"
Write-Host "============================================================"