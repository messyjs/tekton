# SmartHome Plate™ — Bill of Materials

## Rev 1.0 — Prototype Build (5 units)

### Mechanical — CNC Machined Parts

| # | Part | Material | Qty | Source | Est. Cost |
|---|---|---|---|---|---|
| 1 | Base plate | 6061-T6 Aluminum, 1/4" | 1 | CNC shop | $35 |
| 2 | Top plate | 6061-T6 Aluminum, 1/4" | 1 | CNC shop | $40 |
| 3 | Front panel (A) | Polycarbonate, 3/8" UV-hardcoated | 1 | CNC router | $12 |
| 4 | Right panel (B) | Polycarbonate, 3/8" UV-hardcoated | 1 | CNC router | $7 |
| 5 | Right-diag panel (C) | Polycarbonate, 3/8" UV-hardcoated | 1 | CNC router | $8 |
| 6 | Left-diag panel (D) | Polycarbonate, 3/8" UV-hardcoated | 1 | CNC router | $8 |
| 7 | Left panel (E) | Polycarbonate, 3/8" UV-hardcoated | 1 | CNC router | $7 |
| 8 | Display window | Optically-clear PC, 3/16" | 1 | CNC router | $5 |

**Subtotal — CNC Parts: $122**

### Mechanical — Off-the-Shelf

| # | Part | Spec | Qty | Source | Est. Cost |
|---|---|---|---|---|---|
| 9 | Through rod | M8 SS 304 threaded rod, 700mm | 5 | McMaster | $8 |
| 10 | Hex nut | M8 SS, grade 8 | 10 | McMaster | $2 |
| 11 | Flat washer | M8 SS | 10 | McMaster | $2 |
| 12 | Leg outer tube | 1.5"×1.5"×0.125" Al 6063, 120mm | 5 | McMaster | $10 |
| 13 | Leg inner tube | 1.25"×1.25"×0.065" Al 6063, 250mm | 5 | McMaster | $8 |
| 14 | Spring detent pin | 3-position, 5mm, SS | 5 | McMaster | $15 |
| 15 | Rubber foot | 2" dia polyurethane, M6 stud | 5 | McMaster | $10 |
| 16 | EPDM gasket | 3/8" channel, 60A, per ft (need ~8ft) | 1 | McMaster | $8 |
| 17 | Silicone gasket strip | 10mm wide, 3mm thick, per ft (need ~6ft) | 1 | McMaster | $6 |
| 18 | Nylon shoulder washer | M4×12mm | 20 | McMaster | $4 |
| 19 | M4 machine screw | SS, various lengths | 20 | McMaster | $3 |
| 20 | M3 machine screw | SS, various lengths | 16 | McMaster | $2 |
| 21 | Heat-set brass insert | M4×8mm | 8 | McMaster | $4 |
| 22 | Heat-set brass insert | M3×6mm | 16 | McMaster | $6 |
| 23 | Cable gland | PG9, IP68 | 2 | McMaster | $4 |
| 24 | Silicone thermal pad | 100mm×100mm×2mm | 2 | McMaster | $5 |

**Subtotal — Off-the-Shelf: $111**

### Mechanical — 3D Printed (PETG)

| # | Part | Material | Qty | Est. Print Time | Est. Cost |
|---|---|---|---|---|---|
| 25 | Electronics tray | PETG, 30% infill | 1 | 8 hours | $3 |
| 26 | Camera housing (wide) | PETG, 40% infill | 1 | 2 hours | $1 |
| 27 | Camera housing (high-speed) | PETG, 40% infill | 1 | 2 hours | $1 |
| 28 | Display mount frame | PETG, 30% infill | 1 | 4 hours | $2 |
| 29 | LED panel frames (5×) | PETG, 20% infill | 5 | 6 hours each | $8 |
| 30 | Battery sled | PETG, 40% infill | 1 | 3 hours | $1 |
| 31 | Corner cable guides | PETG, 100% infill | 5 | 1 hour each | $2 |
| 32 | Radar module mount | PETG, 40% infill | 1 | 1 hour | $0.50 |
| 33 | BMS board mount | PETG, 40% infill | 1 | 1 hour | $0.50 |

**Subtotal — 3D Prints: $20**

### Electronics

| # | Part | Spec | Qty | Source | Est. Cost |
|---|---|---|---|---|---|
| 34 | Compute module | NVIDIA Jetson Orin Nano 8GB | 1 | DigiKey | $250 |
| 35 | LED controller | ESP32-S3 DevKit | 5 | Amazon | $25 |
| 36 | Wide-angle camera | RPi Camera Module 3 Wide | 1 | DigiKey | $35 |
| 37 | High-speed camera | Arducam OV9281 global shutter | 1 | Arducam | $25 |
| 38 | Radar module | TI IWR6843ISK + carrier | 1 | DigiKey | $55 |
| 39 | Display | 5" IPS HDMI, 800×480, 1000 nits | 1 | Amazon | $40 |
| 40 | IMU | Bosch BNO085 | 1 | DigiKey | $12 |
| 41 | Piezo film sensor | Measurement Specialties LDT0-028K | 20 | DigiKey | $15 |
| 42 | WS2812B LED strip | 30 LED/m, IP65, black PCB | 5m × 5 | AliExpress | $60 |
| 43 | LED power supply | MeanWell LRS-350-5 (5V 70A) | 1 | DigiKey | $25 |
| 44 | Buck converter | 12V → 5V 30A | 2 | Amazon | $12 |
| 45 | Battery cells | Samsung INR21700-50E 5000mAh | 6 | Batteryhook | $30 |
| 46 | BMS board | 3S2P, 30A, with balancing | 1 | Batteryhook | $15 |
| 47 | USB-C PD module | 65W, 12V/5A output | 1 | Amazon | $8 |
| 48 | WiFi/BT module | Intel AX210 M.2 | 1 | Amazon | $18 |
| 49 | M.2 adapter | NVMe to M.2 for additional storage | 1 | Amazon | $10 |
| 50 | MicroSD card | 128GB A2 U3 | 1 | Amazon | $12 |
| 51 | Environmental sensor | BME280 (temp/humidity) | 1 | DigiKey | $4 |
| 52 | Speaker | 28mm, 8Ω, 2W, waterproof | 1 | DigiKey | $3 |
| 53 | Push buttons | Waterproof, IP67, LED ring | 3 | DigiKey | $9 |
| 54 | Cable/wire kit | Silicone insulated, various gauges | 1 kit | Amazon | $15 |
| 55 | Connectors | JST-XH, Molex, USB-C | 1 kit | Amazon | $10 |

**Subtotal — Electronics: $678**

### Grand Total

| Category | Cost |
|---|---|
| CNC Machined Parts | $122 |
| Off-the-Shelf Hardware | $111 |
| 3D Printed Parts | $20 |
| Electronics | $678 |
| **Materials Total** | **$931** |
| Assembly Labor (2 hrs @ $20/hr) | $40 |
| QC & Testing (1 hr) | $20 |
| **Total COGS (prototype)** | **$991** |

### Target Pricing

| Configuration | COGS | Target MSRP |
|---|---|---|
| Standard (RPi CM4, manual legs) | ~$750 | $899 |
| Pro (Jetson Orin, auto-detect legs) | ~$990 | $1,299 |
| Pro + (Pro + motorized legs) | ~$1,150 | $1,499 |

---

*Note: Prices are estimated for prototype quantities (5 units). Volume production (100+ units) would reduce electronics costs by ~30% and CNC costs by ~40%.*