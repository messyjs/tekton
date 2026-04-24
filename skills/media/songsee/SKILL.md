---
name: songsee
description: "Audio spectrogram visualization — analyze frequency content of audio files."
version: 1.0.0
metadata:
  tekton:
    tags: ["audio", "spectrogram", "visualization", "analysis"]
    category: media
    confidence: 0.3
---

# Songsee Audio Visualization

## When to Use
- Analyzing audio frequency content
- Visualizing music structure
- Debugging audio processing

## Procedure
1. Load audio file with librosa
2. Compute spectrogram: librosa.stft(audio)
3. Convert to dB scale
4. Display: matplotlib or plotly
5. Analyze: identify frequencies, onsets, patterns

## Pitfalls
- Different FFT sizes show different detail levels
- Time vs frequency resolution tradeoff
- Spectrograms can be confusing for non-experts

## Verification
- Spectrogram displays expected frequency ranges
- Audio matches visual representation
- Annotations align with actual audio events
