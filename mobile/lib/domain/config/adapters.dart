/// Hive adapters for Tekton models — hand-written since hive_generator conflicts with riverpod_generator

import 'package:hive_flutter/hive_flutter.dart';
import '../agent/agent_config.dart';
import '../agent/agent_protocol.dart';
import '../llm/llm_backend.dart';
import '../chat/chat_message.dart';
import '../chat/conversation.dart';
import '../install/model_catalog.dart';
import '../memory/memory_store.dart';
import '../config/app_config.dart';

class AgentConfigAdapter extends TypeAdapter<AgentConfig> {
  @override
  final int typeId = 10;

  @override
  AgentConfig read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    return AgentConfig(
      id: reader.readString(),
      displayName: reader.readString(),
      avatar: _readNullable(reader),
      systemPrompt: reader.readString(),
      modelRef: reader.readString(),
      backendId: reader.readString(),
      enabledTools: reader.readStringList(),
      taskAffinities: reader.readStringList(),
      priority: reader.readInt(),
      fallbackAgentId: _readNullable(reader),
      inferenceParams: Map<String, dynamic>.from(reader.readMap().map((k, v) => MapEntry(k.toString(), v))),
      createdAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
    );
  }

  @override
  void write(BinaryWriter writer, AgentConfig obj) {
    writer.writeByte(14);
    writer.writeString(obj.id);
    writer.writeString(obj.displayName);
    _writeNullable(writer, obj.avatar);
    writer.writeString(obj.systemPrompt);
    writer.writeString(obj.modelRef);
    writer.writeString(obj.backendId);
    writer.writeStringList(obj.enabledTools);
    writer.writeStringList(obj.taskAffinities);
    writer.writeInt(obj.priority);
    _writeNullable(writer, obj.fallbackAgentId);
    writer.writeMap(obj.inferenceParams);
    writer.writeInt(obj.createdAt.millisecondsSinceEpoch);
    writer.writeInt(obj.updatedAt.millisecondsSinceEpoch);
  }
}

class BackendConfigAdapter extends TypeAdapter<BackendConfig> {
  @override
  final int typeId = 20;

  @override
  BackendConfig read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    return BackendConfig(
      id: reader.readString(),
      name: reader.readString(),
      provider: ApiProvider.byName(reader.readString()),
      baseUrl: reader.readString(),
      apiKey: _readNullable(reader),
      defaultModel: reader.readString(),
      maxTokens: reader.readInt(),
      isDefault: reader.readBool(),
      isConnected: reader.readBool(),
      createdAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
      headers: Map<String, String>.from(reader.readMap().map((k, v) => MapEntry(k.toString(), v.toString()))),
    );
  }

  @override
  void write(BinaryWriter writer, BackendConfig obj) {
    writer.writeByte(12);
    writer.writeString(obj.id);
    writer.writeString(obj.name);
    writer.writeString(obj.provider.name);
    writer.writeString(obj.baseUrl);
    _writeNullable(writer, obj.apiKey);
    writer.writeString(obj.defaultModel);
    writer.writeInt(obj.maxTokens);
    writer.writeBool(obj.isDefault);
    writer.writeBool(obj.isConnected);
    writer.writeInt(obj.createdAt.millisecondsSinceEpoch);
    writer.writeMap(obj.headers);
  }
}

class ChatMessageAdapter extends TypeAdapter<ChatMessage> {
  @override
  final int typeId = 30;

  @override
  ChatMessage read(BinaryReader reader) {
    reader.readByte(); // numOfFields
    return ChatMessage(
      id: reader.readString(),
      role: AgentRole.values[reader.readInt()],
      content: reader.readString(),
      conversationId: reader.readString(),
      agentId: _readNullable(reader),
      modelUsed: _readNullable(reader),
      tokensConsumed: _readNullableInt(reader),
      parentMessageId: _readNullable(reader),
      isStreaming: reader.readBool(),
    );
  }

