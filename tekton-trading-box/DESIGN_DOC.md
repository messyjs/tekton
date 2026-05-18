# TEKTON TRADING BOX — Product Design Document v1

## Concept

A portable, voice-activated AI trading assistant with olfactory feedback.
Ask it "Hey Tekton, what's the best trade right now?" and it speaks back
a concise setup while spraying Givenchy Pi (bullish) or foul spray (bearish)
based on USDT.D market bias. Sub-agents compete for best strategy.
Director agent picks the winner.

```
┌──────────────────────────────────────────────────────────┐
│  TEKTON TRADING BOX                                       │
│                                                           │
│  ┌─────────┐   ┌──────┐   ┌────────┐   ┌──────────────┐ │
│  │ Mic     │   │ Pi 5 │   │ Speaker │   │ Scent System │ │
│  │ Array   │──▶│ 8GB  │──▶│ 3W     │──▶│ Pi / Fart    │ │
│  └─────────┘   └──┬───┘   └────────┘   └──────────────┘ │
│                   │                                       │
│  ┌─────────┐   ┌──┴───┐   ┌────────┐   ┌──────────────┐ │
│  │ 4G SIM  │   │ LLM  │   │ Screen │   │ GPIO Control│ │
│  │ 7600    │──▶│Engine│──▶│ 3.5"   │   │ Solenoids   │ │
│  └─────────┘   └──────┘   └────────┘   └──────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Battery 10,000mAh │ USB-C PD │ WiFi 6              │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Target Price: $149 (parts) / $249 retail

## Hardware BOM

| # | Component | Model | Cost | Source | Notes |
|---|-----------|-------|------|--------|-------|
| 1 | SBC | Raspberry Pi 5 8GB | $80 | rpilocus | Main brain |
| 2 | MicroSD | 64GB A2 U3 | $8 | Amazon | OS + models |
| 3 | Mic Array | ReSpeaker 2-Mics HAT | $15 | Seeed | Voice input + wake word |
| 4 | Speaker | 3W 4Ω small driver | $5 | DigiKey | Voice output |
| 5 | Amp | MAX98357A I2S | $3 | Adafruit | Speaker driver |
| 6 | Scent Valve 1 | 12V solenoid micro valve | $5 | Amazon | Givenchy Pi (bullish) |
| 7 | Scent Valve 2 | 12V solenoid micro valve | $5 | Amazon | Fart spray (bearish) |
| 8 | Scent Canister 1 | 10ml vial + wick | $4 | Custom | Givenchy Pi refill |
| 9 | Scent Canister 2 | 10ml vial + wick | $4 | Custom | Liquid Ass refill |
| 10 | MOSFET Driver | 2x IRLZ44N + flyback diodes | $2 | DigiKey | Drive solenoids from 3.3V GPIO |
| 11 | 4G Module | SIM7600CE-T (Cat-4) | $25 | AliExpress | SIM card data slot |
| 12 | SIM Slot | Nano SIM holder | $1 | DigiKey | Hot-swappable |
| 13 | Display | 3.5" IPS 480x320 SPI | $18 | Amazon | Dashboard view |
| 14 | Battery | 3x 18650 3500mAh holder | $12 | Amazon | ~10,500mAh, 6hr runtime |
| 15 | BMS | TP4056 + DW01A protection | $2 | Amazon | Charge/discharge protection |
| 16 | USB-C PD | USB-C connector + CH224K | $3 | Amazon | 5V/3A charging |
| 17 | Case | 3D printed PETG | $8 | Custom | Portable, ~5"x3"x1.5" |
| 18 | Antenna | SMA pigtail + 4G antenna | $3 | AliExpress | SIM7600 external |
| 19 | Headers | 2x20 GPIO header + ribbon | $3 | Amazon | Pi 5 GPIO |
| 20 | Misc | Wires, screws, heat sinks, fan | $5 | Assorted | |
| **TOTAL** | | | **$213** | | |

### Cost Reduction Path
- Volume: Pi 5 CM5 variant at $40, custom PCB at $10 → $120 BOM at 1K units
- Pi Zero 2W ($15) for budget model (cloud LLM only, no local inference)
- Orange Pi 5 8GB ($65) saves $15 vs Pi 5

## Software Architecture

### Stack

```
┌─────────────────────────────────────────────────┐
│                  Voice Pipeline                   │
│  Wake Word → VAD → STT → LLM → TTS → Speaker    │
│  (Porcupine) (WebRTC) (Whisper) (Qwen) (Piper)   │
├─────────────────────────────────────────────────┤
│              Trading Engine Layer                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Gann │ │ ICT  │ │ Casp │ │ Geo  │ │ Quant │   │
│  │Agent │ │Agent │ │Agent │ │Agent │ │Agent  │   │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘   │
│     └─────────┴────────┴────────┴────────┘       │
│                    │                              │
│              Director Agent                        │
│    (picks best strategy by win rate + confidence) │
├─────────────────────────────────────────────────┤
│              Data Layer                           │
│  ccxt (Binance/Bybit) + USDT.D (TradingView)     │
│  Indicator library: ta-lib, pandas-ta            │
│  P03 Contraction/Expansion → order type selection │
├─────────────────────────────────────────────────┤
│              Scent Controller                     │
│  GPIO 17 → MOSFET → Solenoid 1 (Givenchy Pi)     │
│  GPIO 27 → MOSFET → Solenoid 2 (Fart Spray)      │
│  USDT.D > 0.5% up in 4H → BEARISH → Fart spray   │
│  USDT.D > 0.5% down in 4H → BULLISH → Givenchy   │
├─────────────────────────────────────────────────┤
│              Dashboard (Web UI)                   │
│  Trade log, strategy stats, sub-agent leaderboard│
│  Experimental stats: time-of-day win rate, etc.   │
│  Available on device screen + LAN browser         │
├─────────────────────────────────────────────────┤
│              Connectivity                         │
│  WiFi 6 (primary) + 4G SIM (fallback/mobile)     │
│  Bluetooth (headphones, config)                   │
└─────────────────────────────────────────────────┘
```

### LLM Strategy: Hybrid Local + Cloud

**Local (on Pi 5):**
- Qwen2.5-1.5B-Q4_K_M via llama.cpp (~900MB)
- Handles: wake word responses, simple queries, system status
- Latency: ~2-3 seconds on Pi 5 8GB
- Used for: "Hey Tekton" recognition, short confirmations, scent triggers

**Cloud (via 4G/WiFi):**
- DeepSeek-V3 or Gemini Flash for deep analysis
- Handles: multi-chart analysis, strategy comparison, trade reasoning
- Used for: "What's the best trade setup right now?"
- Fallback: if no internet, local model gives simpler answers

**Voice Pipeline:**
1. **Wake Word**: "Hey Tekton" via Porcupine (custom wake word, $0 for dev)
2. **STT**: Whisper tiny.en (~75MB) for transcription
3. **LLM**: Routes to local or cloud based on query complexity
4. **TTS**: Piper TTS (fast, local, ~30MB per voice)
5. **Output**: "BTC Breakout trade, stop limit Long at $60,000, SL $59,990, TP $60,200"

### Sub-Agent Competition System

Each sub-agent is a Python class implementing the same interface:

```python
class TradingAgent:
    name: str
    strategy: str
    win_rate: float
    total_trades: int
    pnl: float

    def analyze(self, market_data, indicators) -> TradeSetup:
        """Return a trade setup or None if no edge."""

    def evaluate(self, trade_result) -> dict:
        """Learn from trade outcome."""
