# name=Tekton Canary
# url=https://github.com/messyjs/tekton
# receiveFrom=Maschine Plus Virtual
# supportedDevices=Maschine Plus Virtual,BomeMIDI: Maschine Plus Virtual (1),Maschine Plus MIDI
# version 2026.1

import os
import datetime

LOG = r"C:\Users\Massi\tekton_canary_log.txt"

def _log(msg):
    try:
        with open(LOG, "a") as f:
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            f.write("[%s] %s\n" % (ts, msg))
    except Exception:
        pass

# ── Module-level log (runs on import, BEFORE OnInit) ──
_log("=== MODULE IMPORTED === receiveFrom=Maschine Plus Virtual ===")
_log("Python executable: " + str(getattr(os, 'executable', '?')))
try:
    import general
    _log("FL API available: general module imported OK")
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
    _log(">>> OnInit() CALLED! Bridge is ACTIVE! <<<")
    try:
        import ui
        ui.setHintMsg("Tekton Canary: ALIVE on Maschine Plus Virtual")
        _log("UI hint set OK")
    except Exception as e:
        _log("UI hint failed: " + str(e))


def OnDeInit():
    _log(">>> OnDeInit() CALLED <<<")


def OnMidiMsg(event):
    _log("OnMidiMsg: status=%d data1=%d data2=%d" % (event.status, event.data1, event.data2))
    event.handled = False


def OnControlChange(event):
    _log("OnCC: ch=%d cc=%d val=%d" % (event.midiChan, event.data1, event.data2))
    event.handled = False


def OnNoteOn(event):
    _log("OnNoteOn: ch=%d note=%d vel=%d" % (event.midiChan, event.data1, event.data2))
    event.handled = False


def OnNoteOff(event):
    _log("OnNoteOff: ch=%d note=%d" % (event.midiChan, event.data1))
    event.handled = False


def OnRefresh(flags):
    _log("OnRefresh(flags=%d)" % flags)