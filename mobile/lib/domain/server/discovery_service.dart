/// Discovery service — mDNS/Bonjour auto-discovery of Tekton instances on same network.

import 'dart:async';
import 'dart:io';
import '../../services/logger.dart';

class DiscoveryService {
  final Map<String, DiscoveredInstance> _instances = {};
  final StreamController<DiscoveredInstance> _discoveryController = StreamController.broadcast();
  RawDatagramSocket? _socket;
  bool _isRunning = false;

  static const int _discoveryPort = 4892;
  static const String _serviceType = '_tekton._tcp';
  static const Duration _broadcastInterval = Duration(seconds: 5);
  static const Duration _timeout = Duration(seconds: 30);

  Stream<DiscoveredInstance> get discoveryStream => _discoveryController.stream;
  List<DiscoveredInstance> get instances => _instances.values.toList();

  /// Start broadcasting and listening for Tekton instances
  Future<void> start({int serverPort = 4891}) async {
    if (_isRunning) return;
    _isRunning = true;

    try {
      _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, _discoveryPort);
      _socket!.broadcastEnabled = true;
      _socket!.multicastLoopback = true;

      // Listen for discovery broadcasts
      _socket!.listen((event) {
        if (event == RawSocketEvent.read) {
          final datagram = _socket!.receive();
          if (datagram != null) {
            _handleDatagram(datagram.data, datagram.address);
          }
        }
      });

      // Start periodic broadcasting
      Timer.periodic(_broadcastInterval, (_) {
        if (!_isRunning) return;
        _broadcast(serverPort);
      });

      // Periodic cleanup of stale instances
      Timer.periodic(const Duration(seconds: 10), (_) {
        _cleanup();
      });

      log.info('Discovery service started on port $_discoveryPort');
    } catch (e) {
      log.error('Discovery service failed to start: $e');
      _isRunning = false;
    }
  }

  /// Stop the discovery service
  void stop() {
    _isRunning = false;
    _socket?.close();
    _socket = null;
    log.info('Discovery service stopped');
  }

  void _broadcast(int serverPort) {
    final message = 'TEKTON_DISCOVER|$serverPort|${Platform.localHostname}';
    final data = message.codeUnits;
    final addr = InternetAddress('255.255.255.255');
    _socket?.send(data, addr, _discoveryPort);
  }

  void _handleDatagram(List<int> data, InternetAddress address) {
    try {
      final message = String.fromCharCodes(data);
      if (!message.startsWith('TEKTON_DISCOVER|')) return;

      final parts = message.split('|');
      if (parts.length < 3) return;

      final port = int.tryParse(parts[1]) ?? 4891;
      final hostname = parts[2];
      final host = address.address;
      final id = '$host:$port';

      final instance = DiscoveredInstance(
        id: id,
        host: host,
        port: port,
        hostname: hostname,
        discoveredAt: DateTime.now(),
        lastSeenAt: DateTime.now(),
      );

      final isNew = !_instances.containsKey(id);
      _instances[id] = instance;

      if (isNew) {
        _discoveryController.add(instance);
        log.info('Discovered Tekton instance: $hostname ($host:$port)');
      }
    } catch (e) {
      // Ignore malformed datagrams
    }
  }

  void _cleanup() {
    final now = DateTime.now();
    final stale = _instances.entries
        .where((e) => now.difference(e.value.lastSeenAt) > _timeout)
        .map((e) => e.key)
        .toList();
    for (final id in stale) {
      _instances.remove(id);
    }
  }
}

class DiscoveredInstance {
  final String id;
  final String host;
  final int port;
  final String hostname;
  final DateTime discoveredAt;
  DateTime lastSeenAt;

  DiscoveredInstance({
    required this.id,
    required this.host,
    required this.port,
    required this.hostname,
    required this.discoveredAt,
    required this.lastSeenAt,
  });

  String get url => 'http://$host:$port';

  Map<String, dynamic> toJson() => {
    'id': id, 'host': host, 'port': port,
    'hostname': hostname, 'url': url,
  };
}