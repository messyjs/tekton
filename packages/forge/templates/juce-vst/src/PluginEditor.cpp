#include "PluginProcessor.h"
#include "PluginEditor.h"

SynthesizerPluginAudioProcessorEditor::SynthesizerPluginAudioProcessorEditor(SynthesizerPluginAudioProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p),
      gainAttachment(p.parameters, "gain", gainSlider)
{
    addAndMakeVisible(gainSlider);
    gainSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    gainSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 80, 20);

    setSize(400, 300);
    setResizeLimits(300, 200, 800, 600);
}

SynthesizerPluginAudioProcessorEditor::~SynthesizerPluginAudioProcessorEditor() {}

void SynthesizerPluginAudioProcessorEditor::paint(juce::Graphics& g) {
    g.fillAll(getLookAndFeel().findColour(juce::ResizableWindow::backgroundColourId));
    g.setColour(juce::Colours::white);
    g.setFont(15.0f);
    g.drawFittedText("SynthesizerPlugin", getLocalBounds(), juce::Justification::centredTop, 1);
}

void SynthesizerPluginAudioProcessorEditor::resized() {
    auto bounds = getLocalBounds().reduced(20);
    gainSlider.setBounds(bounds.removeFromTop(100));
}