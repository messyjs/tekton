"""TCP client for communicating with the FL Studio bridge."""
from __future__ import annotations
import json
import socket
from typing import Any

class FLSStudioBridgeClient:
    def __init__(self, host="127.0.0.1", port=7705, timeout=5.0):
        self.host = host
        self.port = port
        self.timeout = timeout

    def _connect(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        sock.connect((self.host, self.port))
        return sock

    def send_command(self, command):
        try:
            sock = self._connect()
            try:
                data = json.dumps(command) + "
"
                sock.sendall(data.encode("utf-8"))
                buffer = b""
                while True:
                    chunk = sock.recv(8192)
                    if not chunk:
                        break
                    buffer += chunk
                    if b"
" in buffer:
                        break
                response_str = buffer.decode("utf-8").strip()
                if response_str:
                    return json.loads(response_str)
                return {"success": False, "error": "Empty response from bridge"}
            finally:
                sock.close()
        except ConnectionRefusedError:
            return {"success": False, "error": "FL Studio bridge not running"}
        except socket.timeout:
            return {"success": False, "error": "Connection timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def check_connection(self):
        try:
            result = self.send_command({"module": "general", "function": "getVersion", "args": []})
            return result.get("success", False)
        except Exception:
            return False

    def execute(self, module, function, args=None):
        return self.send_command({"module": module, "function": function, "args": args or []})
