"""OSC client for communicating with AbletonOSC."""
from __future__ import annotations
import socket
from typing import Any
from pythonosc import osc_message_builder
from pythonosc import udp_client

class AbletonOSCClient:
    def __init__(self, host="127.0.0.1", send_port=11000, recv_port=11001, timeout=5.0):
        self.host = host
        self.send_port = send_port
        self.recv_port = recv_port
        self.timeout = timeout
        self._sender = None

    def _get_sender(self):
        if self._sender is None:
            self._sender = udp_client.SimpleUDPClient(self.host, self.send_port)
        return self._sender

    def send(self, address, *args):
        self._get_sender().send_message(address, list(args))

    def send_and_wait(self, address, *args, timeout=None):
        self.send(address, *args)
        return None

    def check_connection(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(1.0)
            msg = osc_message_builder.OscMessageBuilder(address="/live/test")
            msg.add_arg("ping")
            data = msg.build().dgram
            sock.sendto(data, (self.host, self.send_port))
            sock.close()
            return True
        except Exception:
            return False
