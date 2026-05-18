# SmartHome Plate v3 — Molded Shell + Baseball Ballast

## The Two Big Ideas

### 1. Molded/Rotomolded Shell

Instead of assembling 30+ parts (aluminum frame, polycarbonate panels, through-rods, gaskets, etc.), the entire device is **one hollow molded shell**:

**Prototype → Production Path:**

| Stage | Method | Cost/Shell | Mold Cost | Volume | Assembly Time |
|---|---|---|---|---|---|
| Prototype (1-10) | 3D printed PETG + CNC Al | $50-80 | $0 | 1-10 | 2-3 hours |
| Early Prod (10-100) | Vacuum-formed ABS | $15-25 | $2,000-5,000 | 10-100 | 30 minutes |
| Production (100+) | Rotomolded PE | $5-12 | $10,000-25,000 | 100+ | **15 minutes** |

**Rotomolding (what Yeti coolers, kayaks, and playground equipment use):**
- Creates a seamless, hollow, indestructible shell
- UV-stabilized polyethylene — survives sun, rain, and 105mph baseballs forever
- Wall thickness can vary (thicker at impact zones, thinner at the top)
- Double-wall construction possible (hollow walls filled with foam for insulation/rigidity)
- The mold costs $10-25K but each shell is only $5-12 to produce
- The shell IS the weight chamber — it's hollow, and you fill it with whatever's heavy

### 2. Fill It With Baseballs (or Sand, or Water)

This is the genius insight. The device IS the ballast container:

```
     ┌──────────────────┐
     │   SENSOR POD      │  ← Electronics (cameras, radar, display)
     │   (sealed)        │
     └──────┬───────────┘
     ╔══════╧════════════╗
     ║                    ║
     ║   STRIKE ZONE      ║  ← Molded polyethylene shell
     ║   TARGET           ║     Thicker walls at impact zone
     ║                    ║
     ╠════════════════════╣  ← OPENING WITH LATCH
     ║                    ║
     ║   BALLAST CHAMBER  ║  ← FILL WITH:
     ║                    ║     8-10 baseballs (3 lbs)
     ║   Drop in baseballs║     OR sand (8-10 lbs)
     ║   or sand, or      ║     OR water (8 lbs)
     ║   or steel shot     ║     OR anything heavy
     ║                    ║
     ╚════════════════════╝
        ┃    ┃    ┃    ┃
        ┃    ┃    ┃    ┃  ← Ground stakes or suction cups
     ───┸────┸────┸────┸─── Ground
```

**Why this is brilliant:**

1. **Baseballs are already at every field.** You don't need to buy sand or steel shot. You have a bucket of baseballs right there. Drop in 8-10 balls and you're stable.

2. **One baseball = ~5 oz.** Ten baseballs = 3.1 lbs. That plus the shell and electronics = 15-18 lbs, which is enough for stability when combined with ground stakes.

3. **For extra stability**, throw in a bag of sand from the field, or a couple of water bottles. The chamber is large enough for all of it.

4. **The top opens with a simple twist-latch.** Like a cooler. Open it, drop stuff in, close it, play.

5. **When you're done, empty it out.** The device goes back in the bag at ~10 lbs for easy transport.

6. **Marketing gold.** "Fill it with baseballs for stability. The same baseballs you're practicing with." It's poetic.

---

## v3 Design Details

### The Molded Shell

**Material:** UV-stabilized polyethylene (rotationally molded)

**Shape:** Pentagon footprint (exact MLB home plate) with:
- **Lower section (ballast chamber):** 8" tall hollow box with thick walls (1/4"), open top with twist-latch lid
- **Middle section (strike zone):** 24" tall, walls vary from 3/8" (front face, impact zone) to 1/8" (sides, less impact)
- **Upper section (sensor pod):** 6" tall, thinner walls (1/8"), with sealed compartments for cameras, radar, display, compute
- **Top:** Angled deflector surface (balls bounce off)

**External features molded into the shell:**
- LED channels: Grooves on the inside surface for LED strip routing
- Sensor pockets: Snap-fit tabs for piezo sensor mounting
- Camera windows: Molded recesses for polycarbonate lens covers
- Display window: Molded bezel for display
- Latch points: Molded holes for the twist-latch on the ballast lid
- Cable channels: Internal routing channels
- Ground stake holes: Molded holes at each leg position
- Grip handles: Molded handles on sides for carrying

**Internal features:**
- Electronics tray mount points (snap-fit)
- Battery compartment (sealed, with accessible door)
- Cable routing channels molded into the walls
- Foam inserts between double-wall sections for impact absorption
- Drain holes at the bottom of the ballast chamber

### Assembly Comparison

