# Tekton ProGuard Rules

# Hive
-keep class * extends com.google.protobuf.GeneratedMessageLite { *; }
-keep class io.hive.** { *; }
-keep class com.tekton.app.** { *; }

# Shelf / HTTP server
-keep class io.shelf.** { *; }
-keep class io.netty.** { *; }
-dontwarn io.netty.**

# FFI (llama.cpp)
-keep class com.tekton.app.** { *; }

# Keep all serializable models
-keepclassmembers class * {
    *** toJson();
}
-keepclassmembers class * {
    <init>(...);
}

# Keep Dart FFI
-keep class * extends java.lang.reflect.** { *; }

# Crypto
-keep class javax.crypto.** { *; }
-dontwarn javax.crypto.**