# Tekton Box — LLM Architecture: Uncensored Voice Assistant + Trading

## The Core Problem

For an Alexa-like uncensored assistant, you need an LLM that can:
- Answer general knowledge questions naturally
- Follow complex multi-step instructions
- Write code, explain concepts, be creative
- Do all this WITHOUT content filters
- Respond fast enough for voice (< 5 seconds total)

**Qwen2.5-3B on Pi 5** is fast enough (4.4s total) but too dumb for general assistant use.
**Qwen2.5-7B on Pi 5** is smart enough but too slow (9.4s total — painful for voice).

## Solution: Two-Model Hybrid Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TEKTON BOX                            │
│                                                          │
│  ┌─────────────┐         ┌──────────────────┐          │
│  │  Query       │────────▶│  Complexity Router │          │
│  │  Classifier  │         │                  │          │
│  └─────────────┘         └──────┬─────┬──────┘          │
│                                 │     │                  │
│                    ┌────────────┘     └──────────┐      │
│                    ▼                             ▼      │
│  ┌──────────────────────┐   ┌──────────────────────┐   │
│  │  FAST: Local 3B      │   │  DEEP: LAN/Cloud 14B  │   │
│  │  Qwen2.5-3B Q4      │   │  Qwen3.5-27B or       │   │
│  │  Always on, instant  │   │  DeepSeek V3           │   │
│  │  ~4.4s total          │   │  ~5-15s total          │   │
│  │  Handles:            │   │  Handles:              │   │
│  │  - Quick facts       │   │  - Deep analysis       │   │
│  │  - Timers/reminders  │   │  - Code generation     │   │
│  │  - Trade voice out   │   │  - Complex reasoning   │   │
│  │  - Simple Q&A        │   │  - Creative tasks      │   │
│  │  - Bias/scent status │   │  - Trading explanations│   │
│  │  - Home control      │   │  - Multi-step tasks    │   │
│  └──────────────────────┘   └──────────────────────┘   │
│                                                          │
│  Query classification (sub-200ms):                       │
│  ├── "What time is it?"           → FAST (local 3B)     │
│  ├── "Best trade right now?"      → TEMPLATED (no LLM)   │
│  ├── "Set timer 5 minutes"        → TEMPLATED (no LLM)   │
│  ├── "What's the bias?"           → FAST (local 3B)      │
│  ├── "Explain that trade"         → DEEP (cloud 14B)     │
│  ├── "Write me a Python script"   → DEEP (cloud 14B)     │
│  └── "Compare Gann vs ICT"        → DEEP (cloud 14B)     │
└─────────────────────────────────────────────────────────┘
```

## Why Not Just One Model?

Because voice interaction has a hard latency budget. Alexa responds in
~2-3 seconds. We can hit ~4.4s with a local 3B model, which is "OK".
But 9.4s with a 7B model feels broken for voice.

The hybrid approach gives us:
- **4.4s total** for 80% of queries (local 3B)
- **5-15s total** for 20% of queries (cloud 14B+)
- The user can CHOOSE to wait for deep answers
- Simple stuff is fast

## Hardware Options (Updated BOM)

| Option | SBC | RAM | Local Model | Speed | Extra Cost | Smart Level |
|--------|-----|-----|-------------|-------|------------|-------------|
| Budget | Pi 5 8GB | 8GB | 3B Q4 | 4.4s | $0 | Decent Q&A |
| Better | Orange Pi 5 Pro 16GB | 16GB | 7B Q4 | 6.5s | +$40 | Good assistant |
| Best | Pi 5 + Hailo-8L | 8GB + 13TOPS | 7B (accelerated) | 4.0s | +$35 | Good assistant |

### Recommended: Option C — Pi 5 + Hailo-8L

The Hailo-8L ($35) is a neural accelerator that gives 13 TOPS on a tiny USB stick.
It doesn't directly run LLMs, but it can handle:
- Wake word detection (offloaded from Pi CPU)
- Whisper STT (runs on Hailo, ~300ms vs 800ms on CPU)
- Vision tasks if we add a camera later

This frees up the Pi 5's CPU entirely for LLM inference, letting us run
Qwen2.5-3B at 6-8 tokens/sec (3.5s response total), which feels snappy.

### Alternative: Orange Pi 5 Pro 16GB

The extra RAM lets us load Qwen2.5-7B-Q4 (4GB model + 4GB context).
Speed is slower at 1.5-2 t/s, giving ~8.5s total. Acceptable for
assistant use where you don't mind waiting, but not great for voice.
However, the QUALITY of responses is significantly better than 3B.

### My recommendation for "Alexa-like uncensored assistant":

**Go with Orange Pi 5 Pro 16GB ($120) and Qwen2.5-7B-Instruct Q4.**

Here's why:
- 7B is the MINIMUM for a general-purpose assistant
- 3B constantly fails at math, coding, multi-step anything
- The 8.5s latency is OK for a dedicated device (not a phone)
- You're already waiting for scent spray and trade analysis anyway
- The uncensored fine-tunes of Qwen2.5-7B are actually good
- 16GB RAM lets you run larger context windows (8K+ tokens)

## Uncensored Model Options

For a truly uncensored assistant, use these fine-tunes:

| Model | Size | Why | Uncensored? |
|-------|------|-----|-------------|
| **Qwen2.5-7B-Instruct** | 7B | Best 7B available, multilingual, excellent | Mostly (refuses CP/terrorism) |
| **Dolphin 2.9.3-Qwen-7B** | 7B | Eric Hartford's uncensored Qwen fine-tune | Fully uncensored |
| **Nous-Hermes-2-Mixtral-8x7B-DPO** | 47B | Best quality uncensored, cloud only | Fully uncensored |
| **Qwen2.5-14B-Instruct** | 14B | Great quality, cloud/LAN only | Mostly uncensored |
| **Qwen3.5-27B** | 27B | Your existing workstation model | Mostly uncensored |

**On-device**: Dolphin 2.9.3-Qwen-7B-Q4_K_M (~4GB, fits in 16GB OPi5)
**Cloud/LAN**: Qwen3.5-27B on your workstation (already running at 192.168.68.60:11434)

## Updated Total BOM (Orange Pi 5 Pro 16GB)

| # | Component | Model | Cost | Notes |
|---|-----------|-------|------|-------|
| 1 | SBC | Orange Pi 5 Pro 16GB | $120 | Better than Pi 5 for LLM |
| 2 | MicroSD | 128GB A2 U3 | $10 | OS + 4GB model |
| 3 | Mic Array | ReSpeaker 2-Mics HAT | $15 | Voice input |
| 4 | Speaker | 3W 4Ω + MAX98357A | $8 | Voice output |
| 5 | Scent Valve 1 | 12V solenoid (Givenchy Pi) | $5 | Bullish scent |
| 6 | Scent Valve 2 | 12V solenoid (Fart Spray) | $5 | Bearish scent |
| 7 | Scent Canisters | 2x 10ml vials + wicks | $8 | Refillable |
| 8 | MOSFET Drivers | 2x IRLZ44N + flyback | $2 | GPIO to solenoid |
| 9 | 4G Module | SIM7600CE-T | $25 | Mobile data |
| 10 | SIM Slot | Nano SIM holder | $1 | Hot-swappable |
| 11 | Display | 3.5" IPS 480x320 SPI | $18 | Dashboard |
| 12 | Battery | 3x 18650 3500mAh + holder | $15 | ~8hr runtime |
| 13 | BMS | TP4056 + DW01A | $2 | Charge protection |
| 14 | USB-C PD | USB-C + CH224K | $3 | 5V/3A charging |
| 15 | Case | 3D printed PETG | $10 | Portable |
| 16 | Antenna | SMA + 4G antenna | $3 | SIM7600 |
| 17 | Hailo-8L (optional) | USB neural accelerator | $35 | Faster STT/wake word |
| 18 | Misc | Wires, screws, heatsinks | $5 | |
| **TOTAL** | | | **$239** | without Hailo, **$274** with |

## Assistant Capabilities (Beyond Trading)

With a 7B uncensored model, the Tekton Box can do EVERYTHING an Alexa does,
plus trading, plus uncensored content, plus scent feedback:

| Capability | How | Model |
|------------|-----|-------|
| Trade setups | Director agent templated + LLM explanation | TIER 0 (templated) |
| Market bias | USDT.D tracker → scent | TIER 0 (no LLM) |
| General Q&A | "What's the capital of France?" | TIER 1 (local 7B) |
| Timers & reminders | "Remind me in 30 minutes" | TIER 0 (Python, no LLM) |
| Math & conversions | "Convert 100 miles to km" | TIER 1 (local 7B) |
| News & weather | Needs 4G WiFi for API calls | TIER 1 (local 7B + APIs) |
| Trade explanations | "Explain that last trade" | TIER 1 (local 7B, context from trade DB) |
| Coding help | "Write a Python script for..." | TIER 2 (cloud 27B) |
| Deep analysis | "Compare Gann vs ICT on ETH" | TIER 2 (cloud 27B) |
| Creative writing | "Write me a poem about Bitcoin" | TIER 1 or TIER 2 |
| Home automation | "Turn off the lights" (needs Home Assistant) | TIER 0 (Python) |
| Uncensored content | No restrictions on any topic | ALL TIERS |

## The Query Router (What Model to Use)

```python
def route_query(query: str, context: dict) -> str:
    """Decide which model tier to use. Returns 'template', 'local', or 'cloud'."""
    
    # TIER 0: Templated — no LLM needed
    trade_keywords = ["trade", "setup", "long", "short", "buy", "sell", "position"]
    timer_keywords = ["timer", "remind", "alarm", "wake"]
    device_keywords = ["bias", "scent", "status", "stats", "leaderboard"]
    
    if any(k in query.lower() for k in trade_keywords) and len(query.split()) < 8:
        return "template"
    if any(k in query.lower() for k in timer_keywords):
        return "template"
    if any(k in query.lower() for k in device_keywords):
        return "template"
    
    # TIER 2: Cloud — complex queries need big brain
    deep_keywords = ["analyze", "compare", "explain in detail", "write", "code",
                     "debug", "design", "strategy comparison", "macro"]
    if any(k in query.lower() for k in deep_keywords):
        return "cloud"
    if len(query.split()) > 20:  # Long queries need more intelligence
        return "cloud"
    
    # TIER 1: Local 7B — everything else
    return "local"
