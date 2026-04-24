/// File attachment widget — displays file/folder cards in chat

import 'package:flutter/material.dart';
import '../../../domain/agent/agent_protocol.dart';

class FileAttachmentWidget extends StatelessWidget {
  final FileAttachment attachment;
  final VoidCallback? onRemove;

  const FileAttachmentWidget({super.key, required this.attachment, this.onRemove});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isImage = attachment.mimeType.startsWith('image/');
    final isText = attachment.mimeType.startsWith('text/') ||
        attachment.mimeType == 'application/json' ||
        attachment.mimeType == 'application/xml';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 2),
      child: InkWell(
        onTap: () => _openFile(context),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Icon(
                _fileIcon(attachment.mimeType),
                size: 32,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(attachment.name, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(
                      '${_formatSize(attachment.size)} · ${attachment.mimeType}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                    if (attachment.preview != null && isText)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          attachment.preview!,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (onRemove != null)
                IconButton(
                  icon: const Icon(Icons.close, size: 16),
                  onPressed: onRemove,
                ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _fileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType.contains('pdf')) return Icons.picture_as_pdf;
    if (mimeType.contains('zip') || mimeType.contains('tar')) return Icons.folder_zip;
    if (mimeType.contains('code') || mimeType.contains('javascript') || mimeType.contains('python')) return Icons.code;
    if (mimeType.startsWith('text/')) return Icons.description;
    return Icons.insert_drive_file;
  }

  String _formatSize(int bytes) {
    if (bytes > 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    if (bytes > 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  void _openFile(BuildContext context) {
    // In production, open file with appropriate app
  }
}