  @override
  void write(BinaryWriter writer, ChatMessage obj) {
    writer.writeByte(10);
    writer.writeString(obj.id);
    writer.writeInt(obj.role.index);
    writer.writeString(obj.content);
    writer.writeString(obj.conversationId);
    _writeNullable(writer, obj.agentId);
    _writeNullable(writer, obj.modelUsed);
    _writeNullableInt(writer, obj.tokensConsumed);
    _writeNullable(writer, obj.parentMessageId);
    writer.writeBool(obj.isStreaming);
  }
}

class ConversationAdapter extends TypeAdapter<Conversation> {
  @override
  final int typeId = 31;

  @override
  Conversation read(BinaryReader reader) {
    reader.readByte();
    return Conversation(
      id: reader.readString(),
      title: reader.readString(),
      assignedAgentId: _readNullable(reader),
      defaultBackendId: _readNullable(reader),
      routingMode: reader.readString(),
      createdAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
      isPinned: reader.readBool(),
      summary: _readNullable(reader),
      messageCount: reader.readInt(),
      totalTokens: reader.readInt(),
    );
  }

  @override
  void write(BinaryWriter writer, Conversation obj) {
    writer.writeByte(11);
    writer.writeString(obj.id);
    writer.writeString(obj.title);
    _writeNullable(writer, obj.assignedAgentId);
    _writeNullable(writer, obj.defaultBackendId);
    writer.writeString(obj.routingMode);
    writer.writeInt(obj.createdAt.millisecondsSinceEpoch);
    writer.writeInt(obj.updatedAt.millisecondsSinceEpoch);
    writer.writeBool(obj.isPinned);
    _writeNullable(writer, obj.summary);
    writer.writeInt(obj.messageCount);
    writer.writeInt(obj.totalTokens);
  }
}

class ModelEntryAdapter extends TypeAdapter<ModelEntry> {
  @override
  final int typeId = 40;

  @override
  ModelEntry read(BinaryReader reader) {
    reader.readByte();
    return ModelEntry(
      id: reader.readString(),
      name: reader.readString(),
      description: reader.readString(),
      url: reader.readString(),
      sizeBytes: reader.readInt(),
      ramRequiredMB: reader.readInt(),
      quantization: reader.readString(),
      contextLength: reader.readInt(),
      capabilities: reader.readStringList(),
      recommendedTier: DeviceTier.byName(reader.readString()),
      sha256: reader.readString(),
      isDownloaded: reader.readBool(),
      localPath: _readNullable(reader),
      isLoaded: reader.readBool(),
    );
  }

  @override
  void write(BinaryWriter writer, ModelEntry obj) {
    writer.writeByte(14);
    writer.writeString(obj.id);
    writer.writeString(obj.name);
    writer.writeString(obj.description);
    writer.writeString(obj.url);
    writer.writeInt(obj.sizeBytes);
    writer.writeInt(obj.ramRequiredMB);
    writer.writeString(obj.quantization);
    writer.writeInt(obj.contextLength);
    writer.writeStringList(obj.capabilities);
    writer.writeString(obj.recommendedTier.name);
    writer.writeString(obj.sha256);
    writer.writeBool(obj.isDownloaded);
    _writeNullable(writer, obj.localPath);
    writer.writeBool(obj.isLoaded);
  }
}

class MemoryEntryAdapter extends TypeAdapter<MemoryEntry> {
  @override
  final int typeId = 50;

  @override
  MemoryEntry read(BinaryReader reader) {
    reader.readByte();
    return MemoryEntry(
      id: reader.readString(),
      type: MemoryType.values[reader.readInt()],
      content: reader.readString(),
      importance: reader.readDouble(),
      createdAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
      lastAccessedAt: DateTime.fromMillisecondsSinceEpoch(reader.readInt()),
      accessCount: reader.readInt(),
      sourceConversationId: _readNullable(reader),
      sourceAgentId: _readNullable(reader),
      tags: reader.readStringList(),
    );
  }

