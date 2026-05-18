# SmartHome Plate v2 — Redesigned for Cost & Functionality

## The Problem with v1

The v1 design was a **24" tall clear box** sitting on home plate. Problems:
- Too much material (5 full polycarbonate panels = $$)
- The strike zone isn't 24" tall — it's only ~17-24" of VERTICAL space
- Below the zone is just legs and air (not a target)
- Above the zone is just sensors (not a target)
- Big box = heavy = expensive to ship
- Clear panels are the #1 cost driver and aren't needed for function

## v2 Design Philosophy

**The strike zone is the ONLY thing the ball should hit. Everything else is structure.**

The device has 3 distinct zones vertically:

```
        ┌──────────────┐
        │  SENSOR POD  │  ← Cameras, radar, display, compute
        │  ( Protected )│  ← Small aluminum + armored windows
        └──────┬───────┘
               │
    ┌──────────┴──────────┐
    │                      │
    │   STRIKE ZONE       │  ← THE TARGET — thin panel
    │   TARGET PANEL       │     (ball can only hit HERE)
    │   17" × adjustable  │
    │   (15"-24" tall)     │
    │                      │
    └──────────┬──────────┘
               │
          ┌────┴────┐
          │  LEGS   │    ← Adjustable aluminum tube
          │  (4x)   │       Legs + home plate base
          │         │
       ───┴─────────┴─── Ground
```

## Key Changes from v1 → v2