```

**Registered Sub-Agents:**

| Agent | Strategy | Indicators | Specialty |
|-------|----------|------------|-----------|
| Gann | W.D. Gann SQ9 | Price at natural squares, planetary | Reversal timing |
| ICT | Inner Circle Trader | Order blocks, FVG, liquidity | Entry precision |
| Casper | Jayson Casper | Trend structure, EMA ribbons | Trend following |
| Geo | Trader Geo | Volume profile, POC, VAH/VAL | Range trading |
| Quant | Statistical | Z-score, correlation, mean reversion | Statistical edge |
| Momentum | Breakout | P03 contraction/expansion, BB squeeze | Breakout trades |
| MeanRev | Mean Reversion | RSI extremes, Bollinger bounce | Counter-trend |

**Director Agent Logic:**
```python
def select_best_agent(agents: list[TradingAgent], market_context: dict) -> TradingAgent:
    """
    Weight recent performance more heavily.
    Factor in market regime (trending vs ranging).
    Minimum 10 trades before qualifying.
    """
    # Score = win_rate * 0.4 + sharpe * 0.3 + regime_fit * 0.3
    # Regime fit: trending market → prefer momentum/trend agents
    #             ranging market → prefer mean reversion/Geo agents
```

### USDT.D Bias → Scent Mapping

```python
async def update_scent_bias():
    """Spray based on USDT.D 4H change."""
    usdt_d = await fetch_usdt_dominance()  # from Binance or TradingView
    prev = usdt_d_4h_ago
    change_pct = (usdt_d - prev) / prev * 100

    if change_pct > 0.5:    # USDT.D rising = money leaving crypto
        trigger_scent("bearish")  # fart spray, 0.5 second puff
        bias = "BEARISH"
    elif change_pct < -0.5:  # USDT.D falling = money entering crypto
        trigger_scent("bullish")  # Givenchy Pi, 0.5 second puff
        bias = "BULLISH"
    else:
        bias = "NEUTRAL"  # no spray

    return bias
