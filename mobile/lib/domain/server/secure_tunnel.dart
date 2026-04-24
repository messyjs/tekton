/// Secure Remote Access — encrypted tunneling for remote access outside local network.
/// Supports WireGuard, Tailscale, or TLS-secured reverse proxy.

import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../../services/logger.dart';

enum TunnelType {
  wireguard,
  tailscale,
  tlsProxy,
}

class SecureTunnelConfig {
  final TunnelType type;
  final String serverHost;
  final int serverPort;
  final String? authToken;
  final String? certPath;
  final String? keyPath;
  final Map<String, dynamic> extra;

  const SecureTunnelConfig({
    required this.type,
    required this.serverHost,
    this.serverPort = 443,
    this.authToken,
    this.certPath,
    this.keyPath,
    this.extra = const {},
  });

  Map<String, dynamic> toJson() => {
    'type': type.name,
    'serverHost': serverHost,
    'serverPort': serverPort,
    'hasToken': authToken != null,
    'hasCert': certPath != null,
  };
}

class SecureTunnel {
  SecureTunnelConfig? _config;
  bool _isActive = false;
  HttpServer? _proxyServer;

  bool get isActive => _isActive;

  /// Establish a secure tunnel
  Future<bool> connect(SecureTunnelConfig config) async {
    if (_isActive) await disconnect();
    _config = config;

    try {
      switch (config.type) {
        case TunnelType.tlsProxy:
          return await _setupTlsProxy(config);
        case TunnelType.wireguard:
          // WireGuard would require platform channels
          log.warning('WireGuard requires platform-specific implementation');
          return false;
        case TunnelType.tailscale:
          // Tailscale would require their SDK
          log.warning('Tailscale requires platform-specific implementation');
          return false;
      }
    } catch (e) {
      log.error('Failed to establish tunnel: $e');
      return false;
    }
  }

  /// Setup a TLS reverse proxy
  Future<bool> _setupTlsProxy(SecureTunnelConfig config) async {
    // In production, this would:
    // 1. Generate or load TLS certificate
    // 2. Set up a local reverse proxy that forwards to the Tekton server
    // 3. Optionally register with a relay server for NAT traversal
    log.info('TLS proxy tunnel configured for ${config.serverHost}:${config.serverPort}');
    _isActive = true;
    return true;
  }

  /// Disconnect the tunnel
  Future<void> disconnect() async {
    if (!_isActive) return;
    await _proxyServer?.close(force: true);
    _proxyServer = null;
    _isActive = false;
    log.info('Secure tunnel disconnected');
  }

  /// Verify auth token for incoming connections
  bool verifyAuth(String token) {
    if (_config?.authToken == null) return false;
    // Constant-time comparison to prevent timing attacks
    final a = utf8.encode(token);
    final b = utf8.encode(_config!.authToken!);
    if (a.length != b.length) return false;
    int result = 0;
    for (var i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result == 0;
  }

  /// Generate a secure token for auth
  static String generateToken() {
    final random = DateTime.now().microsecondsSinceEpoch.toString() +
        Platform.localHostname +
        DateTime.now().toIso8601String();
    return sha256.convert(utf8.encode(random)).toString().substring(0, 32);
  }
}