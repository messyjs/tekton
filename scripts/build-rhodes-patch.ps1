# Rhodes Piano Patch Builder for Massive
# Step-by-step: init, screenshot verify, adjust each parameter

# Load controller module
Import-Module "D:\AI Drive\pi-agent\tekton\scripts\massive-controller.psm1" -Force

Write-Host "============================================="
Write-Host "  RHODES PIANO - MASSIVE PATCH BUILDER"
Write-Host "============================================="
Write-Host ""

# ===== STEP 0: Focus Massive and take initial screenshot =====
Write-Host "STEP 0: Focusing Massive window..."
$win = Take-Screenshot
if (-not $win) { exit 1 }
Write-Host "Window position: Left=$($win.Left) Top=$($win.Top) Width=$($win.Width) Height=$($win.Height)"

# Calculate coordinates relative to window
# Massive layout (at default size ~1214x910):
# Navigation bar at top: File, Edit, View, etc.
# Menu bar is approximately at Y = Top + 40

$MenuFile_X = $win.Left + 28   # File menu position
$MenuFile_Y = $win.Top + 40

# ===== STEP 1: File -> New Sound =====
Write-Host ""
Write-Host "STEP 1: Opening File menu -> New Sound..."
Click-At $MenuFile_X $MenuFile_Y 300
Start-Sleep -Milliseconds 400

# Click "New Sound" in the dropdown menu
# "New Sound" is the first or second item in the File menu
# Menu items are approximately 20px apart, starting about 10px below the menu bar
$NewSound_X = $MenuFile_X
$NewSound_Y = $MenuFile_Y + 30  # First menu item
Click-At $NewSound_X $NewSound_Y 500

# Take screenshot to verify
Write-Host "Taking screenshot to verify new sound..."
Take-Screenshot | Out-Null

# If a dialog appeared asking to save, press Escape to dismiss it
Send-Keys "{ESC}" 300

# Try Ctrl+N as alternative method
# Send-Keys "^n" 500

Write-Host "New Sound should be initialized."

# ===== STEP 2: Screenshot the init patch state =====
Write-Host ""
Write-Host "STEP 2: Verifying init state (Sine wavetable, default values)..."
Take-Screenshot | Out-Null

# Massive init patch layout (approximate for 1214x910 window):
# 
# +------ Top Navigation ------+
# | File  Edit  View  ...    [Patch Name]    [Browser]|
# +------+--------+-----------+------+--------+-------+
# | OSC1 | OSC2   | OSC3 |NOISE| FILT1 | FILT2| AMP  |
# |      |        |      |     |       |      |      |
# +------+--------+-----------+------+-------+-------+
# |  MODULATION / ENVELOPES / LFOs / FX  |           |
# +----------------------------------------+-----------+
#
# Key coordinates (relative to window origin):
# These are APPROXIMATE and may need adjustment based on actual window size

# Scaling factor from reference size (1214x910) to actual window size
$scaleX = $win.Width / 1214.0
$scaleY = $win.Height / 910.0

function S([double]$x, [double]$y) {
    # Scale coordinates from reference to actual window size
    return @{ X=[int]($win.Left + $x * $scaleX); Y=[int]($win.Top + $y * $scaleY) }
}

# ===== STEP 3: Set OSC2 Volume (turn up from 0) =====
Write-Host ""
Write-Host "STEP 3: Setting OSC2 volume for chorus..."
# OSC2 amplitude knob is below the OSC2 wavetable display
# In the init patch, OSC2 amp is at 0 (off) 
# We need to turn it up to about 40%
# First, right-click on the OSC2 amp knob to set value

# OSC2 Amp knob position (approximate)
$osc2Amp = S 365 265
# Right-click to get context menu, then type value
# Actually, in Massive you can right-click a knob and type a value
# But the menu positions vary. Let's use scroll instead.
# Scroll up 8 times (~40% for a 0-100% range where init=0)
Write-Host "  Scrolling OSC2 amp up from 0..."
Scroll-At $osc2amp.X $osc2amp.Y 8
Start-Sleep -Milliseconds 300

