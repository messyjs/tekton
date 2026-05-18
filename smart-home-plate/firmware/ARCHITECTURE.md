# SmartHome Plate™ — Firmware Architecture

## System Overview

```
┌─────────────────────────────────────────────────┐
│                  Jetson Orin Nano                 │
│                  (Main Compute)                   │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Camera   │  │  Radar   │  │  ML Pipeline   │  │
│  │ Manager  │  │  Driver  │  │  (Strike Zone  │  │
│  │ (GStreamer)│  │ (IWR6843)│  │   Detection)  │  │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │              │                │            │
│  ┌────┴──────────────┴────────────────┴────┐     │
│  │          Core Application               │     │
│  │  ┌─────────┐ ┌───────────┐ ┌────────┐  │     │
│  │  │ Session  │ │  Game     │ │  Stats │  │     │
│  │  │ Manager  │ │  Engine   │ │ Engine │  │     │
│  │  └─────────┘ └───────────┘ └────────┘  │     │
│  │  ┌─────────────────────────────────┐    │     │
│  │  │  WiFi/BT Comms (App Protocol)    │    │     │
│  │  └─────────────────────────────────┘    │     │
│  └────┬──────────────┬─────────────────────┘     │
│       │ UART (3.3V)   │ I2C                      │
└───────┼────────────────┼──────────────────────────┘
        │                │
   ┌────┴────┐      ┌────┴────┐
   │ ESP32   │      │  BME280 │
   │ Master  │      │ (Env    │
   │ (#5)    │      │ Sensor) │
   └────┬────┘      └─────────┘
        │ UART (daisy-chain)
   ┌────┴──────────────────────────────────┐
   │  │         │         │         │      │
   ├─┴──┐  ┌──┴──┐  ┌──┴──┐  ┌──┴──┐    │
   │ESP32│  │ESP32│  │ESP32│  │ESP32│    │
   │ #1  │  │ #2  │  │ #3  │  │ #4  │    │
   │Front│  │Right│  │R-Diag│  │L-Diag│   │
   │     │  │     │  │     │  │     │    │
   │4ch  │  │4ch  │  │4ch  │  │4ch  │    │
   │ADC  │  │ADC  │  │ADC  │  │ADC  │    │
   │     │  │     │  │     │  │     │    │
   │~    │  │~    │  │~    │  │~    │    │
   │1152 │  │288  │  │480  │  │480  │    │
   │LEDs │  │LEDs │  │LEDs │  │LEDs │    │
   └─────┘  └─────┘  └─────┘  └─────┘    │
                                          │
   Panel E: ESP32 #5 (left side, 288 LEDs)│
   ────────────────────────────────────────┘
```

## ESP32-S3 Firmware (Per-Panel Controller)

### Primary Functions
1. **Impact Detection**: High-speed ADC sampling of 4 piezo sensors (10 kHz per channel)
2. **Impact Location**: Acoustic triangulation from timing differences between 4 sensors
3. **LED Control**: Drive WS2812B LED matrix with effects (strike, ball, splash, zone, target)
4. **Communication**: UART daisy-chain to master ESP32, which relays to Jetson

### Impact Detection Algorithm
```
1. Continuously sample all 4 ADC channels at 10 kHz
2. Apply bandpass filter (100 Hz - 5 kHz) to remove ambient noise
3. Monitor for threshold crossing (>5g equivalent, ~800 ADC counts)
4. On threshold crossing:
   a. Record precise timestamp (microsecond resolution)
   b. Capture 500 samples (50ms) from all 4 channels
   c. Find peak amplitude and timing for each sensor
   d. Calculate impact location using trilateration:
      - Speed of sound in polycarbonate: 2200 m/s
      - Use (t_sensor2 - t_sensor1), (t_sensor3 - t_sensor1), etc.
      - Solve system of equations for (x, y) impact point
   e. Send impact event to Master ESP32:
      {panel: 'A', x: 142.3, y: 305.1, force: 2340, timestamp: 72345}
5. Wait for LED command from Master, then execute LED animation
```

