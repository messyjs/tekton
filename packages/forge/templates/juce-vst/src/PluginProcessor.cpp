#include "PluginProcessor.h"
#include "PluginEditor.h"

SynthesizerPluginAudioProcessor::SynthesizerPluginAudioProcessor()
    : AudioProcessor(BusesProperties()
        .withInput("Input", juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      parameters(*this, nullptr, juce::Identifier("Parameters"), {
          std::make_unique<juce::AudioParameterFloat>("gain", "Gain", 0.0f, 1.0f, 0.5f)
      })
{
}

SynthesizerPluginAudioProcessor::~SynthesizerPluginAudioProcessor() {}

void SynthesizerPluginAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    juce::ScopedNoDenormals noDenormals;
    // Prepare DSP here
}

void SynthesizerPluginAudioProcessor::releaseResources() {}

#ifndef JucePlugin_PreferredChannelConfigurations
bool SynthesizerPluginAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
        && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    if (layouts.getMainInputChannelSet() != juce::AudioChannelSet::mono()
        && layouts.getMainInputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    return true;
}
#endif

void SynthesizerPluginAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
    juce::ScopedNoDenormals noDenormals;
    auto gainParam = parameters.getRawParameterValue("gain")->load();
    for (auto channel = 0; channel < buffer.getNumChannels(); ++channel) {
        buffer.applyGain(channel, 0, buffer.getNumSamples(), gainParam);
    }
}

juce::AudioProcessorEditor* SynthesizerPluginAudioProcessor::createEditor() {
    return new SynthesizerPluginAudioProcessorEditor(*this);
}

void SynthesizerPluginAudioProcessor::getStateInformation(juce::MemoryBlock& destData) {
    auto state = parameters.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void SynthesizerPluginAudioProcessor::setStateInformation(const void* data, int sizeInBytes) {
    std::unique_ptr<juce::XmlElement> xml(getXmlFromBinary(data, sizeInBytes));
    if (xml) {
        auto state = juce::ValueTree::fromXml(*xml);
        parameters.replaceState(state);
    }
}