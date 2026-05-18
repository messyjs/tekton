# SmartHome Plate v4 — Hitting Lab Edition

## Product Concept
The SmartHome Plate v4 transforms from a pitching target into a complete hitting analysis system.
The same IWR6843 radar tracks the BAT and the BATTED BALL from its position at home plate.
A separate tee arm attachment swings out from the side of the plate, positioning the ball
in the strike zone from the correct offset position.

## Hardware — Tee Arm Attachment (NOT inside the plate)

### Design: Swing-Arm Tee
- The plate has a mounting bracket on the side that accepts a swing arm
- The arm is 30" long, hinged at the plate edge
- At the tip: a standard rubber ball cup on a telescoping tube (18"–36" height)
- The arm swings OUT from the side and positions the ball directly above the strike zone
- When not in use, the arm folds flat alongside the plate for storage
- Left-side mount for RH batters, right-side mount for LH batters
- Quick-release: 1/4 turn bayonet to attach/remove from the plate
- 3 lateral detent positions: center, inside, outside
- Separate accessory ($149), NOT stored inside the ballast chamber

### Why the tee is offset to the side
- The batter stands in the batter's box
- The ball needs to be over the plate for a strike
- The arm reaches FROM the side OVER the strike zone
- The batter swings freely — arm is to the side, not behind the ball
- The radar in the plate has clear line of sight to bat + ball contact

## Radar Capabilities — Hitting Mode

| Metric | How Measured | Range |
|--------|-------------|-------|
| Exit Velocity | IWR6843 Doppler on batted ball | 40–120 mph |
| Launch Angle | 3D trajectory first 10 frames | -30° to +80° |
| Spray Angle | Horizontal direction | Pull to Oppo |
| Bat Speed | Radar tracking bat approach | 50–95 mph |
| Contact Score | Piezo + microphone acoustic analysis | 0–100 |
| Contact Point | Radar bat-barrel intersection | Handle/Barrel/End |
| Projected Distance | Calculated from EV + LA + spin | 0–500+ ft |

## Barrel Classification (MLB Statcast compatible)
| Launch Angle | Exit Velocity | Classification |
|-------------|---------------|---------------|
| 8–32°      | >= 98 mph      | Barrel        |
| 8–32°      | 92–97 mph      | Solid Contact |
| 8–32°      | < 92 mph       | Flare/Weak    |
| < 8°       | any            | Ground Ball   |
| > 32°      | any            | Fly Ball      |

## Contact Quality (Acoustic)
| Sound | Score | Description |
|-------|-------|-------------|
| Solid crack | 95–100 | Centered barrel, full energy transfer |
| Good contact | 80–95 | Slightly off-center |
| Off-center | 60–80 | Toward end cap |
| Topped | 40–60 | Ground ball |
| Undercut | 20–40 | Popup |
| Whiff | 0 | Complete miss |

## Pricing
| Model | Price | Includes |
|-------|-------|----------|
| SmartHome Plate v3 | $649–$999 | Plate, sensor pod, charger, app |
| Hitting Kit (v4 add-on) | $149 | Swing-arm tee, bracket, contact mic |
| v3 + v4 Bundle | $798–$1,148 | Everything |