| Aspect | v1 (Old) | v2 (New) | Savings |
|---|---|---|---|
| Target surface | 5 full polycarbonate panels (24" tall) | 1 thin strike zone panel + tiny sensor windows | ~$100 |
| Structure | 2 CNC aluminum plates + 5 panels | Aluminum tube frame + small sensor pod | ~$80 |
| Target material | 3/8" Lexan ($8/sq ft) | 1/4" aluminum or 3/8" UHMW ($3/sq ft) | ~$50 |
| Weight | ~20 lbs | ~10-12 lbs | Better portability |
| LEDs | ~4,200 (entire box) | ~600 (strike zone perimeter only) | ~$50 |
| Piezo sensors | 20 (4 per panel) | 16 (4 per zone face, 4 faces) | ~$3 |
| Camera windows | Full panel | 2 small armored windows (2" dia) | ~$20 |
| Display | Inside panel | On sensor pod (better angle, safer) | Same |

## Target Panel Material Options

### Option A: 1/4" Aluminum 5052-H32 (RECOMMENDED)
- **Cost**: ~$3/sq ft (vs $8 for polycarbonate)
- **Impact resistance**: Easily survives 105 mph. Aluminum 5052 is marine-grade, very ductile
- **Weight**: Lighter than the polycarbonate box
- **Finish**: Powder-coated, any color, looks professional
- **LED integration**: LEDs mounted on the FRONT surface behind a thin diffuser strip (like a LED hockey sign)
- **Impact detection**: Piezo sensors mounted on BACK side, ball hits the FRONT — sound propagates through aluminum at 6,320 m/s
- **Verdict**: ✅ Best cost/performance ratio

### Option B: 3/8" UHMW Polyethylene
- **Cost**: ~$5/sq ft
- **Impact resistance**: EXCELLENT — UHMW is what cutting boards and body armor are made of
- **Self-lubricating**: Ball deflects clean, no scuffing
- **Weight**: Light (floats on water)
- **Color**: Available in white, black, colors
- **Verdict**: ✅ Good alternative, slightly more expensive than aluminum

### Option C: 1/4" Polycarbonate (budget version of v1)
- **Cost**: ~$6/sq ft (reduced because much smaller panel)
- **Impact resistance**: Excellent, same as v1
- **Transparent**: Can see LEDs through it (neat visual effect)
- **Verdict**: ✅ If you want the "see the tech" look

### Option D: Composite (fiberglass + epoxy + aluminum honeycomb)
- **Cost**: ~$4/sq ft (custom layup)
- **Impact resistance**: Outstanding (used in race car bodies)
- **Weight**: Very light
- **Verdict**: ⚠️ More complex manufacturing, worth it at volume

## The Strike Zone Target Panel Design

The target panel is SHAPED LIKE HOME PLATE from above (pentagon), but is only a thin shell:

```
            ╱╲               Top view (home plate shape)
           ╱  ╲              But only 1/4" thick
          ╱    ╲
         ╱      ╲            ~17" across front
        �──────────            Target panel
        │ SENSOR │            sits on top of
        │  POD   │            the frame
        └────────┘
```

The target panel has:
- 5 faces (matching home plate shape) but they're THIN — not a box
- Each face is only about 15"-24" tall (adjustable = strike zone height)
- LED strips around the PERIMETER of the strike zone (top edge and bottom edge glow blue to show the zone)
- When ball hits, LEDs flash GREEN (strike on zone) or RED (ball, missed zone)
- Impact location tracked by 4 piezo sensors per face

## Sensor Pod (Top)

Small, rugged, sits on top of the strike zone:
- **Housing**: Powder-coated cast aluminum or 3D-printed nylon
- **Windows**: 2 small armored polycarbonate lenses (2" diameter) for cameras
- **Radar dome**: Small plastic dome (radar-transparent)
- **Display**: 5" screen on the FRONT face, angled slightly up toward pitcher
- **All electronics**: Protected inside the pod, not exposed to impact
- **The ball NEVER hits the sensor pod** (strikes are below the zone top)

## Frame & Legs

- **Frame**: 1" aluminum square tube, welded or bolted into home plate pentagon shape
- **4 legs**: Simple aluminum tubes with twist-lock height adjustment (like a tripod)
- **Home plate base**: Flat aluminum plate sits ON TOP of the real home plate, anchors the legs
- **Target panel mounts** to the frame with rubber-isolated brackets (vibration dampening)

## Cost Comparison

### v2 Pro (Aluminum Target) — TARGET COST

| Component | v2 Cost | v1 Cost | Notes |
|---|---|---|---|
| Target panel (aluminum) | $25 | $45 (polycarbonate) | Smaller + cheaper material |
| Frame (aluminum tube) | $15 | $85 (CNC plates) | Standard extrusion, not CNC'd |
| Sensor pod (cast/3D) | $10 | $0 (was in panels) | New addition but small |
| Armored windows | $10 | $0 (was full panel) | Small, targeted |
| Legs (4x aluminum tube) | $12 | $30 (5x telescoping) | Simpler, just 4 legs |
| Hardware | $15 | $25 | Simpler assembly |
| LEDs (~600) | $10 | $60 (4,200) | Only perimeter + impact |
| Piezo sensors (16) | $12 | $15 | Slightly fewer |
| Jetson Orin Nano | $250 | $250 | Same |
| ESP32-S3 (3x) | $15 | $25 | Fewer panels to control |
| Cameras (2) | $60 | $60 | Same |
| Radar module | $55 | $55 | Same |
| Display | $40 | $40 | Same |
| Battery | $50 | $50 | Same |
| 3D printed parts | $5 | $35 | Smaller, fewer |
| Misc wiring | $20 | $40 | Less wiring |
| **TOTAL** | **~$654** | **~$931** | **~$277 savings (30%)** |

### v2 Standard (UHMW Target) — Even Cheaper

**Target MSRP**: $749 (vs $899 Standard v1)
**Pro MSRP**: $999 (vs $1,299 Pro v1)

### v2 Budget (RPi CM4, no radar, basic LEDs)

| Removed/Downgraded | Savings |
|---|---|
| RPi CM4 instead of Jetson | -$200 |
| No radar module | -$55 |
| Basic LED strips (no matrix) | -$8 |
| Simpler display | -$15 |
| **Budget v2 total** | **~$376 materials** |
| **Budget MSRP** | **$599** |

## Manufacturing Comparison

| Process | v1 | v2 |
|---|---|---|
| CNC milling | 2 large aluminum plates | 0 (standard extrusion) |
| CNC routing | 5 polycarbonate panels | 1 small target panel |
| 3D printing | 9 parts | 3 parts (sensor pod, display mount, battery tray) |
| Welding/fabrication | None | Frame welding (or bolt-together) |
| Assembly time | ~2 hours | ~1 hour |
| Total parts | ~50 | ~30 |

## Key Insight: The Strike Zone is the Product

The v1 design was a **box**. The v2 design is a **target**. This is a fundamental shift:

- v1: "Here's a box that sits on home plate, and it happens to detect pitches"
- v2: "Here's a precision strike zone target that shows you EXACTLY where your pitch crossed the zone"

The target panel is the product. The frame holds it up. The sensor pod gives it brains. The user sees a sleek, professional training tool — not a big plastic box.

This also makes the "strike zone self-adjust" feature more intuitive:
- The TARGET PANEL physically moves up/down on the frame (or the LED boundaries shift)
- The panel is ONLY as tall as the strike zone — no wasted space
- When you set it for Little League, the panel is at Little League height
- The sensor pod slides up/down on the frame rail

## Durability Guarantee

Both material options survive 105+ mph:
- **Aluminum 5052**: Used in boat hulls, pressure vessels. Yield strength 193 MPa. A 1/4" plate at these dimensions easily absorbs the impact. The ball BOUNCES OFF with a satisfying ping.
- **UHMW**: Used in body armor, skate parks, hockey boards. Impact energy absorption is extraordinary. The ball bounces off with a dull thud. Never dents, never cracks.

Both are cheaper than polycarbonate AND more durable for this use case.