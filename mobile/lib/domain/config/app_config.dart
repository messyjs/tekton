/// Application configuration
class AppConfig {
  String themeMode;
  String onboardingMode;
  bool onboardingComplete;
  String defaultRoutingMode;
  String language;
  bool sendUsageData;
  bool enableMemory;
  bool enableVoice;
  int contextWindowMaxTokens;
  String encryptionKey;
  int serverPort;
  bool enableDiscovery;
  bool enableRemoteAccess;
  String installState;

  AppConfig({
    this.themeMode = 'system',
    this.onboardingMode = 'cloud',
    this.onboardingComplete = false,
    this.defaultRoutingMode = 'director',
    this.language = 'en',
    this.sendUsageData = false,
    this.enableMemory = true,
    this.enableVoice = false,
    this.contextWindowMaxTokens = 8192,
    this.encryptionKey = '',
    this.serverPort = 4891,
    this.enableDiscovery = true,
    this.enableRemoteAccess = false,
    this.installState = 'chatOnly',
  });

  static const String boxName = 'settings';

  static Future<AppConfig> load() async {
    // Will be loaded from Hive in main.dart
    return AppConfig();
  }

  Future<void> save() async {
    // Will be saved to Hive
  }
}