```

**Scent duration**: 0.3-0.5 second puff (one spray = ~0.05ml). Canister lasts ~200 puffs.
**Frequency**: Check every 15 minutes, spray on CHANGE of bias (not every check).

### Trade Setup Format (Voice Output)

The LLM must respond with this exact structure when asked for a trade:

```
{SYMBOL} {TYPE} trade, {ORDER_TYPE} {DIRECTION} at ${ENTRY}, SL ${STOP} TP ${TARGET}
```

Examples:
- "BTC breakout trade, stop limit long at $60,000, SL $59,990, TP $60,200"
- "ETH reversal trade, limit short at $2,400, SL $2,430, TP $2,340"
- "SOL momentum trade, stop limit long at $150, SL $148, TP $158"

No lengthy explanations by default. "Hey Tekton, explain" for full reasoning.

### Dashboard Stats

**Standard Stats:**
- Win rate, P&L, total trades, Sharpe ratio, max drawdown
- Per-agent win rate, P&L, trade count
- Current bias (bullish/bearish/neutral)
- Active trade setups with entry/SL/TP

**Experimental Stats (tracked, can be toggled):**
- Time-of-day win rate (6h buckets: Asia, London, NY, Overnight)
- Day-of-week win rate
- Contraction→expansion win rate (using P03 indicator)
- USDT.D cross win rate (bias flip → trade result)
- Scent accuracy (% of times scent matched profitable direction)
- Agent regime accuracy (% of times director picked right agent for regime)
- Holding period analysis (win rate by minutes held)
- Volatility regime win rate (low/normal/high VIX equivalent)
- First hour vs last hour win rate
- Pre/post-news event win rate

### Backtesting Integration

The experimental stats above should be backtestable:

```python
class ExperimentalBacktester:
    def backtest_time_of_day(self, trades, bucket_hours=6):
        """Split trades into time buckets, compute win rates."""
        buckets = {}
        for trade in trades:
            hour = trade.timestamp.hour
            bucket = f"{(hour // bucket_hours) * bucket_hours:02d}-{((hour // bucket_hours) * bucket_hours + bucket_hours):02d}h"
            buckets.setdefault(bucket, []).append(trade)
        return {k: {"win_rate": win_rate(v), "count": len(v)} for k, v in buckets.items()}

    def backtest_scent_accuracy(self, trades, usdt_d_history):
        """Did the scent prediction match trade outcome?"""
        # For each trade, check if the bias at entry time matched the result
        correct = 0
        for trade in trades:
            bias = get_bias_at_time(trade.timestamp, usdt_d_history)
            if bias == "BULLISH" and trade.pnl > 0: correct += 1
            elif bias == "BEARISH" and trade.pnl < 0: correct += 1
        return correct / len(trades)
