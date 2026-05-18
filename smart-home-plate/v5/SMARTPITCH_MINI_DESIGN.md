# SmartPitch Mini — Connected Training Pitching Machine

## Product Vision
A small, portable, WiFi-connected pitching machine that throws lightweight training balls
(whiffle balls, foam balls, or similar) at game-equivalent speeds. Integrates with the
SmartHome Plate app to create a complete training loop: the app commands the pitch,
the machine throws it, and the plate measures whether it was accurate.

## Why Small First
- Nobody else is making a smart, connected, small pitching machine
- Lower price point ($199-299 vs $1,500+ for regulation machines)
- Bigger market: backyard, garage, basement, indoor facility
- Safer training (no 90mph baseballs breaking windows or bones)
- Perfect complement to the SmartHome Plate
- The plate's radar measures the machine's accuracy and auto-calibrates

## Key Specs

| Spec | Value |
|------|-------|
| Ball type | 2.5" whiffle / foam training balls |
| Ball weight | 0.3-0.7 oz (vs 5oz baseball) |
| Speed range | 20-65 mph (equivalent to 40-130 mph at 60') |
| Pitch types | Fastball, curveball, slider, changeup, knuckleball |
| Accuracy | ±3" at 25 feet after calibration with plate |
| Distance | Designed for 15-35 feet from batter |
| Battery | Rechargeable Li-ion, 4+ hours or 300+ pitches |
| AC option | 12V DC power supply (included) |
| WiFi | ESP32, connects to SmartHome Plate app |
| Weight | 6-8 lbs |
| Dimensions (operating) | 14" x 10" x 10" |
| Dimensions (stored) | 14" x 10" x 5" (foldable) |
| Hopper capacity | 12 balls |
| Price | $249 MSRP |

## Distance & Reaction Time Equivalency

The machine is designed for 15-35 foot distances. The app adjusts speed to simulate
any game-speed pitch at these shorter distances:

| Desired Game Speed | Distance | Machine Speed | Reaction Time |
|-------------------|----------|--------------|---------------|
| 95 mph fastball | 60'6" | — | 0.43 sec |
| 95 mph equivalent | 30' | 47 mph | 0.43 sec |
| 95 mph equivalent | 20' | 31 mph | 0.43 sec |
| 75 mph curveball | 60'6" | — | 0.55 sec |
| 75 mph equivalent | 30' | 37 mph | 0.55 sec |
| 75 mph equivalent | 20' | 25 mph | 0.55 sec |

The app lets you set "Real Speed" and "Distance" and it calculates the
machine speed to give the correct reaction time.

## How Pitch Types Work

Two rubber wheels spinning in opposite directions grip and throw the ball.
Pitch movement comes from wheel speed DIFFERENTIAL:

| Pitch Type | Top Wheel | Bottom Wheel | Result |
|-----------|-----------|--------------|--------|
| Fastball | 100% | 100% | Straight, high speed |
| Curveball | 70% | 100% | Topspin, ball drops |
| Slider | 100% | 70% | Sidespin, ball moves laterally |
| Changeup | 55% | 65% | Slower, slight fade |
| Knuckle | 50% | 50% | Minimal spin, erratic movement |

For more advanced movement, a 3-wheel design adds a horizontal axis:
| Pitch Type | Top | Bottom-L | Bottom-R | Movement |
|-----------|-----|---------|----------|----------|
| Fastball | 100% | 100% | 100% | Straight |
| Curveball | 70% | 100% | 100% | Drop |
| Slider | 100% | 70% | 100% | Side move |
| Cutter | 100% | 100% | 70% | Other side move |
| Screwball | 100% | 100% | 70% | Opposite horizontal |

Decision: Start with 2-wheel design for cost, add 3-wheel as Pro upgrade.

## Hardware — BOM Estimate

| Component | Unit Cost | Notes |
|-----------|----------|-------|
| 2x DC motors (24V, 5000 RPM) | $8 | Brushed, with encoder feedback |
| 2x Rubber throwing wheels (6") | $4 | Polyurethane, quiet |
| ESP32-S3 module | $3 | Same platform as SmartHome Plate |
| Motor driver (2x H-bridge) | $4 | DRV8871 or similar |
| Ball feeder servo | $2 | MG996R or similar |
| Li-ion battery pack (3S, 2200mAh) | $12 | 11.1V, 4+ hours runtime |
| BMS + charging circuit | $3 | TP4056 or similar |
| 12V power supply (AC adapter) | $3 | For indoor/extended use |
| ABS plastic housing (injected) | $4 | Two-piece clamshell |
| Ball hopper (removable) | $2 | Holds 12 balls, gravity feed |
| Adjustable legs (foldable) | $2 | Two angle positions |
| 12 whiffle training balls | $2 | 2.5" diameter, plastic |
| Misc (wiring, fasteners, packaging) | $4 | |
| **Total BOM** | **~$48** | |
| MSRP | **$249** | ~5x markup |

## Auto-Calibration with SmartHome Plate

This is the killer feature that no other pitching machine has:

1. App sends command: "Throw a slider at 45 mph, low and outside"
2. Machine throws the ball
3. SmartHome Plate (60 feet away or 20 feet away) measures the ACTUAL pitch:
   "That was 43 mph, 8" horizontal break, medium outside — close but 3 mph slow"
4. Machine adjusts: top wheel +3%, bottom wheel +2%
5. Next throw is closer to the target
6. Over 20-30 calibration throws, the machine learns exactly what settings
   produce each pitch type at each location
7. Calibration data is saved in the app and synced to the machine
8. Results: ±2" accuracy at 25 feet after auto-calibration

Without the plate, the machine is still a great pitching machine.
With the plate, it becomes the most accurate pitching machine at any price point.

## App Integration

### Pitch Command Screen
```
┌─────────────────────────────────┐
│  SmartPitch MINI   ● CONNECTED  │
│  Distance: 25 ft  ●●●           │
├─────────────────────────────────┤
│                                 │
│  ── Call a Pitch ──             │
│                                 │
│  ┌───────┐ ┌───────┐ ┌──────┐ │
│  │  4S   │ │  2S   │ │ CUT  │ │
│  │FASTBALL│ │FASTBALL│ │CUTTER│ │
│  └───────┘ └───────┘ └──────┘ │
│  ┌───────┐ ┌───────┐ ┌──────┐ │
│  │ CURVE │ │ SLIDER│ │CHANGE│ │
│  │ BALL  │ │       │ │ UP   │ │
│  └───────┘ └───────┘ └──────┘ │
│  ┌───────┐ ┌───────┐          │
│  │  SINK │ │ KNUCK │          │
│  │  ER   │ │  LE   │          │
│  └───────┘ └───────┘          │
│                                 │
│  Speed: ═══════●═════ 45 mph    │
│  Location: ● Low-Outside        │
│                                 │
│  ┌─────────────────────────┐    │
│  │   THROW PITCH           │    │
│  └─────────────────────────┘    │
│                                 │
│  Auto-Feed: ON (1 pitch/8 sec) │
│  Last throw: 43 mph, 8" break  │
│  Accuracy: 94% (23/24 on target)│
└─────────────────────────────────┘
```

### Training Modes

**Live BP** — Select pitch type and location, machine throws on your command.
**Auto-Feed** — Machine throws a sequence (e.g., 10 fastballs, then 5 curves).
**Random Mix** — Machine throws random pitch types (simulates live pitching).
**Count Simulation** — Machine calls balls and strikes using the plate's zone data.
**Drill Mode** — "Throw me 20 low-away sliders" and track your hitting results.
**Calibration** — Machine throws 10 pitches, plate measures, machine adjusts settings.

### Combined with Hitting Lab

When the SmartHome Plate detects the machine is connected AND hitting mode is on:

1. App commands machine: "Throw a slider, low and away"
2. Machine throws
3. Plate measures: "That was a slider, 82mph equivalent, 10" break, low-outside"
4. App confirms: "Good pitch!"
5. Batter swings, Hitting Lab records exit velocity, angle, etc.
6. App links them: "You hit that slider at 92mph, pulled. Against sliders today:
   avg EV 89, pull tendency 70%, barrel rate 40%"

This closed loop doesn't exist anywhere else in the market.

## Product Line

| Product | Price | Includes |
|---------|-------|----------|
| SmartHome Plate v3 | $649-999 | Plate, sensor pod, charger, app |
| Hitting Kit | $149 | Tee arm, bracket, contact mic |
| **SmartPitch Mini** | **$249** | **Machine, 12 balls, AC adapter, app** |
| Plate + Mini Bundle | $799-1,149 | Both products, $100 savings |
| Full Training System | $1,050-1,300 | Plate + Hitting Kit + Mini |

## Competition Analysis

| Product | Price | Connected? | App? | Measures accuracy? | Throws whiffle? |
|---------|-------|-----------|------|--------------------|-----------------|
| Jugs Lite-Flite | $249 | No | No | No | Yes |
| Jugs BP2 | $1,600 | No | No | No | Yes (baseballs) |
| Hack Attack | $2,300 | No | No | No | Yes (baseballs) |
| Sports Tutor | $500-900 | No | No | No | Varies |
| **SmartPitch Mini** | **$249** | **Yes** | **Yes** | **Yes (with plate)** | **Yes** |

Nobody is doing connected + app + accuracy measurement. This is the gap.

## Next Steps

1. Validate interest: Survey SmartHome Plate customers about a pitching machine
2. Prototype: Build first unit with 2-wheel design + ESP32 + app control
3. Test accuracy: Measure pitch consistency with SmartHome Plate at 25 feet
4. Iterate: Add 3rd wheel if movement types need it
5. Safety testing: Verify whiffle balls don't exceed safe energy limits
6. FCC/CE certification for WiFi device
7. Target launch: Q2 2026 alongside v4 Hitting Lab