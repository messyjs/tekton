# SmartHome Plate™ — Assembly Guide
## Step-by-Step Build Instructions

---

## Tools Required

| Tool | Purpose |
|---|---|
| Hex key set (M3–M8) | All fasteners |
| Torque wrench (2–15 Nm range) | Through-rod nuts |
| Soldering iron (with tips for brass inserts) | Heat-set inserts |
| Wire strippers, crimpers | Wiring harness |
| Multimeter | Electrical testing |
| silicone sealant (aquarium-safe) | Weatherproofing |
| Isopropyl alcohol | Cleaning |
| Heat gun (for heat-shrink) | Wiring |
| OpenSCAD | STL/DXF export |
| 3D printer (PETG) | Custom parts |
| CNC mill (3-axis) | Aluminum plates |
| CNC router | Polycarbonate panels |

---

## Step 1: Prepare Aluminum Plates (CNC)

1. Export `base_plate.scad` and `top_plate.scad` from OpenSCAD as DXF
2. Verify dimensions against DXF drawings in `cnc/` folder
3. CNC mill base plate from 1/4" 6061-T6 aluminum stock
4. CNC mill top plate from 1/4" 6061-T6 aluminum stock
5. Deburr all edges, break sharp corners
6. Clean with IPA, mark all reference holes
7. Optional: Anodize black or natural (recommended for corrosion resistance)

## Step 2: Prepare Polycarbonate Panels (CNC Router)

1. Export panel SCAD files as DXF, or use the pre-generated DXFs in `cnc/`
2. CNC route all 5 panels from 3/8" clear polycarbonate (UV-hardcoated both sides)
3. Route the display window cutout in the front panel
4. Route camera window cutouts in the front panel
5. Deburr all edges with a deburring tool
6. Remove protective film only from the INNER surface (leave outer film on until final assembly)
7. Wipe all panels with IPA

## Step 3: Install Heat-Set Brass Inserts

Use a soldering iron with a brass insert tip:

**Aluminum plates** (8× M4 inserts):
1. Base plate: 4× M4 inserts for electronics tray
2. Top plate: 4× M4 inserts for electronics tray
3. Heat each insert at ~230°C, press into hole, hold 5 seconds

**3D-printed parts** (16× M3 + 4× M4):
1. Display mount: 4× M3 inserts
2. Camera housings: 2× M3 inserts each
3. Electronics tray: 4× M4 inserts (top mounting)

## Step 4: Assemble Adjustable Feet

For each of the 5 foot assemblies:

1. Slide the inner tube (1.25" square) into the outer tube (1.5" square)
2. Align the detent pin holes for the desired height:
   - **Low** (Little League): 2" extension (50.8mm)
   - **Medium** (High School): 5" extension (127mm)
   - **High** (College/Pro): 8" extension (203mm)
3. Insert the spring-loaded detent pin through the aligned holes
4. Screw the rubber foot onto the M6 stud on top of the inner tube
5. Thread the entire foot assembly into the M6 insert in the base plate
6. Adjust all 5 feet to the SAME height position

## Step 5: Install EPDM Gaskets

1. Cut EPDM gasket material to length for each channel segment:
   - Front channel: 17" (431.8mm)
   - Right channel: 8.5" (215.9mm)
   - Left channel: 8.5" (215.9mm)
   - Right-diag channel: 12" (304.8mm)
   - Left-diag channel: 12" (304.8mm)
2. Press gaskets into the channels on the base plate
3. Apply a thin bead of silicone sealant at each gasket joint
4. Repeat for the top plate (gaskets face DOWNWARD)
5. Allow silicone to cure for 24 hours

## Step 6: Install Polycarbonate Panels

**This is the most critical assembly step. Work slowly and carefully.**

1. Place the base plate on a flat, protected surface (foam pad)
2. Starting with the front panel (Panel A):
   a. Align the bottom edge of the panel with the front channel in the base plate
   b. Slide the bottom edge into the channel, tilting the panel up at 15°
   c. Press down until the panel seats fully into the channel
   d. Verify the panel is vertical and fully seated
