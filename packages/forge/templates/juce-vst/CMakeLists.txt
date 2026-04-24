cmake_minimum_required(VERSION 3.22)
project(SynthesizerPlugin VERSION 1.0.0)

set(CPM_DOWNLOAD_VERSION v0.38.1)

include(cmake/CPM.cmake)

CPMAddPackage(
  NAME JUCE
  VERSION 8.0.4
  URL "https://github.com/juce-framework/JUCE/releases/download/8.0.4/juce-8.0.4.zip"
)

juce_add_plugin(SynthesizerPlugin
  COMPANY_NAME "TektonForge"
  PLUGIN_MANUFACTURER_CODE TFor
  PLUGIN_CODE SynP
  FORMATS VST3 Standalone
  PRODUCT_NAME "SynthesizerPlugin"
  IS_SYNTH TRUE
  NEEDS_MIDI_INPUT TRUE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
)

target_sources(SynthesizerPlugin
  PRIVATE
    src/PluginProcessor.cpp
    src/PluginEditor.cpp
)

target_compile_definitions(SynthesizerPlugin
  PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(SynthesizerPlugin
  PRIVATE
    juce::juce_audio_utils
    juce::juce_dsp
  PUBLIC
    juce::juce_recommended_warning_flags
)