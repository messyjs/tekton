import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Default brand color: lime green
  static Color primarySeed = const Color(0xFF84CC16); // lime-500

  static const Color surfaceDark = Color(0xFF0F172A); // slate-900
  static const Color surfaceLight = Color(0xFFFAFAFA);
  static const Color onSurface = Color(0xFF0F172A);
  static const Color onSurfaceDark = Color(0xFFE2E8F0);

  static ThemeData get lightTheme => _buildTheme(Brightness.light);
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final colorScheme = isDark
        ? ColorScheme.dark(primary: primarySeed, surface: surfaceDark, onSurface: onSurfaceDark)
        : ColorScheme.light(primary: primarySeed, surface: surfaceLight, onSurface: onSurface);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      brightness: brightness,
      textTheme: GoogleFonts.interTextTheme(
        ThemeData(brightness: brightness).textTheme,
      ),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: colorScheme.outlineVariant.withValues(alpha: 0.5),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: colorScheme.primaryContainer,
        labelTextStyle: WidgetStateProperty.all(
          GoogleFonts.interTextTheme().bodySmall,
        ),
      ),
    );
  }

  /// Rebuild themes with a new seed color
  static void setSeedColor(Color color) {
    primarySeed = color;
  }
}