| Step | v2 (Aluminum Build) | v3 (Molded Shell) |
|---|---|---|
| Shell/frame prep | 30 min (bolt together) | 0 (it's already one piece) |
| Install target panel | 10 min (mount to frame) | 0 (it's part of the shell) |
| Install electronics | 20 min | 15 min (snap in) |
| Install cameras | 10 min | 5 min (pop into molded recess) |
| Install LEDs | 15 min | 10 min (stick into channels) |
| Install sensors | 10 min | 5 min (snap into tabs) |
| Install display | 5 min | 3 min (snap into bezel) |
| Connect battery | 3 min | 2 min (slide in, plug) |
| Add ballast | N/A | **1 min (open lid, drop in baseballs)** |
| Close & test | 5 min | 5 min |
| **TOTAL** | **~1.5-2 hours** | **~15-20 minutes** |

That's a **5-6x reduction in assembly time.**

---

## Cost Comparison (Production, 100+ Units)

| Item | v2 (Aluminum) | v3 (Molded Shell) | Notes |
|---|---|---|---|
| Shell/frame | $40 (CNC Al + hardware) | $5-12 (rotomolded) | HUGE savings |
| Target panel | $25 (CNC routed) | $0 (part of shell) | Included in shell |
| Base/frame | $15 | $0 (part of shell) | Included in shell |
| Sensor pod | $10 | $0 (part of shell) | Included in shell |
| Ground stakes | $8 | $5 (molded holes) | Simpler |
| Lid/latch | N/A | $2 (twist-latch) | New item |
| Electronics | $622 | $622 | Same |
| Assembly labor | $40 (2 hrs @ $20) | $7 (15 min @ $28) | 5x faster |
| **TOTAL (Pro)** | **$735** | **$658-668** | |
| **MSRP** | **$999** | **$899** | $100 cheaper |

And at 500+ units, the rotomolded shell drops to $3-5 each:
- **Pro COGS at 500 units: ~$638**
- **Pro MSRP: $899**
- **Budget COGS at 500 units: ~$315**
- **Budget MSRP: $649**

---

## The Ballast Chamber Design

**Opening:** 12" × 8" (large enough to drop baseballs in)
**Lid:** Twist-lock (like a Yeti cooler), waterproof IP54
**Capacity:** 12-15 baseballs, or 20 lbs of sand, or 2 gallons of water
**Drain:** Small drain hole at bottom (for water removal)
**Interior:** Smooth walls (balls slide in and out easily)

**How to use it:**
1. Open the twist-latch lid on top
2. Drop in 8-10 baseballs from your practice bucket
3. Or add a bag of sand from the maintenance shed
4. Or pour in 2 gallons of water from the hose
5. Close the lid, twist to lock
6. Device is now stable and ready
7. When done, open lid, remove ballast, carry device in bag at ~10 lbs

**This means:**
- No separate sandbags to buy or carry
- No steel shot to purchase
- Baseballs are always available at the field
- Quick setup and teardown (1 minute)
- Lightweight for transport (10 lbs empty)
- Heavy for use (18-22 lbs with ballast)

---

## Material Decision: Rotomolded Polyethylene

**Why polyethylene (PE) for the shell:**

| Property | Value | Why It Matters |
|---|---|---|
| Impact strength | >20 ft-lb/in | Baseball at 105mph = not even close to damaging it |
| UV resistance | With stabilizers, 10+ years outdoors | Left in the sun, fine |
| Chemical resistance | Resistant to water, sand, sweat, sunscreen | Baseball field conditions |
| Temperature range | -40°F to 180°F | Winter games to summer tournaments |
| Weight | 0.034 lb/in³ (light when empty) | Easy to carry |
| Cost (rotomolded) | $3-12 per shell at volume | Cheaper than aluminum |
| Color | Any color (molded in) | Team colors, branding |
| Surface finish | Textured (anti-glare, good grip) | Doesn't show scratches |
| Wall thickness | 1/8" to 3/8" (varies by zone) | Thicker where impact is |
| Double wall | Possible (foam-filled for insulation) | Battery lasts longer in cold |

**The same process that makes Yeti coolers ($350) indestructible makes this device indestructible. Yeti coolers are famous for surviving being thrown off buildings, run over by trucks, and attacked by bears. A 105mph baseball bouncing off it won't even leave a mark.**

---

## Prototyping Path

| Phase | Method | Quantity | Cost/Unit | Time |
|---|---|---|---|---|
| **Alpha** | 3D printed PETG + CNC Al | 1-3 | $500-800 | Now |
| **Beta** | Vacuum-formed ABS shell | 10-50 | $80-120 | 4-6 weeks |
| **Production** | Rotomolded PE shell | 100+ | $5-12 | 8-12 weeks |
| **Scale** | Rotomolded, automated assembly | 1000+ | $3-5 | 3-4 months |

The alpha prototype can be built TODAY from the CAD files we already have. The vacuum-formed and rotomolded versions require mold-making, which takes weeks and costs thousands — but the unit economics dramatically improve at volume.

**Recommendation: Start with the aluminum/CNC proto (v2) for testing and validation. Meanwhile, design the rotomold version (v3) in parallel. Once you've validated the product with 10-20 users on the v2 prototype, invest in the rotomold tooling for production.**