3. Repeat for each of the 5 panels, working from front to back:
   - Panel B (right side)
   - Panel C (right diagonal)
   - Panel D (left diagonal)
   - Panel E (left side)
4. After all 5 panels are in the base plate channels, carefully place the top plate over the panels
5. Align the top plate channels with the top edges of each panel
6. Press down firmly and evenly — all 5 panel tops must engage simultaneously

**Tip**: If panels bind in the top channels, check that all gaskets are properly seated and that panels are fully vertical. A slight flex of the polycarbonate is normal and helps with alignment.

## Step 7: Install Through-Rods

1. Insert one M8 threaded rod through each vertex hole (5 total):
   a. Insert from the top, through the top plate
   b. Through both plates and all panel intersections
   c. The rod exits through the bottom of the base plate
2. Install a flat washer on the bottom of each rod
3. Thread an M8 nut onto each rod from the bottom
4. Install a flat washer on the top of each rod
5. Thread an M8 nut onto each rod from the top
6. Tighten all 5 top nuts HAND-TIGHT first
7. Using a torque wrench, tighten all top nuts to **8 Nm** in a star pattern:
   - Order: V1 (front-left), V3 (right-rear), V5 (left-rear), V2 (front-right), V4 (apex)
   - This ensures even compression of gaskets
8. Repeat for bottom nuts
9. Check all panels — they should be firm but not pinched. Panels should not rattle.

## Step 8: Install LED Matrix Strips

For each of the 5 panels (work from inside the device):

1. Clean the inner surface of the panel with IPA
2. Starting 6" (152.4mm) from the top of the panel, apply the first WS2812B LED strip
3. Lay strips horizontally (parallel to the ground), spaced 33mm apart (30 LEDs/m density)
4. The front panel has 16 columns of LED strips; side panels proportionally fewer
5. Press each strip firmly — the 3M adhesive backing should bond well to polycarbonate
6. Solder signal wires between strips: DOUT → DIN (daisy chain)
7. Route all signal wires to a common junction point near the top plate
8. Connect signal wires to the appropriate ESP32-S3 controller

**LED Panel Assignment:**
| Panel | ESP32 Port | LED Count | Data Pin |
|---|---|---|---|
| A (Front) | ESP32 #1 | ~1,152 | GPIO3 |
| B (Right) | ESP32 #2 | ~288 | GPIO3 |
| C (Right-Diag) | ESP32 #3 | ~480 | GPIO3 |
| D (Left-Diag) | ESP32 #4 | ~480 | GPIO3 |
| E (Left) | ESP32 #5 | ~288 | GPIO3 |

## Step 9: Install Piezo Sensors

For each panel (4 sensors per panel, 20 total):

1. Remove adhesive backing from each LDT0-028K piezo film sensor
2. Mount 1 sensor at each corner of each panel, 25mm from each edge
3. The sensor film should lie flat against the inner polycarbonate surface
4. Route sensor leads along the nearest corner toward the top plate
5. Secure leads with nylon cable ties (clip to LED strip wiring)
6. Connect each panel's 4 sensors to the corresponding ESP32-S3 ADC inputs:
   - Sensor 1 (top-left) → ADC1_CH0
   - Sensor 2 (top-right) → ADC1_CH1
   - Sensor 3 (bottom-left) → ADC1_CH2
   - Sensor 4 (bottom-right) → ADC1_CH3

## Step 10: Install Electronics Tray