  @override
  void write(BinaryWriter writer, MemoryEntry obj) {
    writer.writeByte(10);
    writer.writeString(obj.id);
    writer.writeInt(obj.type.index);
    writer.writeString(obj.content);
    writer.writeDouble(obj.importance);
    writer.writeInt(obj.createdAt.millisecondsSinceEpoch);
    writer.writeInt(obj.lastAccessedAt.millisecondsSinceEpoch);
    writer.writeInt(obj.accessCount);
    _writeNullable(writer, obj.sourceConversationId);
    _writeNullable(writer, obj.sourceAgentId);
    writer.writeStringList(obj.tags);
  }
}

class AppConfigAdapter extends TypeAdapter<AppConfig> {
  @override
  final int typeId = 60;

  @override
  AppConfig read(BinaryReader reader) {
    reader.readByte();
    return AppConfig(
      themeMode: reader.readString(),
      onboardingMode: reader.readString(),
      onboardingComplete: reader.readBool(),
      defaultRoutingMode: reader.readString(),
      language: reader.readString(),
      sendUsageData: reader.readBool(),
      enableMemory: reader.readBool(),
      enableVoice: reader.readBool(),
      contextWindowMaxTokens: reader.readInt(),
      encryptionKey: reader.readString(),
      serverPort: reader.readInt(),
      enableDiscovery: reader.readBool(),
      enableRemoteAccess: reader.readBool(),
      installState: reader.readString(),
    );
  }

  @override
  void write(BinaryWriter writer, AppConfig obj) {
    writer.writeByte(14);
    writer.writeString(obj.themeMode);
    writer.writeString(obj.onboardingMode);
    writer.writeBool(obj.onboardingComplete);
    writer.writeString(obj.defaultRoutingMode);
    writer.writeString(obj.language);
    writer.writeBool(obj.sendUsageData);
    writer.writeBool(obj.enableMemory);
    writer.writeBool(obj.enableVoice);
    writer.writeInt(obj.contextWindowMaxTokens);
    writer.writeString(obj.encryptionKey);
    writer.writeInt(obj.serverPort);
    writer.writeBool(obj.enableDiscovery);
    writer.writeBool(obj.enableRemoteAccess);
    writer.writeString(obj.installState);
  }
}

class ApiProviderAdapter extends TypeAdapter<ApiProvider> {
  @override
  final int typeId = 100;

  @override
  ApiProvider read(BinaryReader reader) => ApiProvider.byName(reader.readString());

  @override
  void write(BinaryWriter writer, ApiProvider obj) => writer.writeString(obj.name);
}

class DeviceTierAdapter extends TypeAdapter<DeviceTier> {
  @override
  final int typeId = 101;

  @override
  DeviceTier read(BinaryReader reader) => DeviceTier.byName(reader.readString());

  @override
  void write(BinaryWriter writer, DeviceTier obj) => writer.writeString(obj.name);
}

class MemoryTypeAdapter extends TypeAdapter<MemoryType> {
  @override
  final int typeId = 102;

  @override
  MemoryType read(BinaryReader reader) => MemoryType.values[reader.readInt()];

  @override
  void write(BinaryWriter writer, MemoryType obj) => writer.writeInt(obj.index);
}

class AgentRoleAdapter extends TypeAdapter<AgentRole> {
  @override
  final int typeId = 103;

  @override
  AgentRole read(BinaryReader reader) => AgentRole.values[reader.readInt()];

  @override
  void write(BinaryWriter writer, AgentRole obj) => writer.writeInt(obj.index);
}

// Helper functions
String? _readNullable(BinaryReader reader) {
  final hasValue = reader.readBool();
  return hasValue ? reader.readString() : null;
}

void _writeNullable(BinaryWriter writer, String? value) {
  writer.writeBool(value != null);
  if (value != null) writer.writeString(value);
}

int? _readNullableInt(BinaryReader reader) {
  final hasValue = reader.readBool();
  return hasValue ? reader.readInt() : null;
}

void _writeNullableInt(BinaryWriter writer, int? value) {
  writer.writeBool(value != null);
  if (value != null) writer.writeInt(value);
}