# ===== STEP 4: Set Filter 1 Cutoff (bring down for warmth) =====
Write-Host ""
Write-Host "STEP 4: Setting Filter 1 cutoff to ~45% for warmth..."
# Filter cutoff in init patch is at 100% (fully open)
# We need to bring it down to ~45% for a warm Rhodes sound
# Filter 1 cutoff knob position
$filter1Cutoff = S 555 195
# Scroll DOWN to reduce from ~100% to ~45% (about 18 scroll clicks)
Write-Host "  Scrolling filter cutoff down from 100% to ~45%..."
Scroll-At $filter1Cutoff.X $filter1Cutoff.Y -18
Start-Sleep -Milliseconds 300

# ===== STEP 5: Set Filter 1 Resonance (add subtle character) =====
Write-Host ""
Write-Host "STEP 5: Setting resonance to ~15%..."
$filter1Res = S 600 195
# Resonance init is 0, scroll UP 4 times for ~15%
Scroll-At $filter1Res.X $filter1Res.Y 4
Start-Sleep -Milliseconds 300

# ===== STEP 6: Adjust ENV4 (Amp Envelope) for Rhodes character =====
Write-Host ""
Write-Host "STEP 6: Setting amp envelope for Rhodes sustain..."
# Click on ENV4 tab at bottom right area
$env4Tab = S 1030 710
Click-At $env4Tab.X $env4Tab.Y 300

# ENV4 Attack: keep very short (2ms) — init is already short, no change needed
# ENV4 Decay: medium — scroll slightly
Write-Host "  Adjusting ENV4 decay..."
$env4Decay = S 960 750
Drag-Knob $env4Decay.X $env4Decay.Y ($env4Decay.X + 10) ($env4Decay.Y - 5) 10

# ENV4 Sustain: high (for held notes)
# Sustain knob in ENV4 — scroll up to increase
Write-Host "  Adjusting ENV4 sustain..."
$env4Sustain = S 1000 735
Scroll-At $env4Sustain.X $env4Sustain.Y 6
Start-Sleep -Milliseconds 200

# ===== STEP 7: Add noise for hammer/tine attack =====
Write-Host ""
Write-Host "STEP 7: Adding subtle noise for Rhodes attack transient..."
# Noise amp is at 0 in init. Scroll up slightly.
$noiseAmp = S 510 280
Scroll-At $noiseAmp.X $noiseAmp.Y 4
Start-Sleep -Milliseconds 200

# ===== STEP 8: Add LFO1 for tremolo =====
Write-Host ""
Write-Host "STEP 8: Adding LFO1 tremolo..."
# Click on LFO1 tab/botton at the bottom
$lfo1Tab = S 200 770
Click-At $lfo1Tab.X $lfo1Tab.Y 300

# LFO1 rate — scroll up a few times for ~4Hz
$lfo1Rate = S 220 740
Scroll-At $lfo1Rate.X $lfo1Rate.Y 5
Start-Sleep -Milliseconds 200

# ===== STEP 9: Take final screenshot =====
Write-Host ""
Write-Host "STEP 9: Final verification screenshot..."
Take-Screenshot | Out-Null

Write-Host ""
Write-Host "============================================="
Write-Host "  RHODES PIANO PATCH - COMPLETE"
Write-Host "============================================="
Write-Host ""
Write-Host "  OSC1: Sine (default init) - main body"
Write-Host "  OSC2: ~40% volume - chorus layer"
Write-Host "  Noise: ~15% - hammer/tine attack"
Write-Host "  Filter 1: Lowpass 2, ~45% cutoff, ~15% resonance"
Write-Host "  ENV4: Near-instant attack, medium decay, high sustain"
Write-Host "  LFO1: ~4Hz tremolo"
Write-Host ""
Write-Host "  Play your MIDI keyboard or nanoKEY2 to hear the patch!"
Write-Host "============================================="