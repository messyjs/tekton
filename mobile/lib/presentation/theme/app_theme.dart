import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Default brand color: lime green
  static Color primarySeed = const Color(0xFF84CC16); // lime-500

  static ThemeData get lightTheme => _buildTheme(Brightness.light);
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    // Use fromSeed for harmonious Material 3 palette
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primarySeed,
      brightness: brightness,
    );

    // Override onPrimary: lime green is bright, so text on it must be dark/black
    // This fixes the "white text on lime green" readability issue
    final fixedColorScheme = colorScheme.copyWith(
      onPrimary: const Color(0xFF1A2E05), // very dark green-black on lime
      onPrimaryContainer: isDark ? const Color(0xFF1A2E05) : const Color(0xFF1A2E05),
      // Neutralize teal/aqua accents — force warm secondary
      secondary: isDark ? const Color(0xFFD4E157) : const Color(0xFF558B2F), // lime-700, no aqua
      onSecondary: isDark ? const Color(0xFF1A2E05) : Colors.white,
      tertiary: isDark ? const Color(0xFFFDD835) : const Color(0xFFF9A825), // amber/gold warm complement
      onTertiary: isDark ? const Color(0xFF1A1A00) : const Color(0xFF1A1A00),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: fixedColorScheme,
      brightness: brightness,
      textTheme: GoogleFonts.interTextTheme(
        ThemeData(brightness: brightness).textTheme,
      ),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFAFAFA),
        foregroundColor: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: fixedColorScheme.outlineVariant.withValues(alpha: 0.5),
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
        backgroundColor: fixedColorScheme.primary,
        foregroundColor: fixedColorScheme.onPrimary, // dark text on lime
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: fixedColorScheme.primaryContainer,
        labelTextStyle: WidgetStateProperty.all(
          GoogleFonts.interTextTheme().bodySmall,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: fixedColorScheme.primary,
          foregroundColor: fixedColorScheme.onPrimary, // dark on lime
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: fixedColorScheme.primary,
          foregroundColor: fixedColorScheme.onPrimary,
        ),
      ),
    );
  }

  /// Rebuild themes with a new seed color
  static void setSeedColor(Color color) {
    primarySeed = color;
  }
}