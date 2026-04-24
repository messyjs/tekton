import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart' as path_provider;
import 'dart:io';
import 'app.dart';
import 'domain/config/registry.dart';
import 'domain/agent/agent_manager.dart';
import 'domain/chat/chat_storage.dart';
import 'domain/install/model_catalog.dart';
import 'domain/memory/memory_store.dart';
import 'domain/tools/tool_registry.dart';
import 'services/logger.dart';

void main() {
  // Ensure Flutter bindings are initialized before any async work
  WidgetsFlutterBinding.ensureInitialized();

  // Run the app inside an error handler so crashes show on screen
  runApp(const _ErrorCatcher());
}

class _ErrorCatcher extends StatelessWidget {
  const _ErrorCatcher();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
      home: const _AppInitializer(),
    );
  }
}

class _AppInitializer extends StatefulWidget {
  const _AppInitializer();

  @override
  State<_AppInitializer> createState() => _AppInitializerState();
}

class _AppInitializerState extends State<_AppInitializer> {
  String _status = 'Initializing...';
  String? _error;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _initApp();
  }

  Future<void> _initApp() async {
    try {
      // Step 1: Initialize Hive
      setState(() => _status = 'Setting up storage...');
      await Hive.initFlutter();

      // Step 2: Register adapters
      setState(() => _status = 'Registering data types...');
      await Registry.init();

      // Step 3: Initialize singletons (they open their own typed Hive boxes)
      setState(() => _status = 'Loading chat data...');
      await ChatStorage.instance.init();
      setState(() => _status = 'Loading agents...');
      await AgentManager.instance.init();
      setState(() => _status = 'Loading models...');
      await ModelCatalog.instance.init();
      setState(() => _status = 'Loading memories...');
      await MemoryStore.instance.init();
      setState(() => _status = 'Loading tools...');
      ToolRegistry.instance.registerDefaults();

      setState(() {
        _initialized = true;
        _status = 'Ready';
      });
    } catch (e, stack) {
      log.error('Initialization failed: $e', error: e, stackTrace: stack);

      // Nuclear option: wipe all Hive data and try once more
      try {
        setState(() => _status = 'Recovering storage...');
        final dir = await path_provider.getApplicationDocumentsDirectory();
        final hiveDir = Directory('${dir.path}/hive');
        if (hiveDir.existsSync()) {
          hiveDir.deleteSync(recursive: true);
        }
        await Hive.initFlutter();
        await Registry.init();
        await ChatStorage.instance.init();
        await AgentManager.instance.init();
        await ModelCatalog.instance.init();
        await MemoryStore.instance.init();
        ToolRegistry.instance.registerDefaults();
        setState(() {
          _initialized = true;
          _status = 'Ready (recovered)';
        });
      } catch (e2, stack2) {
        log.error('Recovery also failed: $e2', error: e2, stackTrace: stack2);
        setState(() {
          _error = 'Failed to initialize: $e2\n\nPlease restart the app.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 24),
                Text('Initialization Error', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 16),
                Text(_error!, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () {
                    setState(() { _error = null; _status = 'Retrying...'; });
                    _initApp();
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_initialized) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              Text(_status, style: Theme.of(context).textTheme.bodyLarge),
            ],
          ),
        ),
      );
    }

    return const ProviderScope(child: TektonApp());
  }
}