1. Attach silicone vibration dampeners (4×) to the heat-set inserts on top of the electronics tray
2. Mount the Jetson Orin Nano on the tray using M2.5 standoffs to the marked positions
3. Mount the 5× ESP32-S3 DevKit boards at their marked positions
4. Mount the BMS board at its marked position
5. Mount the buck converters and power distribution board
6. Route all signal wires through the cable channels in the tray walls
7. Connect the BMS to the battery sled (NOT the cells yet — do that last)
8. Connect all ESP32-S3 boards to the Jetson via 3.3V UART (daisy-chained)
9. Connect the wide-angle camera FPC cable to the Jetson CSI-0
10. Connect the high-speed camera to the Jetson CSI-1
11. Connect the radar module via MIPI-CSI or SPI to the Jetson
12. Mount the tray into the device by attaching M4 screws through the vibration dampeners into the top plate inserts

## Step 11: Install Camera and Radar

1. Mount the wide-angle camera in the top plate housing using M2.5 screws
2. Mount the high-speed camera in the adjacent housing
3. Route FPC cables through the cable channel to the Jetson
4. Mount the radar module in its recessed housing
5. Connect the radar flex cable to the Jetson
6. Apply anti-fog coating to the inside of the camera lens windows
7. Verify camera alignment (both should point forward, slightly downward at ~5° tilt)

## Step 12: Install Display

1. Slide the 5" display into the display mount frame
2. Connect the HDMI cable to the display and route it to the Jetson
3. Connect the display power (5V from buck converter)
4. Snap the display mount frame into the front panel cutout
5. Secure with M3 screws into the heat-set inserts

## Step 13: Install Battery

1. Insert 6× 21700 cells into the battery sled, observing polarity
2. Connect the cell group wires to the BMS
3. **VERIFY POLARITY** with a multimeter before proceeding
4. Connect the BMS output leads to the power distribution board
5. Slide the battery sled into the base plate cavity (accessible through the battery access slot)
6. Secure with the battery access cover and M4 screws

## Step 14: Final Wiring and Sealing

1. Route all remaining wiring through cable guides
2. Secure all cables with nylon ties
3. Apply silicone sealant around:
   - Camera lens windows (inside and outside)
   - Display frame edges (inside)
   - All cable gland exits
   - Battery access cover edges
4. Allow silicone to cure for 24 hours
5. Install the 3× waterproof buttons on the top plate (Power, Zone Set, Mode)

## Step 15: Software Setup

1. Flash the Jetson Orin Nano with Ubuntu and the required drivers
2. Flash each ESP32-S3 with the SmartHome Plate firmware
3. Configure WiFi credentials
4. Run the calibration sequence:
   a. Place device on flat surface
   b. Calibrate IMU (level detection)
   c. Calibrate radar (distance to pitcher's mound)
   d. Calibrate piezo sensors (tap each panel, verify response)
   e. Calibrate LED matrix (verify all pixels respond)
   f. Calibrate cameras (verify focus and exposure)
5. Download the SmartHome Plate companion app on your phone
6. Pair via Bluetooth
7. Run a full system test

## Step 16: Final Inspection

1. [ ] All 5 panels are seated in channels, no rattling
2. [ ] All through-rods torqued to 8 Nm in star pattern
3. [ ] All LED strips responding (run rainbow test)
4. [ ] All 20 piezo sensors responding (tap test)
5. [ ] Display showing boot screen
6. [ ] Cameras producing images (check via app)
7. [ ] Radar detecting motion at 60 feet
8. [ ] All 3 buttons functioning
9. [ ] Battery reads ~12.6V (full charge)
10. [ ] Device sitting level on flat surface
11. [ ] No visible gaps in gasket seals
12. [ ] Leg height positions lock correctly
13. [ ] App connection established

---

## Maintenance Schedule

| Interval | Task |
|---|---|
| Every use | Wipe panels with microfiber cloth, check for loose fasteners |
| Monthly | Clean camera lenses, check battery charge, update firmware |
| Quarterly | Inspect gaskets, replace silica gel desiccant pack |
| Annually | Full inspection — replace any cracked panels, re-calibrate radar |
| As needed | Replace worn rubber feet, clean ventilation slots |

---

*End of Assembly Guide*