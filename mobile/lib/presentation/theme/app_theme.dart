import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand palette: lime green + dark charcoal
  static Color primarySeed = const Color(0xFF84CC16); // lime-500

  // Dark theme colors
  static const Color darkSurface = Color(0xFF1A1A2E); // deep charcoal-navy
  static const Color darkCard = Color(0xFF16213E); // slightly lighter card
  static const Color darkOnSurface = Color(0xFFE2E8F0); // light text on dark

  // Light theme colors
  static const Color lightSurface = Color(0xFFFAFAFA);
  static const Color lightOnSurface = Color(0xFF0F172A); // dark text on light

  static ThemeData get lightTheme => _buildTheme(Brightness.light);
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    // Build from seed for harmonious palette, then override specific slots
    final baseScheme = ColorScheme.fromSeed(
      seedColor: primarySeed,
      brightness: brightness,
    );

    // Lime green + dark grey color scheme:
    // - Primary: lime green (bright) → black text on it
    // - Secondary: dark grey/midnight → white text on it
    // - Tertiary: soft warm grey → readable text
    // - NO aqua, NO teal, NO cyan
    final colorScheme = baseScheme.copyWith(
      // Primary = lime green — black text on it for contrast
      onPrimary: isDark ? const Color(0xFF1A2E05) : const Color(0xFF1A2E05),

      // Secondary = dark charcoal — white text on it
      secondary: isDark ? const Color(0xFF94A3B8) : const Color(0xFF334155), // slate-400/slate-700
      onSecondary: isDark ? const Color(0xFF0F172A) : Colors.white,

      // Tertiary = warm muted green (not aqua/teal!)
      tertiary: isDark ? const Color(0xFFA3E635) : const Color(0xFF4D7C0F), // lime-400/lime-800
      onTertiary: isDark ? const Color(0xFF1A2E05) : Colors.white,

      // Surface = dark charcoal in dark mode
      surface: isDark ? darkSurface : lightSurface,
      onSurface: isDark ? darkOnSurface : lightOnSurface,

      // Container = slightly lighter dark for cards
      surfaceContainerHigh: isDark ? darkCard : const Color(0xFFF1F5F9),
    );

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
        backgroundColor: isDark ? darkSurface : lightSurface,
        foregroundColor: isDark ? darkOnSurface : lightOnSurface,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: isDark ? darkCard : null,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: colorScheme.outlineVariant.withValues(alpha: 0.3),
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
        foregroundColor: colorScheme.onPrimary, // dark text on lime
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isDark ? darkSurface : null,
        indicatorColor: colorScheme.primaryContainer,
        labelTextStyle: WidgetStateProperty.all(
          GoogleFonts.interTextTheme().bodySmall,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary, // dark text on lime
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
        ),
      ),
    );
  }

  /// Rebuild themes with a new seed color
  static void setSeedColor(Color color) {
    primarySeed = color;
  }
}