```

### P03 Integration

The contraction/expansion indicator you already built determines order type:
- Contraction detected → sub-agents look for breakout setups (stop limit orders)
- Expansion detected → sub-agents look for pullback setups (limit orders)
- Order type is included in the voice trade setup

### Python Indicator Selection

Users create a `strategy.yaml` file:

```yaml
# User's custom indicator config
name: "My Custom Strategy"
description: "Gann levels + P03 squeeze + volume profile"
indicators:
  - name: gann_sq9
    params:
      anchor: 92000
      current: 104500
  - name: usdt_dominance
    timeframe: 4H
    threshold: 0.5
  - name: p03_contraction
    bb_length: 20
    bb_stddev: 2.0
    kc_mult: 1.5
  - name: volume_profile
    lookback: 30
    num_bins: 24
  - name: ema_ribbon
    periods: [8, 21, 55]
agents:
  - gann    # Uses Gann SQ9 levels for entry
  - ict     # Uses order blocks for precision entry
  - momentum # Uses P03 contraction for breakout direction
scent_threshold: 0.5  # USDT.D % change to trigger scent
```

The Python engine loads this config, fetches data via ccxt, computes indicators,
and feeds results to each sub-agent for analysis.

## Prototype Build Plan

### Phase 1: Software Prototype (Week 1-2) — $0 additional
- Run on existing PC/laptop
- Use existing TradingView MCP for data
- Reuse PI Agent engines (Gann, Fib, GLM)
- Reuse TradingAgents framework for sub-agents
- Add P03 indicator logic from the .pine file
- Add USDT.D bias tracking
- Add Director agent with scoring
- Simulate scent commands (print "PIFF Pi!" or "PIFF Fart!" to console)
- Add trade tracking dashboard to existing Tekton dashboard
- Add experimental stats tracking

### Phase 2: Voice + Scent Hardware (Week 3-4) — ~$60
- Pi 5 8GB + ReSpeaker HAT + speaker + amp
- 2x solenoid valves + MOSFET drivers
- 3D printed bench prototype (no battery, no SIM yet)
- Install Pi OS, llama.cpp, Whisper, Piper TTS
- Port software from Phase 1 to Pi 5
- Test wake word, voice pipeline, scent triggers

### Phase 3: Portable Build (Week 4-5) — ~$100 more
- Add battery + BMS + USB-C charging
- Add SIM7600 module for mobile data
- Add 3.5" display for dashboard
- Design final case (PETG 3D print)
- Field test at actual trading desk

### Phase 4: Production (Month 2+) — Cost optimization
- Custom PCB replacing breadboard
- CM5 compute module for lower BOM
- Injection molded case at 1K+ units
- FCC/CE certification
- Retail packaging

## Directory Structure

```
tekton-trading-box/
├── hardware/
│   ├── bom.md                    # Full bill of materials
│   ├── wiring/
│   │   ├── schematic.pdf         # KiCad schematic
│   │   └── gpio-map.md           # GPIO pin assignments
│   ├── cad/
│   │   ├── case-v1.scad          # 3D printed case
│   │   └── scent-module.scad     # Scent canister holder
│   └── assembly-guide.md
├── firmware/
│   ├── scent_controller.py       # GPIO solenoid driver
│   ├── voice_pipeline.py         # Wake word → STT → LLM → TTS
│   ├── market_bias.py            # USDT.D tracking + scent trigger
│   └── system_monitor.py         # Battery, temp, connectivity
├── software/
│   ├── agents/
│   │   ├── base_agent.py         # TradingAgent interface
│   │   ├── gann_agent.py         # W.D. Gann SQ9 strategy
│   │   ├── ict_agent.py          # ICT order blocks strategy
│   │   ├── casper_agent.py       # Trend following strategy
│   │   ├── geo_agent.py          # Volume profile strategy
│   │   ├── quant_agent.py        # Statistical mean reversion
│   │   ├── momentum_agent.py     # P03 breakout strategy
│   │   ├── meanrev_agent.py      # RSI/Bollinger reversal
│   │   └── director.py           # Picks best agent per regime
│   ├── indicators/
│   │   ├── p03_contraction.py    # P03 indicator logic (from .pine)
│   │   ├── usdt_dominance.py     # USDT.D bias tracker
│   │   ├── gann_sq9.py           # Square of 9 levels
│   │   └── ta_loader.py          # Load user's strategy.yaml
│   ├── voice/
│   │   ├── wake_word.py           # "Hey Tekton" detection
│   │   ├── trade_voice.py         # Format trade as speech
│   │   └── llm_router.py          # Local vs cloud LLM routing
│   ├── dashboard/
│   │   ├── trade_log.html        # Active trade history
│   │   ├── agent_leaderboard.html # Sub-agent competition
│   │   ├── experimental_stats.html # Time-of-day, scent accuracy
│   │   └── api_server.py         # REST + WS for dashboard
│   ├── backtesting/
│   │   ├── engine.py              # Backtest framework (reuse TradingAgents)
│   │   └── experimental.py       # Backtest experimental stats
│   └── config/
│       ├── strategy.yaml          # User indicator + agent config
│       └── device.yaml            # Hardware, WiFi, SIM config
├── tests/
│   ├── test_agents.py
│   ├── test_scent_controller.py
│   ├── test_voice_pipeline.py
│   └── test_director.py
├── README.md
└── SETUP.md
```

## GPIO Pin Map (Raspberry Pi 5)

| GPIO | Function | Direction | Notes |
|------|----------|-----------|-------|
| 17 | Scent Valve 1 (Bullish) | OUT | MOSFET → 12V solenoid |
| 27 | Scent Valve 2 (Bearish) | OUT | MOSFET → 12V solenoid |
| 18 | I2S BCLK | OUT | MAX98357A speaker amp |
| 19 | I2S LRCLK | OUT | MAX98357A speaker amp |
| 21 | I2S DIN | OUT | MAX98357A speaker amp |
| 2 | I2C SDA | BIDI | ReSpeaker HAT |
| 3 | I2C SCL | OUT | ReSpeaker HAT |
| 4 | ReSpeaker IRQ | IN | Voice activity detection |
| 14 | UART TX | OUT | SIM7600 serial |
| 15 | UART RX | IN | SIM7600 serial |
| 22 | SIM7600 PWR | OUT | Power cycle SIM module |
| 9 | SPI MISO | IN | Display SPI |
| 10 | SPI MOSI | OUT | Display SPI |
| 11 | SPI SCLK | OUT | Display SPI |
| 8 | SPI CE0 | OUT | Display chip select |

## Scent System Design

### Mechanical

```
   ┌──────────┐   ┌──────────┐
   │ Givenchy │   │  Liquid  │
   │   Pi     │   │   Ass    │
   │  10ml    │   │  10ml    │
   └────┬─────┘   └────┬─────┘
        │              │
   ┌────▼─────┐   ┌────▼─────┐
   │Solenoid 1│   │Solenoid 2│
   │ 12V NC   │   │ 12V NC   │
   └────┬─────┘   └────┬─────┘
        │              │
        └──────┬───────┘
               │
          ┌────▼────┐
          │  Vent   │  ← small fan blows scent outward
          │  Fan    │
          └─────────┘
