import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'presentation/theme/app_theme.dart';
import 'presentation/screens/onboarding_screen.dart';
import 'presentation/screens/chat_screen.dart';
import 'presentation/providers/app_providers.dart';

class TektonApp extends ConsumerWidget {
  const TektonApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboardingComplete = ref.watch(onboardingCompleteProvider);

    return MaterialApp(
      title: 'Tekton',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: onboardingComplete
          ? const ChatScreen()
          : const OnboardingScreen(),
    );
  }
}