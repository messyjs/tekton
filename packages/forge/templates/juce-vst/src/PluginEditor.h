#pragma once

#include <juce_audio_utils/juce_audio_utils.h>
#include "PluginProcessor.h"

class SynthesizerPluginAudioProcessorEditor : public juce::AudioProcessorEditor {
public:
    SynthesizerPluginAudioProcessorEditor(SynthesizerPluginAudioProcessor&);
    ~SynthesizerPluginAudioProcessorEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    SynthesizerPluginAudioProcessor& audioProcessor;
    juce::Slider gainSlider;
    juce::AudioProcessorValueTreeState::SliderAttachment gainAttachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SynthesizerPluginAudioProcessorEditor)
};