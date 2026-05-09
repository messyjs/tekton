# Tekton FL Studio Bridge — Troubleshooting Guide

## The Core Problem

FL Studio finds our script (it appears in the MIDI Settings controller dropdown) but
**never calls `OnInit()`**. Even a minimal 6-line test script with only `OnInit()` writing
a file does NOT get called. This means the issue is **100% in FL Studio's MIDI Settings
configuration**, not in our Python code.

---

## Diagnosis Results

| Symptom | Log File | Meaning |
|---------|----------|---------|
| No log file created at all | `tekton_canary_log.txt` missing | FL Studio never imports the script — **port is not enabled** or **controller not activated** |
| Log shows `MODULE IMPORTED` but not `OnInit() CALLED` | `tekton_canary_log.txt` has import line only | Script is imported but not activated — **port not toggled ON** |
| Log shows `OnInit() CALLED` | `tekton_canary_log.txt` has both lines | ✅ Script is working! TCP server should be running |
| Log shows `FL API NOT available` | `tekton_canary_log.txt` | You're testing outside FL Studio (not an error, just don't do that) |

---

## Step-By-Step Fix

### Step 1: Close and Reopen FL Studio

FL Studio only scans controller scripts on startup. After installing or changing scripts,
you **must** fully close and reopen FL Studio.

### Step 2: Open MIDI Settings

`OPTIONS → MIDI Settings` (or press `Ctrl+Alt+M`)

### Step 3: Understand the MIDI Settings Layout

The MIDI Settings dialog has TWO important sections:

1. **Input section (top)** — Lists all MIDI input devices (like "Maschine Plus Virtual")
2. **Controller type dropdown** — Below, shows available controller scripts

The KEY relationship: When you select a controller script that has `# receiveFrom=SomeDevice`,
FL Studio links that controller to the MIDI input named "SomeDevice".

### Step 4: Enable the Port Number (MOST LIKELY FIX)

For each MIDI input row, there is a **port number** on the left side. This number is
CLICKABLE — it toggles between:

- **Gray/dim** = Port is DISABLED (script will NOT initialize) ← THIS IS YOUR PROBLEM
- **Highlighted/colored** = Port is ENABLED (script WILL initialize)

**Click the port number next to the MIDI input device until it highlights/changes color.**

### Step 5: Try Different `receiveFrom` Values

The old script had `# receiveFrom=Maschine Plus Virtual`. This means FL Studio only
activates the script when a MIDI input named EXACTLY "Maschine Plus Virtual" is
connected and its port is enabled.

The updated scripts use **self-referencing** `# receiveFrom=` names:
- Bridge: `# receiveFrom=Tekton FL Studio Bridge` (matches `# name=`)
- Canary: `# receiveFrom=Tekton Canary` (matches `# name=`)

This is the pattern used by FL Studio's own factory scripts (like "Forward CCs to current
plugin Port 10"). It creates a virtual loopback that doesn't depend on external hardware.

**If self-referencing doesn't work**, try these alternatives:

```python
# Option A: No receiveFrom line at all (accepts all input)
# (just remove the # receiveFrom= line entirely)

# Option B: Explicit None
# receiveFrom=None

# Option C: Your virtual MIDI port
# receiveFrom=Maschine Plus Virtual

# Option D: Alternative name for BomeMIDI
# receiveFrom=BomeMIDI: Maschine Plus Virtual (1)
```

### Step 6: Verify with the Canary Script

1. Install both scripts (run `install-bridge.ps1`)
2. Close and reopen FL Studio
3. In MIDI Settings, select **"Tekton Canary"** as the controller
4. Find the MIDI input row for "Tekton Canary" (or for your virtual MIDI device)
5. **Click the port number** until it's highlighted
6. Check `C:\Users\Massi\tekton_canary_log.txt`

### Step 7: Check FL Studio's Output Console

Open `View → Output console` (or press F8) in FL Studio. Look for any Python errors
related to the script. FL Studio may show import errors or exceptions here.

---

## Why `receiveFrom=Tekton FL Studio Bridge` (Self-Loopback)

Looking at FL Studio's own factory script:

```python
# name=Forward CCs to current plugin Port 10
# receiveFrom=Forward CCs to current plugin Port 10
```

The `# receiveFrom=` is set to the SAME name as `# name=`. This tells FL Studio:
"Create a virtual MIDI port called 'Forward CCs to current plugin Port 10' and
attach this controller to it." The controller doesn't need any external MIDI hardware.

Our old value `# receiveFrom=Maschine Plus Virtual` required:
1. That exact MIDI device exists
2. That its port is enabled
3. That the name matches EXACTLY (including spaces, case, etc.)

By switching to self-loopback, we eliminate external hardware dependency.

---

## Script Locations

**PRIMARY install location (where FL Studio 2025 ACTUALLY reads from):**

```
D:\OneDrive\Patches\FL Studio\Settings\Hardware\
```

Secondary locations (for safety, also deployed here):

```
C:\Users\Massi\Documents\Image-Line\FL Studio\Settings\Hardware\
C:\Users\Massi\Documents\FL Studio 2025\Settings\Hardware\
C:\Users\Massi\Documents\FL Studio 21\Settings\Hardware\
D:\OneDrive\Patches\Settings\Hardware\
C:\Program Files (x86)\Image-Line\FL Studio 2025\System\Hardware specific\
```

> **Important**: The `D:\OneDrive\Patches\FL Studio\Settings\Hardware\` path is the
> actual location FL Studio reads from. The `D:\OneDrive\Patches\Settings\Hardware\` path
> (without `FL Studio` subfolder) is NOT used by FL Studio.

After editing, run `install-bridge.ps1` as Administrator to update all locations.

---

## Architecture

```
┌──────────────────────────────────────────┐
│           FL Studio Process              │
│                                          │
│  ┌─────────────────────────────────┐     │
│  │  tekton_flstudio_bridge.py      │     │
│  │  (MIDI Remote Controller)       │     │
│  │                                  │     │
│  │  OnInit() → starts TCP server   │     │
│  │  on port 7705                    │     │
│  └──────────┬──────────────────────┘     │
└─────────────┼────────────────────────────┘
              │ TCP (newline-delimited JSON)
              ▼
┌──────────────────────────────────────────┐
│     FastAPI Sidecar (port 7704)         │
│     tekton_flstudio_service.py           │
│                                          │
│  /ui/          → Web interface           │
│  /api/health   → Health check            │
│  /api/command  → Proxy to bridge :7705  │
│  /ws           → WebSocket relay         │
└──────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│     Web UI (mobile PWA)                  │
│     Browser / Android / Any              │
└──────────────────────────────────────────┘
```