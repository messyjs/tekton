/// Simple logger for Tekton mobile app
import 'dart:developer' as developer;

enum LogLevel { debug, info, warning, error }

class Logger {
  static final Logger _instance = Logger._();
  static Logger get instance => _instance;
  Logger._();

  void debug(String message, {String? tag}) => _log(LogLevel.debug, message, tag: tag);
  void info(String message, {String? tag}) => _log(LogLevel.info, message, tag: tag);
  void warning(String message, {String? tag}) => _log(LogLevel.warning, message, tag: tag);
  void error(String message, {String? tag, Object? error, StackTrace? stackTrace}) {
    _log(LogLevel.error, message, tag: tag, error: error, stackTrace: stackTrace);
  }

  void _log(LogLevel level, String message, {String? tag, Object? error, StackTrace? stackTrace}) {
    final prefix = switch (level) {
      LogLevel.debug => '🔍',
      LogLevel.info => 'ℹ️',
      LogLevel.warning => '⚠️',
      LogLevel.error => '❌',
    };
    final tagStr = tag != null ? '[$tag] ' : '';
    developer.log('$prefix $tagStr$message', level: level.index, name: 'Tekton');
  }
}

// Global shortcut
final log = Logger.instance;