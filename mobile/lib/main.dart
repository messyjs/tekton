import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app.dart';
import 'domain/config/registry.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Register Hive adapters
  await Registry.init();

  // Open primary boxes
  await Hive.openBox('settings');
  await Hive.openBox('conversations');
  await Hive.openBox('messages');
  await Hive.openBox('agents');
  await Hive.openBox('memories');
  await Hive.openBox('backends');
  await Hive.openBox('models');

  runApp(const ProviderScope(child: TektonApp()));
}