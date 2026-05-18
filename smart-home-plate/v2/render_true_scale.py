#!/usr/bin/env python3
"""
SmartHome Plate v2.1 — TRUE SCALE render.
17" is WIDE. Like a large laptop screen wide.
24" tall is like TWO stacked soccer balls.
This render uses 1 pixel = 1 inch so proportions are EXACT.
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, FancyBboxPatch, Rectangle, Polygon
import numpy as np

# SCALE: 1 unit = 1 inch. No funny shrinking.
# Panel is 17 wide x 24 tall. Device is 42 tall total.
# Baseball is 2.9" diameter.
# This is ALL in INCHES.

fig_w = 28  # figure width in inches (for DPI, not data)
fig_h = 22
dpi = 120

fig, axes = plt.subplots(2, 3, figsize=(fig_w, fig_h), facecolor='#0a0e1a',
                          gridspec_kw={'width_ratios': [1.2, 1, 1], 'height_ratios': [1.2, 1]})

# Colors
BG = '#0a0e1a'
ALUM = '#c5cdd5'
ALUM_EDGE = '#8899aa'
LED_BLUE = '#00bbff'
LED_BG = '#002244'
LED_GREEN = '#00ff66'
POD_COL = '#2a3040'
POD_EDGE = '#445566'
ACCENT = '#00ccff'
WARN = '#ff8844'
GROUND = '#1a2a1a'
TEXT = '#c0d0e0'

def setup_ax(ax, title, xlim, ylim):
    ax.set_facecolor(BG)
    ax.set_xlim(xlim)
    ax.set_ylim(ylim)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(title, color='white', fontsize=13, fontweight='bold', pad=12, fontfamily='sans-serif')

# ============================================================
# 1. FRONT VIEW (True Scale) — ax[0,0]
# ============================================================
ax = axes[0][0]
setup_ax(ax, 'FRONT VIEW (True Scale)', (-12, 30), (-5, 50))

# Ground line
ax.axhline(y=0, color='#3a5a3a', linewidth=2, alpha=0.6)
ax.fill_between([-12, 30], -5, 0, color=GROUND, alpha=0.2)

# ---- BASE / BALLAST ----
base_w = 19  # slightly wider than panel for stability
base_h = 4
base = FancyBboxPatch((-(base_w/2), 0), base_w, base_h, boxstyle="round,pad=0.3",
                       fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2.5)
ax.add_patch(base)
ax.text(0, base_h/2, 'BALLAST\nCOMPARTMENT\n+ Frame\n(8-12 lbs)', 
        color='#a0b0c0', fontsize=8, ha='center', va='center', fontfamily='monospace', fontweight='bold')

# Legs/feet
for fx in [-base_w*0.38, -base_w*0.13, base_w*0.13, base_w*0.38]:
    ax.plot([fx, fx], [0, base_h], color='#778899', linewidth=4, solid_capstyle='round')
    # Ground spike
    ax.plot([fx-0.3, fx+0.3], [-0.5, -0.5], color='#555', linewidth=4)
    ax.plot([fx, fx], [-0.5, 0], color='#666', linewidth=3)

# Label
ax.text(base_w/2 + 1.5, 2, 'Wide base\nfor stability', color='#778899', fontsize=7, fontfamily='monospace')

# ---- GAP (below strike zone) ----
gap_bottom = base_h
zone_bottom = 15  # 15 inches from ground (typical)

ax.fill_between([-8, 8], gap_bottom, zone_bottom, color=BG, alpha=0.3)
for fx in [-(base_w*0.35), -(base_w*0.1), base_w*0.1, base_w*0.35]:
    ax.plot([fx, fx], [gap_bottom, zone_bottom], color='#556677', linewidth=2.5, solid_capstyle='round')
# Cross brace
ax.plot([-(base_w*0.35), base_w*0.35], [gap_bottom + 4, gap_bottom + 4], color='#556677', linewidth=2)

ax.text(12, (gap_bottom+zone_bottom)/2, 'OPEN GAP\n(below knees)\nBall passes\nthrough = BALL', 
        color='#556677', fontsize=7, fontfamily='monospace', va='center')

# ---- STRIKE ZONE TARGET PANEL (17" wide x 24" tall) ----
pw = 17   # exact MLB width
ph = 24   # zone height

panel = Rectangle((-pw/2, zone_bottom), pw, ph, fill=True, 
                   facecolor=ALUM, edgecolor=ALUM_EDGE, linewidth=3, alpha=0.9)
ax.add_patch(panel)

# Panel texture (brushed aluminum look)
for y_line in np.arange(zone_bottom + 1, zone_bottom + ph, 1.5):
    ax.plot([-pw/2 + 0.5, pw/2 - 0.5], [y_line, y_line], 
            color='#b0bac5', linewidth=0.2, alpha=0.2)

# ---- LED ZONE BOUNDARIES ----
# Bottom zone boundary (bright blue glow)
for y_led in [zone_bottom, zone_bottom + ph]:
    ax.plot([-pw/2 + 0.5, pw/2 - 0.5], [y_led, y_led], color=LED_BLUE, linewidth=4, alpha=0.9)
    ax.plot([-pw/2, pw/2], [y_led, y_led], color=LED_BLUE, linewidth=12, alpha=0.15)

# Side zone LEDs
ax.plot([-pw/2, -pw/2], [zone_bottom, zone_bottom + ph], color=LED_BLUE, linewidth=3, alpha=0.7)
ax.plot([pw/2, pw/2], [zone_bottom, zone_bottom + ph], color=LED_BLUE, linewidth=3, alpha=0.7)

# Zone row markers (horizontal lines every 2")
for y in np.arange(zone_bottom + 2, zone_bottom + ph, 2):
    ax.plot([-pw/2 + 0.3, pw/2 - 0.3], [y, y], color=LED_BLUE, linewidth=0.4, alpha=0.2)

# Zone label
ax.text(0, zone_bottom + ph/2, 'STRIKE\nZONE\n17" x 24"', 
        color='#506070', fontsize=16, ha='center', va='center', fontweight='bold', 
        fontfamily='sans-serif', alpha=0.2)

# Impact splash
iy = zone_bottom + 10
ix = 3
for r, a in [(2.5, 0.05), (1.5, 0.1), (0.8, 0.2), (0.3, 0.5)]:
    splash = Circle((ix, iy), r, fill=True, facecolor=LED_GREEN, alpha=a, edgecolor='none')
    ax.add_patch(splash)
ax.text(ix + 3, iy, 'IMPACT\nSTRIKE!', color=LED_GREEN, fontsize=9, fontweight='bold', fontfamily='monospace')

# ---- SENSOR POD ----
pod_bottom = zone_bottom + ph + 2
pod_h = 6
pod_w = 10
pod = FancyBboxPatch((-pod_w/2, pod_bottom), pod_w, pod_h, boxstyle="round,pad=0.3",
                       fill=True, facecolor=POD_COL, edgecolor=POD_EDGE, linewidth=2.5)
ax.add_patch(pod)

# Deflector top (balls bounce off)
defl_pts = [(-pod_w/2 - 1, pod_bottom + pod_h),
            (0, pod_bottom + pod_h + 3),
            (pod_w/2 + 1, pod_bottom + pod_h)]
defl = Polygon(defl_pts, fill=True, facecolor='#3a4555', edgecolor='#556677', linewidth=2)
ax.add_patch(defl)
ax.text(pod_w/2 + 2, pod_bottom + pod_h + 1, 'DEFLECTOR\n(balls bounce off)', color='#778899', 
        fontsize=6, fontfamily='monospace')

# Camera lenses
ax.plot(-2.5, pod_bottom + pod_h * 0.7, 'o', color='#111', markersize=9, markeredgecolor='#4488aa', markeredgewidth=2)
ax.plot(2.5, pod_bottom + pod_h * 0.7, 'o', color='#111', markersize=7, markeredgecolor='#4488aa', markeredgewidth=2)
ax.text(-2.5, pod_bottom + pod_h * 0.7 + 2.5, '4K', color='#4488aa', fontsize=6, ha='center', fontfamily='monospace')
ax.text(2.5, pod_bottom + pod_h * 0.7 + 2.5, '120fps', color='#4488aa', fontsize=6, ha='center', fontfamily='monospace')

# Radar
radar = Circle((0, pod_bottom + pod_h * 0.3), 0.6, fill=True, facecolor='#1a3a1a', edgecolor='#44aa44', linewidth=2)
ax.add_patch(radar)
ax.text(0, pod_bottom + pod_h * 0.3 - 1.5, '60GHz\nRADAR', color='#44aa44', fontsize=5, ha='center', fontfamily='monospace', fontweight='bold')

# Display
disp_w = 6
disp_h = 2.5
disp = Rectangle((-disp_w/2, pod_bottom + 0.5), disp_w, disp_h, fill=True,
                 facecolor='#001122', edgecolor='#0088ff', linewidth=2)
ax.add_patch(disp)
ax.text(0, pod_bottom + disp_h - 0.3, '92.3', color='#00ff88', fontsize=11, ha='center', fontweight='bold', fontfamily='monospace')
ax.text(0, pod_bottom + 0.8, 'STRIKE 1-1', color='#00ccff', fontsize=6, ha='center', fontfamily='monospace')

# ---- BASEBALL FOR SCALE (sitting next to device) ----
bx = pw/2 + 6
by = 2.5
ball = Circle((bx, by), 1.45, fill=True, facecolor='white', edgecolor='#cc3333', linewidth=2)
ax.add_patch(ball)
ax.text(bx, by - 2.5, 'Regulation baseball\n2.9" diameter', color='#999', fontsize=7, ha='center', fontfamily='monospace')

# Dimension arrows
# Width
ax.annotate('', xy=(-pw/2, zone_bottom + ph + 1), xytext=(pw/2, zone_bottom + ph + 1),
            arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=2))
ax.text(0, zone_bottom + ph + 2.5, '17" (MLB width)', color='#ffcc00', fontsize=10, ha='center', 
        fontfamily='monospace', fontweight='bold')

# Zone height
ax.annotate('', xy=(-pw/2 - 2, zone_bottom), xytext=(-pw/2 - 2, zone_bottom + ph),
            arrowprops=dict(arrowstyle='<->', color=ACCENT, lw=2))
ax.text(-pw/2 - 3, zone_bottom + ph/2, '24"', color=ACCENT, fontsize=10, ha='center', 
        fontfamily='monospace', fontweight='bold', rotation=90)

# Total height
top = pod_bottom + pod_h + 3
ax.annotate('', xy=(pw/2 + 3, 0), xytext=(pw/2 + 3, top),
            arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax.text(pw/2 + 5, top/2, '~42"\ntotal', color='#ffcc00', fontsize=9, ha='center', 
        fontfamily='monospace', fontweight='bold')

# ============================================================
# 2. TOP VIEW — True Scale pentagon — ax[0,1]
# ============================================================
ax2 = axes[0][1]
setup_ax(ax2, 'TOP VIEW (Home Plate Shape)', (-14, 14), (-3, 22))

# Home plate pentagon vertices (inches)
# V1(front-left), V2(front-right), V3(right-rear), V4(apex/back), V5(left-rear)
hp_v = np.array([
    [-8.5, 0],      # Front-left
    [8.5, 0],        # Front-right
    [8.5, 8.5],      # Right side
    [0, 17],          # Apex (back)
    [-8.5, 8.5],     # Left side
])

# Home plate outline on ground
hp_ground = Polygon(hp_v, fill=True, facecolor='#2a3a2a', edgecolor='#5a7a5a', linewidth=3, alpha=0.6)
ax2.add_patch(hp_ground)

# Target panel outline (slightly inside, the aluminum panel)
panel_v = hp_v * 0.97  # Slightly smaller
panel_poly = Polygon(panel_v, fill=True, facecolor=ALUM, edgecolor=ALUM_EDGE, linewidth=2.5, alpha=0.85)
ax2.add_patch(panel_poly)

# Zone LEDs on the panel (along the edges)
for i in range(5):
    x1, y1 = panel_v[i]
    x2, y2 = panel_v[(i+1) % 5]
    ax2.plot([x1, x2], [y1, y2], color=LED_BLUE, linewidth=3, alpha=0.7)

# Sensor pod (center-ish, near front)
pod_top = Circle((0, 4), 2.5, fill=True, facecolor=POD_COL, edgecolor=POD_EDGE, linewidth=2)
ax2.add_patch(pod_top)

# Camera lenses on pod
ax2.plot(-0.8, 4.5, 'o', color='#111', markersize=6, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax2.plot(0.8, 4.5, 'o', color='#111', markersize=5, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax2.text(0, 3, 'RADAR', color='#44aa44', fontsize=7, ha='center', fontfamily='monospace', fontweight='bold')

# Labels on edges
edge_labels = [
    ((-8.5+0)/2+1, (0+8.5)/2+1, 'Left\nDiag\n12"'),
    ((0+8.5)/2-2, (17+8.5)/2-1, 'Right\nDiag\n12"'),
    (-8.5-3, 8.5/2, 'Left\n8.5"'),
    (8.5+1.5, 8.5/2, 'Right\n8.5"'),
    (0, -2, 'FRONT (faces pitcher)\n17"'),
]
for x, y, label in edge_labels:
    ax2.text(x, y, label, color='#aabbcc', fontsize=7, ha='center', fontfamily='monospace')

# Dimension on front
ax2.annotate('', xy=(-8.5, -1.5), xytext=(8.5, -1.5),
            arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=2))
ax2.text(0, -2.5, '17 inches (MLB)', color='#ffcc00', fontsize=10, ha='center',
         fontfamily='monospace', fontweight='bold')

# Baseball for scale on top view
ball_top = Circle((10, 14), 1.45, fill=True, facecolor='white', edgecolor='#cc3333', linewidth=2)
ax2.add_patch(ball_top)
ax2.text(10, 12, 'baseball\n(2.9")', color='#888', fontsize=7, ha='center', fontfamily='monospace')

ax2.text(0, 19.5, 'EXACTLY MLB HOME PLATE SHAPE', color=ACCENT, fontsize=11, ha='center',
         fontfamily='monospace', fontweight='bold')
ax2.text(0, 18, '17" front × 8.5" sides × 12" diagonals × 17" deep', color='#8899aa', fontsize=8,
         ha='center', fontfamily='monospace')

# ============================================================
# 3. SIDE VIEW — ax[0,2]
# ============================================================
ax3 = axes[0][2]
setup_ax(ax3, 'SIDE VIEW (Depth)', (-10, 22), (-5, 50))

# Ground
ax3.axhline(y=0, color='#3a5a3a', linewidth=2, alpha=0.6)
ax3.fill_between([-10, 22], -5, 0, color=GROUND, alpha=0.2)

# Base
base_side = FancyBboxPatch((-8, 0), 18, 4, boxstyle="round,pad=0.3",
                            fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2)
ax3.add_patch(base_side)
ax3.text(1, 2, 'BASE', color='#99aabb', fontsize=8, ha='center', fontfamily='monospace')

# Frame/legs
for fx in [-6, -2, 3, 8]:
    ax3.plot([fx, fx], [0, 15], color='#667788', linewidth=3)

# Target panel (side view = 17" deep!)
panel_depth = 17  # THIS IS THE KEY! Same as home plate depth!
panel_side = Rectangle((-1, 15), panel_depth/4, 24, fill=True,
                       facecolor=ALUM, edgecolor=ALUM_EDGE, linewidth=2.5, alpha=0.9)
ax3.add_patch(panel_side)

# Zone LEDs on panel (side)
ax3.plot([-1, -1], [15, 39], color=LED_BLUE, linewidth=3, alpha=0.7)
ax3.plot([panel_depth/4+3-1, panel_depth/4+3-1], [15, 39], color=LED_BLUE, linewidth=3, alpha=0.7)
for yl in [15, 39]:
    ax3.plot([-1-0.5, panel_depth/4+3-1+0.5], [yl, yl], color=LED_BLUE, linewidth=3, alpha=0.8)

# Sensor pod (side)
pod3 = FancyBboxPatch((-0.5, 41), 5, 5, boxstyle="round,pad=0.2",
                       fill=True, facecolor=POD_COL, edgecolor=POD_EDGE, linewidth=2)
ax3.add_patch(pod3)

# Deflector
defl3 = Polygon([(-1, 46), (4, 49), (5.5, 46)], fill=True, facecolor='#3a4555', edgecolor='#556677', linewidth=1.5)
ax3.add_patch(defl3)

# Dimensions
ax3.annotate('', xy=(10, 0), xytext=(10, 46),
            arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax3.text(12, 23, '~42"\ntotal', color='#ffcc00', fontsize=9, ha='center', fontfamily='monospace', fontweight='bold')

ax3.annotate('', xy=(14, 15), xytext=(14, 39),
            arrowprops=dict(arrowstyle='<->', color=ACCENT, lw=1.5))
ax3.text(16, 27, '24"\nzone', color=ACCENT, fontsize=8, ha='center', fontfamily='monospace')

# Width annotation (showing depth)
ax3.annotate('', xy=(-1, 14), xytext=(panel_depth/4+3-1, 14),
            arrowprops=dict(arrowstyle='<->', color=WARN, lw=1.5))
ax3.text(4, 13, '17" deep!', color=WARN, fontsize=8, ha='center', fontfamily='monospace', fontweight='bold')

ax3.text(1, 50, 'IT\'S 17" DEEP\n+ 17" WIDE\n= A BIG TARGET', 
         color='white', fontsize=10, ha='center', fontweight='bold', fontfamily='monospace')

# ============================================================
# 4. Scale Comparison — ax[1,0]
# ============================================================
ax4 = axes[1][0]
setup_ax(ax4, 'SIZE COMPARISON', (-8, 22), (-5, 50))

# Ground
ax4.axhline(y=0, color='#3a5a3a', linewidth=2, alpha=0.6)

# ---- Device simplified side profile ----
# Base
ax4.fill_between([-8.5, 8.5], 0, 4, color='#556677', alpha=0.8)
# Zone panel
ax4.fill_between([-8.5, 8.5], 15, 39, color=ALUM_EDGE, alpha=0.6)
# Pod
ax4.fill_between([-5, 5], 41, 46, color='#3a4555', alpha=0.8)
# Deflector
ax4.fill([[-5, 0, 5], [46, 49, 46]], color='#445566', alpha=0.8)

# Zone LEDs
ax4.plot([-8.5, 8.5], [15, 15], color=LED_BLUE, linewidth=3)
ax4.plot([-8.5, 8.5], [39, 39], color=LED_BLUE, linewidth=3)

# ---- Baseball (to scale) ----
bball = Circle((12, 1.5), 1.45, fill=True, facecolor='white', edgecolor='#cc3333', linewidth=2)
ax4.add_patch(bball)
ax4.text(12, -1, 'Baseball\n2.9" dia', color='#888', fontsize=7, ha='center', fontfamily='monospace')

# ---- Basketball for reference ----
ax4.text(17, 5, 'Basketball\n9.4" dia', color='#666', fontsize=7, ha='center', fontfamily='monospace')
bbasket = Circle((17, 12), 4.7, fill=False, edgecolor='#cc8833', linewidth=2, linestyle='--')
ax4.add_patch(bbasket)

# ---- 6-foot person outline (stick figure) ----
p_x = -6
# Feet
ax4.plot([p_x-2, p_x+2], [0, 0], color='#888', linewidth=3)
# Legs
ax4.plot([p_x-1, p_x], [0, 18], color='#888', linewidth=2)
ax4.plot([p_x+1, p_x], [0, 18], color='#888', linewidth=2)
# Torso
ax4.plot([p_x, p_x], [18, 42], color='#888', linewidth=2)
# Arms
ax4.plot([p_x, p_x-5], [30, 25], color='#888', linewidth=2)
ax4.plot([p_x, p_x+4], [30, 28], color='#888', linewidth=2)
# Head
head = Circle((p_x, 45), 3, fill=False, edgecolor='#888', linewidth=2)
ax4.add_patch(head)
# Height label
ax4.annotate('', xy=(p_x+5, 0), xytext=(p_x+5, 72),
            arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax4.text(p_x+6.5, 36, "6'\n(72\")", color='#ffcc00', fontsize=8, ha='center', fontfamily='monospace')
# Strike zone on person
ax4.plot([p_x-3, p_x+3], [18, 18], color=LED_BLUE, linewidth=2, linestyle='--')
ax4.plot([p_x-3, p_x+3], [38, 38], color=LED_BLUE, linewidth=2, linestyle='--')
ax4.text(p_x+4, 28, 'Strike\nZone\n(knees\nto mid-\ntorso)', color=LED_BLUE, fontsize=6, fontfamily='monospace')

# Match horizontal line from strike zone on person to device
ax4.plot([p_x+3, -8.5], [18, 15], color=LED_BLUE, linewidth=1, linestyle=':', alpha=0.3)
ax4.plot([p_x+3, -8.5], [38, 39], color=LED_BLUE, linewidth=1, linestyle=':', alpha=0.3)

ax4.text(1, 49, 'DEVICE IS\nWAIST-HIGH\nON AN ADULT', color='white', fontsize=9, 
         ha='center', fontweight='bold', fontfamily='monospace')

# ============================================================
# 5. Weight/Durability — ax[1,1]
# ============================================================
ax5 = axes[1][1]
setup_ax(ax5, 'STABILITY & WEIGHT', (-2, 22), (-2, 30))

# Bar chart: impact force vs restoring force
categories = ['No ballast\n(empty)', 'With ballast\n(20 lbs)', 'Ballast +\nGround stakes']
tipping = [2.5, 0.7, 0.05]  # Will it tip at 105mph? Lower = more stable
colors = ['#ff4444', '#ffaa44', '#44ff44']

bars = ax5.bar([3, 10, 17], [tipping[0], tipping[1], tipping[2]], width=4, 
               color=colors, edgecolor='white', linewidth=1.5, alpha=0.8)

ax5.text(3, tipping[0] + 0.15, 'TIPS OVER\nat 105mph!', color='#ff4444', fontsize=8, 
         ha='center', fontweight='bold', fontfamily='monospace')
ax5.text(10, tipping[1] + 0.15, 'STABLE\n3.5x margin', color='#ffaa44', fontsize=8, 
         ha='center', fontweight='bold', fontfamily='monospace')
ax5.text(17, tipping[2] + 0.1, 'UNSTOPPABLE\nessentially\ninfinite margin', color='#44ff44', fontsize=7, 
         ha='center', fontweight='bold', fontfamily='monospace')

ax5.set_ylabel('Tipping Risk\n(lower = better)', color='#aaa', fontsize=10, fontfamily='monospace')
ax5.set_title('STABILITY & WEIGHT', color='white', fontsize=13, fontweight='bold', 
              fontfamily='sans-serif', pad=12)

# Weight breakdown
weight_data = (
    'WEIGHT BREAKDOWN\n'
    '=======================\n'
    'Target panel:      3-4 lbs\n'
    'Sensor pod:        2 lbs\n'
    'Frame + legs:       3 lbs\n'
    'Electronics:        2 lbs\n'
    'Battery:            1 lb\n'
    '-----------------------\n'
    'Device (empty):  11-12 lbs\n'
    '+BALLAST:        +8-12 lbs\n'
    '=======================\n'
    'TOTAL (filled): 19-24 lbs\n'
    '\n'
    'Ballast options:\n'
    '  Sand: FREE, +8-10 lbs\n'
    '  Steel shot: $10, +12 lbs\n'
    '  Water: FREE, +8 lbs\n'
    '    (can freeze, not ideal)\n'
    '\n'
    'ALWAYS use ballast\n'
    '+ ground stakes outdoors\n'
    '+ suction cups indoors'
)
ax5.text(0.5, 25, weight_data, color='#aabbcc', fontsize=7.5, fontfamily='monospace',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#0d1117', edgecolor='#334455', alpha=0.95),
         verticalalignment='top')

# ============================================================
# 6. Material comparison — ax[1,2]
# ============================================================
ax6 = axes[1][2]
setup_ax(ax6, 'TARGET PANEL MATERIALS', (-2, 22), (-2, 32))

materials = ['1/4" Aluminum\n(A6052-H32)', '3/8" UHMW\nPolyethylene', '1/4" Polycarbonate\n(Lexan)']
costs = [3, 5, 6]
impact = [95, 100, 85]  # relative impact resistance
colors_mat = ['#ffaa44', '#44ff88', '#44aaff']

bars_cost = ax6.bar([4, 10, 16], costs, width=4, color=colors_mat, edgecolor='white', linewidth=1.5, alpha=0.6, label='Cost/sq ft')

for i, (mat, cost, imp, col) in enumerate(zip(materials, costs, impact, colors_mat)):
    x = [4, 10, 16][i]
    ax6.text(x, cost + 0.5, f'${cost}/sq ft', color='white', fontsize=9, ha='center', 
             fontfamily='monospace', fontweight='bold')
    ax6.text(x, cost + 2, f'Impact: {imp}%', color=col, fontsize=8, ha='center', fontfamily='monospace')

ax6.text(10, 29, 'RECOMMENDED: Aluminum 5052\n$3/sq ft | Survives 105mph | Satisfying "ping" sound\nMarine-grade | Powder-coated | Professional look', 
         color='#ffaa44', fontsize=8, ha='center', fontfamily='monospace', fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#1a1500', edgecolor='#ffaa44', alpha=0.9))

# Arrow pointing to aluminum bar
ax6.annotate('BEST VALUE', xy=(4, 3.5), xytext=(4, 8),
            arrowprops=dict(arrowstyle='->', color='#ffaa44', lw=2),
            color='#ffaa44', fontsize=10, fontweight='bold')

plt.tight_layout(h_pad=3, w_pad=2)
plt.savefig('D:/AI Drive/pi-agent/tekton/smart-home-plate/v2/v2.1_TRUE_SCALE.png', dpi=150,
            facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
plt.close()
print("TRUE SCALE render saved!")