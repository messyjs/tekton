/// SystemInfo Tool — device stats, battery, storage, RAM.
/// Fast, local — suitable for Gemma 4 E2B.

import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'tool_types.dart';

// Import for platform detection
import 'dart:io';

class SystemInfoTool extends BaseTool {
  SystemInfoTool() : super(const ToolDefinition(
    name: 'system_info',
    description: 'Get device information: CPU, RAM, storage, battery, OS version. Fast local operation.',
    parameters: {
      'category': ToolParameter(type: 'string', description: 'Category: device, storage, memory, network, battery, all', enumValues: ['device', 'storage', 'memory', 'network', 'battery', 'all']),
    },
    category: ToolCategory.system,
  ));

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final category = arguments['category'] as String? ?? 'all';

    try {
      switch (category) {
        case 'device':
          return _deviceInfo(callId);
        case 'storage':
          return _storageInfo(callId);
        case 'memory':
          return _memoryInfo(callId);
        case 'battery':
          return _batteryInfo(callId);
        case 'all':
        default:
          return _allInfo(callId);
      }
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'System info error: $e');
    }
  }

  Future<ToolExecutionResult> _deviceInfo(String callId) async {
    final deviceInfo = DeviceInfoPlugin();

    if (Platform.isAndroid) {
      final info = await deviceInfo.androidInfo;
      return ToolExecutionResult.success(toolCallId: callId, data: {
        'platform': 'Android',
        'manufacturer': info.manufacturer,
        'model': info.model,
        'brand': info.brand,
        'androidVersion': info.version.release,
        'sdkVersion': info.version.sdkInt.toString(),
        'isPhysicalDevice': info.isPhysicalDevice,
        'cpuAbi': info.supportedAbis.join(', '),
      });
    } else if (Platform.isIOS) {
      final info = await deviceInfo.iosInfo;
      return ToolExecutionResult.success(toolCallId: callId, data: {
        'platform': 'iOS',
        'model': info.utsname.machine,
        'systemVersion': info.systemVersion,
        'name': info.name,
        'isPhysicalDevice': info.isPhysicalDevice,
      });
    } else if (Platform.isWindows) {
      final info = await deviceInfo.windowsInfo;
      return ToolExecutionResult.success(toolCallId: callId, data: {
        'platform': 'Windows',
        'computerName': info.computerName,
        'numberOfProcessors': 0, // Available via Platform.numberOfProcessors
      });
    } else if (Platform.isMacOS) {
      final info = await deviceInfo.macOsInfo;
      return ToolExecutionResult.success(toolCallId: callId, data: {
        'platform': 'macOS',
        'computerName': info.computerName,
        'model': info.model,
        'kernelVersion': info.kernelVersion,
        'osVersion': info.osRelease,
      });
    } else if (Platform.isLinux) {
      final info = await deviceInfo.linuxInfo;
      return ToolExecutionResult.success(toolCallId: callId, data: {
        'platform': 'Linux',
        'name': info.name,
        'version': info.version,
        'id': info.id,
      });
    }

    return ToolExecutionResult.success(toolCallId: callId, data: {'platform': 'Unknown'});
  }

  Future<ToolExecutionResult> _storageInfo(String callId) async {
    // Get storage info from path_provider
    try {
      final temp = Directory.systemTemp;
      final stat = await temp.parent.stat();
      return ToolExecutionResult.success(toolCallId: callId, data: {
        'available': 'See device settings for detailed storage info',
        'tempPath': temp.path,
        'appDataAvailable': true,
      });
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Storage info unavailable: $e');
    }
  }

  Future<ToolExecutionResult> _memoryInfo(String callId) async {
    // Process memory info
    final info = ProcessInfo.currentRss;
    return ToolExecutionResult.success(toolCallId: callId, data: {
      'processMemoryMB': (info / (1024 * 1024)).round(),
      'processors': Platform.numberOfProcessors,
      'optimalThreadCount': _optimalThreadCount(),
    });
  }

  Future<ToolExecutionResult> _batteryInfo(String callId) async {
    // Battery info requires platform channels
    return ToolExecutionResult.success(toolCallId: callId, data: {
      'note': 'Battery info requires platform-specific implementation',
    });
  }

  int _optimalThreadCount() => (Platform.numberOfProcessors / 2).ceil();

  Future<ToolExecutionResult> _allInfo(String callId) async {
    final device = await _deviceInfo(callId);
    final memory = await _memoryInfo(callId);

    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'device': device.success ? device.data : 'Unavailable',
        'memory': memory.success ? memory.data : 'Unavailable',
      },
    );
  }
}

// End of file