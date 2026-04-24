import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart' as pathProvider;
import 'dart:io';
import 'app.dart';
import 'domain/config/registry.dart';
import 'services/logger.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage (crash-safe)
  try {
    await Hive.initFlutter();
    await Registry.init();

    // Open primary boxes (each in try/catch so one failure doesn't block the rest)
    for (final box in ['settings', 'conversations', 'messages', 'agents', 'memories', 'backends', 'models']) {
      try {
        await Hive.openBox(box);
      } catch (e) {
        log.warning('Failed to open Hive box "$box": $e — recreating');
        await Hive.deleteBoxFromDisk(box);
        await Hive.openBox(box);
      }
    }
  } catch (e) {
    log.error('Hive initialization failed: $e — starting with clean state');
    try {
      final dir = await pathProvider.getApplicationDocumentsDirectory();
      final hiveDir = Directory('${dir.path}/hive');
      if (hiveDir.existsSync()) {
        hiveDir.deleteSync(recursive: true);
      }
      await Hive.initFlutter();
      await Registry.init();
      for (final box in ['settings', 'conversations', 'messages', 'agents', 'memories', 'backends', 'models']) {
        await Hive.openBox(box);
      }
    } catch (_) {
      // Last resort: continue without Hive, app will use in-memory defaults
      log.error('Hive completely failed — running without persistence');
    }
  }

  runApp(const ProviderScope(child: TektonApp()));
}