# SynthesizerPlugin

A VST3 synthesizer plugin built with JUCE 8.

## Build

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

## Structure

- `CMakeLists.txt` — Build configuration with JUCE via CPM
- `src/PluginProcessor.h/.cpp` — AudioProcessor subclass (DSP + parameters)
- `src/PluginEditor.h/.cpp` — AudioProcessorEditor (UI)

## Development

All source files should use the `.beta` suffix during development (e.g., `PluginProcessor.beta.cpp`).