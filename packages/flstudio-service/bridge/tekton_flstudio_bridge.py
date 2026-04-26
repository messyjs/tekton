# name=Tekton FL Studio Bridge
# url=https://github.com/messyjs/tekton
#
# Tekton FL Studio Bridge — MIDI Remote Script
# Runs INSIDE FL Studio. Opens TCP server on port 7705.
# Receives JSON commands, executes FL Studio API, returns JSON responses.
#
# INSTALLATION:
#   1. Copy this file to: C:\Users\<username>\Documents\Image-Line\FL Studio\Settings\Hardware\
#   2. FL Studio -> Options -> MIDI Settings -> Controller type -> "Tekton FL Studio Bridge"
#   3. You should see: "Tekton FL Studio bridge listening on port 7705"

import socket
import json
import threading

try:
    import general
    import transport
    import channels
    import mixer
    import patterns
    import playlist
    import arrangement
    import plugins
    import device
    import ui
    FL_API_AVAILABLE = True
except ImportError:
    FL_API_AVAILABLE = False

HOST = "127.0.0.1"
PORT = 7705
BUFFER_SIZE = 65536

MODULES = {}
if FL_API_AVAILABLE:
    MODULES["transport"] = transport
    MODULES["channels"] = channels
    MODULES["mixer"] = mixer
    MODULES["patterns"] = patterns
    MODULES["playlist"] = playlist
    MODULES["arrangement"] = arrangement
    MODULES["plugins"] = plugins
    MODULES["device"] = device
    MODULES["ui"] = ui
    MODULES["general"] = general


def execute_command(command):
    module_name = command.get("module", "")
    function_name = command.get("function", "")
    args = command.get("args", [])
    if not FL_API_AVAILABLE:
        return {"success": False, "error": "FL Studio API not available"}
    if module_name not in MODULES:
        return {"success": False, "error": f"Unknown module: {module_name}. Available: {list(MODULES.keys())}"}
    module = MODULES[module_name]
    if not hasattr(module, function_name):
        return {"success": False, "error": f"Function {function_name} not found in module {module_name}"}
    try:
        func = getattr(module, function_name)
        result = func(*args)
        if result is None:
            return {"success": True, "result": None}
        elif isinstance(result, (bool, int, float, str)):
            return {"success": True, "result": [result]}
        elif isinstance(result, (list, tuple)):
            return {"success": True, "result": [list(item) if isinstance(item, tuple) else item for item in result]}
        else:
            return {"success": True, "result": str(result)}
    except Exception as e:
        return {"success": False, "error": f"{type(e).__name__}: {str(e)}"}


_server_socket = None
_running = False


def handle_client(client_socket, address):
    try:
        buffer = ""
        while True:
            data = client_socket.recv(BUFFER_SIZE)
            if not data:
                break
            buffer += data.decode("utf-8", errors="replace")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    command = json.loads(line)
                    result = execute_command(command)
                except json.JSONDecodeError as e:
                    result = {"success": False, "error": f"Invalid JSON: {str(e)}"}
                response = json.dumps(result) + "\n"
                client_socket.sendall(response.encode("utf-8"))
    except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
        pass
    except Exception:
        pass
    finally:
        try:
            client_socket.close()
        except Exception:
            pass


def start_server():
    global _server_socket, _running
    if _running:
        return
    _running = True

    def _serve():
        global _server_socket
        try:
            _server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            _server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            _server_socket.bind((HOST, PORT))
            _server_socket.listen(5)
            _server_socket.settimeout(1.0)
            while _running:
                try:
                    client, addr = _server_socket.accept()
                    client.settimeout(30.0)
                    thread = threading.Thread(target=handle_client, args=(client, addr), daemon=True)
                    thread.start()
                except socket.timeout:
                    continue
                except OSError:
                    break
        except Exception as e:
            print(f"[Tekton FL Bridge] Server error: {e}")

    thread = threading.Thread(target=_serve, daemon=True)
    thread.start()


def stop_server():
    global _server_socket, _running
    _running = False
    if _server_socket:
        try:
            _server_socket.close()
        except Exception:
            pass
        _server_socket = None


def OnInit():
    start_server()
    if ui is not None:
        try:
            ui.setHintMsg("Tekton FL Studio bridge active on port 7705")
        except Exception:
            pass
    print(f"[Tekton FL Bridge] Listening on {HOST}:{PORT}")


def OnDeInit():
    stop_server()
    print("[Tekton FL Bridge] Stopped")


def OnMidiMsg(event):
    event.handled = False


def OnControlChange(event):
    event.handled = False


def OnNoteOn(event):
    event.handled = False


def OnRefresh(flags):
    pass
