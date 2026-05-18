# SmartHome Plate™

**The world's smartest strike zone.** A ruggedized, impact-rated smart device shaped like official home plate that detects pitches, calls balls and strikes, records in HD, and turns pitching practice into an arcade-style competitive experience.

---

## Quick Links

| Document | Description |
|---|---|
| [Design Specification](docs/DESIGN_SPEC.md) | Full product design, dimensions, features, game modes |
| [Engineering Analysis](docs/ENGINEERING_ANALYSIS.md) | Impact forces, structural calcs, thermal analysis, sensor accuracy |
| [Bill of Materials](docs/BOM.md) | Complete parts list with costs (~$931 materials) |
| [Assembly Guide](docs/ASSEMBLY_GUIDE.md) | Step-by-step build instructions (16 steps) |
| [Firmware Architecture](firmware/ARCHITECTURE.md) | ESP32 + Jetson software design, impact detection, LED effects |

---

## CAD Files (OpenSCAD)

All parametric 3D models are in `cad/`:

| File | Part | Manufacturing |
|---|---|---|
| `cad/parameters.scad` | Shared design parameters | — |
| `cad/assembly.scad` | Full assembly model | — |
| `cad/parts/base_plate.scad` | Aluminum base plate | CNC mill |
| `cad/parts/top_plate.scad` | Aluminum top plate | CNC mill |
| `cad/parts/front_panel.scad` | Polycarbonate front panel | CNC router |
| `cad/parts/side_panel_left.scad` | Polycarbonate left side | CNC router |
| `cad/parts/side_panel_right.scad` | Polycarbonate right side | CNC router |
| `cad/parts/rear_panel_left.scad` | Polycarbonate left diagonal | CNC router |
| `cad/parts/rear_panel_right.scad` | Polycarbonate right diagonal | CNC router |
| `cad/parts/electronics_tray.scad` | PETG electronics tray | 3D print |
| `cad/parts/adjustable_foot.scad` | Telescoping leg assembly | CNC mill + assemble |
| `cad/parts/display_mount.scad` | PETG display frame | 3D print |

### To Export for Manufacturing

1. Install [OpenSCAD](http://www.openscad.org/) (free, open-source)
2. Open any `.scad` part file
3. Press **F6** (Render)
4. File → Export:
   - **STL** — For 3D printing (electronics tray, display mount)
   - **DXF** — For CNC cutting (panels, plates) — *or use pre-generated DXFs below*

---

## CNC-Ready DXF Files (Generated)

Ready-to-send to a CNC shop or laser cutter:

| File | Part | Material | Process |
|---|---|---|---|
| `cnc/base_plate.dxf` | Base plate | 1/4" 6061-T6 Aluminum | CNC 3-axis mill |
| `cnc/top_plate.dxf` | Top plate | 1/4" 6061-T6 Aluminum | CNC 3-axis mill |
| `cnc/front_panel.dxf` | Front panel | 3/8" Polycarbonate (Lexan) | CNC router |
| `cnc/side_panel_left.dxf` | Left side | 3/8" Polycarbonate | CNC router |
| `cnc/side_panel_right.dxf` | Right side | 3/8" Polycarbonate | CNC router |
| `cnc/rear_panel_left.dxf` | Left diagonal | 3/8" Polycarbonate | CNC router |
| `cnc/rear_panel_right.dxf` | Right diagonal | 3/8" Polycarbonate | CNC router |

### DXF Layer Guide

| Layer | Color | Content | Use |
|---|---|---|---|
| CUT | Red (1) | Outer profiles, through-holes | Cut path |
| REFS | Green (3) | Sensor positions, references | Do not cut — assembly aids |
| CENTER | Blue (5) | Hole center marks | Drill start points |
| DIMS | Yellow (2) | Dimensions, notes | Reference only |
| ENGRAVE | White (7) | Engraved text/lines | Optional engraving |

### Regenerating DXFs

```bash
python3 gen_dxf.py --output-dir cnc/
```

---

## Key Design Decisions

### Material: Polycarbonate, NOT Acrylic/Plexiglass
This is the single most important design decision. A 100mph baseball delivers **~145 Joules** of kinetic energy. Acrylic (plexiglass) has an impact strength of only 0.4 ft-lb/in and **will shatter into dangerous shards**. Polycarbonate (Lexan) has an impact strength of 15+ ft-lb/in — **37× stronger** — and flexes to absorb the impact, returning to shape. It's used in bulletproof glass and riot shields.

### Impact Detection: Piezoelectric Film Sensors, NOT Mechanical Switches
LED press-button switches will be destroyed by 100mph impacts (~6,500N peak force). Piezo film sensors (PVDF) have **no moving parts**, cost $0.75 each, and flex with the panel. They also enable **acoustic triangulation** — using 4 sensors per panel, we can locate the exact impact point to ±1 cm accuracy, enabling the "illuminate precisely where the ball touches" feature.

### Strike Zone: Software-Defined + Adjustable Legs
Rather than a fixed-height box that only works for one player size, the SmartHome Plate uses:
1. **Adjustable telescoping legs** (3 positions: Little League, High School, Pro)
2. **LED matrix zones** — only the active strike zone rows illuminate
3. **Auto-detect** — the wide-angle camera uses ML pose estimation (MoveNet) to detect the batter's knees and shoulders and automatically calculate the correct zone height

This means one device works for a 10-year-old Little Leaguer AND a 6'3" college pitcher.

---

## Specifications

| Spec | Value |
|---|---|
| Footprint | Official home plate (17" front × 8.5" sides × 12" diagonals) |
| Body height | 24" (adjustable to 26"/29"/32" with legs) |
| Weight | ~20 lbs (without battery) |
| Impact rating | Withstands repeated 105+ mph baseball impacts |
| Panels | 3/8" UV-hardcoated polycarbonate (Lexan) |
| Frame | 1/4" 6061-T6 aluminum, bead-blasted, anodized |
| Display | 5" IPS, 800×480, 1000 nits (daylight-readable) |
| Cameras | 4K wide-angle + 120fps global shutter |
| Radar | 60GHz FMCW (speed, spin rate) |
| LEDs | ~4,200 WS2812B NeoPixels, individually addressable |
| Impact detection | 20× piezo film sensors, ±1cm accuracy |
| Battery | 6× 21700 Li-Ion, 4-6 hour runtime |
| Wireless | WiFi 6 + Bluetooth 5.2 |
| Compute | Jetson Orin Nano (Pro) or RPi CM4 (Standard) |
| Weatherproofing | IP54 (rain resistant) |
| Price | $899 (Standard) / $1,299 (Pro) / $1,499 (Pro+) |

---

*SmartHome Plate™ — Design Package v1.0*