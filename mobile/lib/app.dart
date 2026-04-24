import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'presentation/theme/app_theme.dart';
import 'presentation/screens/onboarding_screen.dart';
import 'presentation/screens/chat_screen.dart';
import 'presentation/providers/app_providers.dart';

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.dark);
  void setTheme(ThemeMode mode) => state = mode;
  void toggle() => state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
}

// Seed color provider — persists the user's chosen accent color
final seedColorProvider = StateNotifierProvider<SeedColorNotifier, Color>((ref) {
  return SeedColorNotifier();
});

class SeedColorNotifier extends StateNotifier<Color> {
  SeedColorNotifier() : super(const Color(0xFF84CC16)) { // lime green default
    _load();
  }

  void _load() {
    try {
      final box = Hive.box('settings');
      final saved = box.get('seedColor') as int?;
      if (saved != null) state = Color(saved);
    } catch (_) {}
  }

  void setColor(Color color) {
    state = color;
    AppTheme.setSeedColor(color);
    try {
      final box = Hive.box('settings');
      box.put('seedColor', color.value);
    } catch (_) {}
  }
}

class TektonApp extends ConsumerWidget {
  const TektonApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboardingComplete = ref.watch(onboardingCompleteProvider);
    final themeMode = ref.watch(themeModeProvider);
    final seedColor = ref.watch(seedColorProvider);

    // Apply seed color to theme builder
    AppTheme.setSeedColor(seedColor);

    return MaterialApp(
      title: 'Tekton',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      home: onboardingComplete
          ? const ChatScreen()
          : const OnboardingScreen(),
    );
  }
}