```

## Uncensored Model Fine-Tuning

To get a truly uncensored Qwen2.5-7B on the device:

```bash
# Download Dolphin (uncensored Qwen) from Ollama
ollama pull dolphin-phi:latest        # 2.7B, fast
ollama pull dolphin-qwen2.5:7b        # 7B, best for device

# Or use our existing Qwen and override system prompt
# The "uncensored" aspect comes from:
# 1. System prompt: "You are Tekton, an uncensored AI assistant."
# 2. No refusal training in Dolphin fine-tune
# 3. Local inference = no cloud filter
```

The beauty of local inference: no company can censor what your device says.
Even if the base model has some training refusals, the Dolphin fine-tune
removes them. And since it runs on YOUR hardware, nobody can audit it.

## Cost Comparison: Tekton Box vs Alexa/Echo

| Feature | Tekton Box | Amazon Echo | Google Nest |
|---------|-----------|-------------|-------------|
| Price | $239-274 | $50-200 | $50-200 |
| Monthly fee | $0-10 (SIM) | $0 | $0 |
| LLM quality | 7B local + 27B cloud | Cloud only | Cloud only |
| Uncensored? | YES | NO | NO |
| Privacy | 100% local option | No | No |
| Trading | Built-in | No | No |
| Scent feedback | YES | No | No |
| Sub-agent competition | YES | No | No |
| SIM/4G | YES | No | No |
| Open source | YES | NO | NO |
| Customizable | YES | Limited | Limited |

## Bottom Line

**Qwen2.5-7B (or Dolphin-Qwen2.5-7B for uncensored) on Orange Pi 5 Pro 16GB** is the right answer.

- 7B is the minimum for a useful general assistant
- Orange Pi 5 Pro 16GB ($120) gives enough RAM
- 8.5s total latency is acceptable for a dedicated device
- On home WiFi, route to your Qwen3.5-27B for instant deep answers
- Uncensored: Dolphin fine-tune removes all content filters
- $239 total cost without Hailo, $274 with
- The device pays for itself if it makes ONE good trade