```

- **Normally Closed (NC)** solenoid valves: no power = no scent leakage
- 12V from boost converter (5V→12V Step-up, $2)
- 0.3 second pulse = one puff (~0.05ml)
- 10ml canister = ~200 puffs (3+ months at 2 puffs/day)
- Refill: unscrew canister, add fragrance with dropper
- Givenchy Pi: ~$40/50ml → $8 for 10ml (refill)
- Liquid Ass: ~$10/30ml → $3 for 10ml (refill)

### Safety
- Solenoids are NC — power failure = no spray
- Each canister has a one-way valve to prevent leaks
- Puff limit: max 1 puff per 15 minutes, max 12 per day
- No spray between 11PM-7AM (sleep mode)

## Tekton Core Integration

This directly extends the existing Tekton Agent platform:

1. **PI Agent**: Already built-in, Gann/Fib engines run as sub-agents
2. **Swarm System**: Director agent uses SwarmRoster, checkpoints for trade proof
3. **Voice Module**: Existing STT/TTS fallback chain, add Piper for local
4. **Dashboard**: Extend existing Tekton dashboard with trade tracking pages
5. **TradingAgents**: Reuse the multi-agent graph structure
6. **P03 Indicator**: Already built, port from Pine to Python
7. **USDT.D Tracking**: New module, feeds into bias engine
8. **Backtesting**: Extend TradingAgents backtesting with experimental stats

### What to Build vs What Exists

| Component | Status | Action |
|-----------|--------|--------|
| PI Agent engines | DONE | Use as-is for Gann/Fib sub-agents |
| TradingAgents graph | DONE | Wrap as sub-agent competitors |
| P03 indicator | Pine Script only | Port to Python (ta-lib/pandas-ta) |
| Voice pipeline | DONE (cloud) | Add local Whisper + Piper TTS |
| Dashboard | DONE | Add trade log, agent leaderboard, experimental stats |
| Scent controller | NEW | Build GPIO driver + solenoid circuit |
| Director agent | NEW (Swarm exists) | Build scoring + regime detection |
| USDT.D tracking | NEW | Build with ccxt |
| SIM7600 driver | NEW | PPP/serial connection manager |
| Trade tracking DB | NEW | SQLite for persistent trade history |

## Next Steps

1. **Start with Phase 1 (software)** — reuse existing Tekton + PI Agent + TradingAgents
2. **Port P03 to Python** — translate the Pine Script indicator logic
3. **Build Director agent** — scoring + regime detection using existing Swarm
4. **Add USDT.D bias tracker** — fetch from Binance via ccxt
5. **Add trade tracking dashboard** — extend Tekton dashboard
6. **Add experimental stats** — time-of-day, scent accuracy, regime accuracy
7. **Build scent controller** — GPIO driver + MOSFET circuit
8. **Build voice pipeline** — local Whisper + Piper TTS on Pi 5
9. **Hardware prototype** — Pi 5 + ReSpeaker + solenoids
10. **Portable build** — battery + SIM + case

## Questions / Decisions Needed

1. **Givenchy Pi vs other fragrance?** — Pi is thematically perfect (Pi = 3.14 = math = Gann). But there are cheaper alternatives (Drakkar Noir, etc.). Givenchy Pi ~$40/50ml.

2. **Fart spray brand?** — "Liquid Ass" is the standard. ~$10/30ml. "Fart Spray" by fart-spray.com also works.

3. **Local LLM model?** — Qwen2.5-1.5B is fast on Pi 5 (~2-3s). Phi-3-mini-4k is smarter but needs 4GB. Both fit on 8GB Pi 5.

4. **Cloud LLM?** — DeepSeek-V3 is cheapest for analytical quality. Gemini Flash free tier for budget.

5. **SIM carrier?** — T-Mobile IoT $10/mo, or Ting pay-per-MB for low usage.

6. **Screen or no screen?** — 3.5" SPI ($18) for standalone use, or phone-only via WiFi hotspot.

7. **Open source or commercial?** — Software open source (like Tekton), hardware plans published, pre-built units at $249.