### LED Effect Types
| Effect | Trigger | Animation |
|---|---|---|
| STRIKE_SPLASH | Ball hits panel in zone | Bright white splash at impact point, fading to green, 200ms |
| BALL_MISS | Ball misses zone | Solid red flash on nearest panel, 300ms |
| ZONE_BORDER | Zone set / start | Blue pulsing border defining active zone |
| SIMON_TARGET | Game mode target | Bright yellow illumination of target zone, persistent |
| SIMON_HIT | Target hit | Green burst animation at impact point, 500ms |
| SIMON_MISS | Target missed | Red X pattern, 500ms |
| WARMUP | Warmup mode | Slow color cycle through all panels |
| SHUTDOWN | Power down | Dimming fade to black, 2 seconds |

## Jetson Application (Main Controller)

### Camera Pipeline (GStreamer)
```
Wide-angle: v4l2src → capsfilter → videoconvert → appsink (30fps, 4K)
High-speed: v4l2src → capsfilter → videoconvert → appsink (120fps, 1280x800)
```

### Radar Pipeline (TI mmWave SDK)
```
IWR6843 → UART/CLI → Range-Doppler map → Velocity extraction → Pitch speed + spin
```

### ML Pipeline (TensorRT)
```
1. Frame preprocessing → Resize to 320×320
2. MoveNet Thunder → 17 keypoints extraction
3. Keypoint filtering → Knee/hip/shoulder detection
4. Strike zone calculation:
   - Bottom: min(left_knee_y, right_knee_y)
   - Top: midpoint(left_shoulder_y, right_shoulder_y) + (hip_y - shoulder_y) * 0.5
   - Left/Right: home plate width ± 1 inch margins
5. Map to LED row numbers → Send to ESP32 master
```

### Session Recording
```
1. Ring buffer: 2 seconds pre-trigger, continuous
2. Trigger: Radar detects approaching object > 30 mph
3. Duration: Record until 1 second after impact + 0.5 second post
4. Save: H.264 encoded, 1080p wide-angle + 720p high-speed
5. Storage: Local eMMC, sync to app on demand
```

### Ball/Strike Determination
```
1. Radar tracks ball trajectory for final 30 feet
2. Predict entry point into device volume
3. If predicted path intersects active strike zone:
   a. AND piezo sensor confirms impact → STRIKE
   b. AND piezo does NOT detect impact → BALL (crossed zone but missed device)
4. If predicted path does NOT intersect strike zone:
   a. → BALL
5. Edge case: ball clips corner of zone
   a. Piezo on multiple panels → determine primary impact panel
   b. If ANY part of zone is hit → STRIKE (conservative for pitcher)
```

## Communication Protocol (ESP32 ↔ Jetson)

### UART Settings
- Baud: 921600
- Format: 8N1
- Daisy-chain: Master ESP32 serves as UART hub to Jetson

### Message Format
```json
// Impact event (ESP32 → Jetson)
{
  "type": "impact",
  "panel": "A",        // A-E
  "x": 142.3,          // mm from left edge
  "y": 305.1,           // mm from bottom
  "force": 2340,        // Newtons (approximate)
  "timestamp_us": 72345 // Microsecond timestamp
}

// LED command (Jetson → ESP32)
{
  "type": "led_effect",
  "panel": "A",         // A-E or "ALL"
  "effect": "strike_splash",
  "x": 142.3,
  "y": 305.1,
  "color": [0, 255, 0], // RGB
  "duration_ms": 200
}

// Zone set command (Jetson → ESP32)
{
  "type": "zone_set",
  "panel": "ALL",
  "top_row": 48,        // LED row number (top of zone)
  "bottom_row": 12,      // LED row number (bottom of zone)
  "color": [0, 100, 255]
}

// Radar speed reading (Jetson internal)
{
  "type": "radar_speed",
  "speed_mph": 92.3,
  "spin_rpm": 2200,
  "timestamp_ms": 15234
}
```

---

*End of Firmware Architecture*