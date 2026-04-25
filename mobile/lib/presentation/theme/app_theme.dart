import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand palette: lime green primary, dark grey secondary (replaces aqua)
  static Color primarySeed = const Color(0xFF84CC16); // lime-500

  static ThemeData get lightTheme => _buildTheme(Brightness.light);
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    // Build from seed, then swap aqua/teal for dark grey
    final baseScheme = ColorScheme.fromSeed(
      seedColor: primarySeed,
      brightness: brightness,
    );

    final colorScheme = baseScheme.copyWith(
      // Primary = lime green — black text on it
      onPrimary: const Color(0xFF1A2E05),

      // Secondary = dark grey (was aqua/teal) — white text on it
      secondary: isDark ? const Color(0xFF64748B) : const Color(0xFF334155), // slate-500 / slate-700
      onSecondary: isDark ? Colors.white : Colors.white,

      // SecondaryContainer = dark grey tinted (replaces aqua containers)
      secondaryContainer: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0), // slate-800 / slate-200
      onSecondaryContainer: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF1E293B),

      // Tertiary = warm muted lime (not aqua!)
      tertiary: isDark ? const Color(0xFFA3E635) : const Color(0xFF4D7C0F), // lime-400 / lime-800
      onTertiary: isDark ? const Color(0xFF1A2E05) : Colors.white,

      // Remove any remaining teal/cyan residuals
      tertiaryContainer: isDark ? const Color(0xFF2D3B1A) : const Color(0xFFD9F99D),
      onTertiaryContainer: isDark ? const Color(0xFFA3E635) : const Color(0xFF1A2E05),
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
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
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
        indicatorColor: colorScheme.primaryContainer,
        labelTextStyle: WidgetStateProperty.all(
          GoogleFonts.interTextTheme().bodySmall,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
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