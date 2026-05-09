# name=Tekton Port Test
# url=https://github.com/messyjs/tekton
# supportedDevices=
# version 2026.1

import os
import datetime

LOG = r"C:\Users\Massi\tekton_porttest_log.txt"

def _log(msg):
    try:
        with open(LOG, "a") as f:
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            f.write("[%s] %s\n" % (ts, msg))
    except Exception:
        pass

# ── Module-level log (runs on import, BEFORE OnInit) ──
# supportedDevices= (empty) = available for ANY MIDI input (like SSL 360 UF8)
_log("=== MODULE IMPORTED === supportedDevices= (empty, any device) ===")
_log("Python executable: " + str(getattr(os, 'executable', '?')))
try:
    import general
    _log("FL API: general module imported OK")
    try:
        _log("FL Studio version: " + str(general.getVersion()))
    except Exception as e:
        _log("getVersion failed: " + str(e))
except Exception as e:
    _log("FL API NOT available: " + str(e))

try:
    import device
    _log("device.isInstalled() = " + str(device.isInstalled()))
except Exception as e:
    _log("device.isInstalled() failed: " + str(e))


def OnInit():
    _log(">>> OnInit() CALLED! ANY-DEVICE SCRIPT WORKS! <<<")
    try:
        import ui
        ui.setHintMsg("Tekton Port Test: ACTIVE (any device)")
        _log("UI hint set OK")
    except Exception as e:
        _log("UI hint failed: " + str(e))


def OnDeInit():
    _log(">>> OnDeInit() CALLED <<<")


def OnMidiMsg(event):
    _log("OnMidiMsg: status=%d data1=%d data2=%d" % (event.status, event.data1, event.data2))
    event.handled = False


def OnRefresh(flags):
    _log("OnRefresh(flags=%d)" % flags)