# name=Tekton Test
# url=https://github.com/messyjs/tekton
# supportedDevices=
# version 2026.1

import datetime as _dt
import os as _os

_Paths = [
    _os.path.join(_os.environ.get("USERPROFILE", "C:\\Users\\Massi"), "tekton_test_log.txt"),
    "C:\\Users\\Massi\\tekton_test_log.txt",
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "_test_log.txt"),
]

def _w(msg):
    for p in _Paths:
        try:
            with open(p, "a") as f:
                f.write("[%s] %s\n" % (_dt.datetime.now().strftime("%H:%M:%S"), msg))
            break
        except Exception:
            continue

_w("MODULE IMPORTED - script loaded by Python")
try:
    import general
    _w("FL API OK - general imported")
    try:
        _w("FL Studio version: " + str(general.getVersion()))
    except Exception as e:
        _w("getVersion error: " + str(e))
except Exception as e:
    _w("FL API MISSING: " + str(e))

try:
    import device
    _w("device.isInstalled()=" + str(device.isInstalled()))
except Exception as e:
    _w("device error: " + str(e))

def OnInit():
    _w(">>> OnInit() CALLED! SCRIPT IS ACTIVE! <<<")

def OnDeInit():
    _w("OnDeInit called")

def OnMidiMsg(event):
    event.handled = False

def OnRefresh(flags):
    _w("OnRefresh flags=" + str(flags))