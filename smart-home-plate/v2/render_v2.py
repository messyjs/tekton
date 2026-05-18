#!/usr/bin/env python3
"""SmartHome Plate v2 — Redesigned render: strike zone target + sensor pod"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon, FancyArrowPatch
from matplotlib.lines import Line2D

# ---- Color Palette ----
BG = '#0a0e1a'
ALUMINUM = '#8899aa'
UHMW_WHITE = '#e0e4e8'
LED_BLUE = '#00aaff'
LED_GREEN = '#00ff66'
LED_RED = '#ff3344'
POD_DARK = '#2a3040'
DISPLAY_BG = '#001122'
DISPLAY_GREEN = '#00ff88'
FRAME = '#667788'
ACCENT = '#00ccff'

fig, (ax_main, ax_side, ax_top) = plt.subplots(1, 3, figsize=(18, 10), 
                                                  gridspec_kw={'width_ratios': [2, 1.2, 1]},
                                                  facecolor=BG)

# ============================================================
# MAIN VIEW — 3/4 Perspective of the v2 design
# ============================================================
ax = ax_main
ax.set_facecolor(BG)
ax.set_xlim(-3, 3)
ax.set_ylim(-1, 6.5)
ax.set_aspect('equal')
ax.axis('off')

# Ground
ax.fill_between([-3, 3], -1, 0, color='#0d1a0d', alpha=0.5)
ax.axhline(y=0, color='#2a4a2a', linewidth=2, alpha=0.5)

# ---- Home Plate Outline on Ground ----
hp_pts = [(-1.7, 0.3), (1.7, 0.3), (1.7, 1.0), (0, 2.7), (-1.7, 1.0), (-1.7, 0.3)]
hp_ground = Polygon([(-1.0, 0.02), (1.0, 0.02), (1.0, 0.35), (0, 0.85), (-1.0, 0.35)],
                     fill=True, facecolor='#334455', edgecolor='#556677', linewidth=2, alpha=0.6)
ax.add_patch(hp_ground)
ax.text(0, 0.15, 'HOME PLATE', color='#667788', fontsize=7, ha='center', fontweight='bold', fontfamily='monospace')

# ---- 4 Legs ----
leg_positions = [(-0.8, 0.35), (0.8, 0.35), (0.35, 0.7), (-0.35, 0.7)]
for lx, ly in leg_positions:
    # Outer leg
    ax.plot([lx, lx], [0.1, 2.5], color=FRAME, linewidth=4, solid_capstyle='round')
    # Inner leg (telescoping)
    ax.plot([lx, lx], [2.3, 3.8], color='#8899aa', linewidth=3, solid_capstyle='round')
    # Twist lock at joint
    ax.plot([lx-0.08, lx+0.08], [2.4, 2.4], color='#556677', linewidth=4)
    # Rubber foot
    ax.plot(lx, 0.05, 's', color='#333', markersize=8)

# ---- Frame Ring (horizontal support at zone bottom) ----
frame_y = 2.8
# Front frame bar
ax.plot([-1.0, 1.0], [frame_y, frame_y], color=FRAME, linewidth=3.5, solid_capstyle='round')
# Side frame bars (simplified, going back)
ax.plot([1.0, 0.7], [frame_y, frame_y+0.3], color=FRAME, linewidth=3, solid_capstyle='round')
ax.plot([-1.0, -0.7], [frame_y, frame_y+0.3], color=FRAME, linewidth=3, solid_capstyle='round')

# ---- STRIKE ZONE TARGET PANEL ----
# This is the key element — thin panel, only in the zone area
zone_bottom = 2.8
zone_top = 5.0
zone_width = 2.0  # front face width (17" scaled)

# Front face (the one facing pitcher)
front_panel = Rectangle((-zone_width/2, zone_bottom), zone_width, zone_top-zone_bottom,
                        fill=True, facecolor='#d0d8e0', edgecolor='#8899aa', linewidth=2.5,
                        alpha=0.85)
ax.add_patch(front_panel)

# Panel surface texture (light lines)
for y_line in np.arange(zone_bottom+0.15, zone_top, 0.2):
    ax.plot([-zone_width/2+0.05, zone_width/2-0.05], [y_line, y_line],
            color='#b0bcc8', linewidth=0.5, alpha=0.4)

# ---- Zone boundary LEDs (top and bottom glow) ----
# Bottom boundary line (glowing blue)
ax.plot([-zone_width/2, zone_width/2], [zone_bottom, zone_bottom], 
        color=LED_BLUE, linewidth=4, alpha=0.9)
ax.plot([-zone_width/2, zone_width/2], [zone_bottom, zone_bottom], 
        color=LED_BLUE, linewidth=10, alpha=0.2)

# Top boundary line (glowing blue)
ax.plot([-zone_width/2, zone_width/2], [zone_top, zone_top], 
        color=LED_BLUE, linewidth=4, alpha=0.9)
ax.plot([-zone_width/2, zone_width/2], [zone_top, zone_top], 
        color=LED_BLUE, linewidth=10, alpha=0.2)

# Vertical side LEDs
ax.plot([-zone_width/2, -zone_width/2], [zone_bottom, zone_top], 
        color=LED_BLUE, linewidth=3, alpha=0.7)
ax.plot([zone_width/2, zone_width/2], [zone_bottom, zone_top], 
        color=LED_BLUE, linewidth=3, alpha=0.7)

# Zone label
ax.text(0, (zone_bottom+zone_top)/2, 'STRIKE\nZONE', color='#334455', fontsize=16, 
        ha='center', va='center', fontweight='bold', fontfamily='sans-serif', alpha=0.5)

# ---- Impact splash (simulated hit) ----
impact_x = 0.3
impact_y = 4.2
# Green splash
for r, alpha in [(0.35, 0.15), (0.2, 0.25), (0.1, 0.5)]:
    circle = Circle((impact_x, impact_y), r, fill=True, facecolor=LED_GREEN, 
                     alpha=alpha, edgecolor='none')
    ax.add_patch(circle)
ax.text(impact_x, impact_y, '*', color=LED_GREEN, fontsize=14, ha='center', va='center', fontweight='bold')

# ---- SENSOR POD (on top) ----
pod_bottom = zone_top + 0.15
pod_height = 0.9
pod_width = 1.2

# Main pod body
pod = FancyBboxPatch((-pod_width/2, pod_bottom), pod_width, pod_height,
                      boxstyle="round,pad=0.08", fill=True, facecolor=POD_DARK, 
                      edgecolor='#445566', linewidth=2)
ax.add_patch(pod)

# Camera lenses (armored windows)
ax.plot(-0.25, pod_bottom+0.6, 'o', color='#1a1a2a', markersize=8, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax.plot(0.25, pod_bottom+0.6, 'o', color='#1a1a2a', markersize=7, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax.text(-0.25, pod_bottom+0.75, '4K', color='#4488aa', fontsize=5, ha='center', fontfamily='monospace')
ax.text(0.25, pod_bottom+0.75, '120fps', color='#4488aa', fontsize=4, ha='center', fontfamily='monospace')

# Radar dome
radar = Circle((0, pod_bottom+0.25), 0.12, fill=True, facecolor='#1a3a1a', 
               edgecolor='#44aa44', linewidth=1.5)
ax.add_patch(radar)
ax.text(0, pod_bottom+0.07, 'RADAR', color='#44aa44', fontsize=4, ha='center', fontfamily='monospace')

# Display on front face  
disp_w = 0.8
disp_h = 0.4
disp = Rectangle((-disp_w/2, pod_bottom+0.15), disp_w, disp_h, fill=True,
                 facecolor=DISPLAY_BG, edgecolor='#0088ff', linewidth=1.5)
ax.add_patch(disp)
ax.text(0, pod_bottom+0.43, '92.3', color=DISPLAY_GREEN, fontsize=9, ha='center', fontweight='bold', fontfamily='monospace')
ax.text(0, pod_bottom+0.28, 'STRIKE 1-1', color='#00ccff', fontsize=5, ha='center', fontfamily='monospace')

# Pod label
ax.text(0, pod_bottom+pod_height+0.08, 'SENSOR POD', color=ACCENT, fontsize=7, ha='center', fontweight='bold', fontfamily='monospace')

# ---- Callout Annotations ----
callouts = [
    (2.2, 4.5, 'TARGET PANEL\nAluminum 5052 or UHMW\n1/4" thick, impact-proof', '#ffaa44'),
    (2.2, 3.0, 'LED ZONE BOUNDARIES\nBlue = Active Strike Zone\nGreen = Strike hit\nRed = Ball (missed zone)', LED_GREEN),
    (2.2, 5.5, 'SENSOR POD\nProtected housing\nCameras + Radar + Display\nBall never reaches this', ACCENT),
    (-2.5, 1.5, 'ADJUSTABLE LEGS\n4x aluminum tubes\nTwist-lock height\n15" to 24" zone height', '#888'),
]

for cx, cy, text, color in callouts:
    ax.text(cx, cy, text, color=color, fontsize=7, fontweight='bold', fontfamily='monospace',
            bbox=dict(boxstyle='round,pad=0.4', facecolor=BG, edgecolor=color, alpha=0.9),
            va='center')

# Dotted lines connecting callouts to features
ax.plot([1.0, 2.1], [3.9, 4.5], '--', color='#ffaa44', linewidth=0.8, alpha=0.5)
ax.plot([zone_width/2, 2.1], [zone_bottom, 3.0], '--', color=LED_GREEN, linewidth=0.8, alpha=0.5)

# ---- Key Specs ----
ax.text(-2.8, 6.3, 'SmartHome Plate v2', color='white', fontsize=16, fontweight='bold', fontfamily='sans-serif')
ax.text(-2.8, 6.0, 'Precision Strike Zone Target + Sensor Pod', color=ACCENT, fontsize=10, fontfamily='sans-serif')

specs_text = (
    'TARGET: 17" × 15-24" adjustable zone\n'
    'MATERIAL: Aluminum 5052 or UHMW\n'
    'IMPACT: Survives 105+ mph\n'
    'WEIGHT: ~10-12 lbs\n'  
    'BATTERY: 4-6 hours\n'
    'COST: ~$654 materials (Pro)\n'
    'MSRP: $999 Pro / $599 Budget'
)
ax.text(-2.8, -0.5, specs_text, color='#8899aa', fontsize=7, fontfamily='monospace',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#0d1117', edgecolor='#334455', alpha=0.9))

# ============================================================
# SIDE VIEW — Depth/height comparison
# ============================================================
ax2 = ax_side
ax2.set_facecolor(BG)
ax2.set_xlim(-2, 2)
ax2.set_ylim(-0.5, 7)
ax2.set_aspect('equal')
ax2.axis('off')
ax2.set_title('SIDE VIEW', color='white', fontsize=12, fontweight='bold', pad=10)

# Ground
ax2.fill_between([-2, 2], -0.5, 0, color='#0d1a0d', alpha=0.5)

# Legs
leg_x = 0.5
ax2.plot([leg_x, leg_x], [0.05, 2.8], color=FRAME, linewidth=6, solid_capstyle='round')
ax2.plot([leg_x, leg_x], [2.5, 4.2], color='#8899aa', linewidth=5, solid_capstyle='round')
ax2.plot([leg_x-0.15, leg_x+0.15], [2.65, 2.65], color='#556677', linewidth=5)

# Target panel (side profile — thin!)
panel = Rectangle((-0.15, 2.8), 0.3, 2.2, fill=True, facecolor='#d0d8e0', 
                  edgecolor='#8899aa', linewidth=2)
ax2.add_patch(panel)

# Sensor pod (side)
pod2 = FancyBboxPatch((-0.4, 5.15), 0.8, 0.7, boxstyle="round,pad=0.06",
                       fill=True, facecolor=POD_DARK, edgecolor='#445566', linewidth=2)
ax2.add_patch(pod2)

# Zone LEDs
ax2.plot([-0.15, -0.15], [2.8, 5.0], color=LED_BLUE, linewidth=3, alpha=0.7)
ax2.plot([0.15, 0.15], [2.8, 5.0], color=LED_BLUE, linewidth=3, alpha=0.7)
for y in [2.8, 5.0]:
    ax2.plot([-0.2, 0.2], [y, y], color=LED_BLUE, linewidth=4, alpha=0.8)

# Dimensions
ax2.annotate('', xy=(0.8, 2.8), xytext=(0.8, 0.05), arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax2.text(1.2, 1.4, 'Legs\n(adj.)', color='#ffcc00', fontsize=7, fontfamily='monospace', va='center')

ax2.annotate('', xy=(-0.8, 2.8), xytext=(-0.8, 5.0), arrowprops=dict(arrowstyle='<->', color='#ff8844', lw=1.5))
ax2.text(-1.6, 3.9, 'Strike\nZone', color='#ff8844', fontsize=7, fontfamily='monospace', va='center')

ax2.annotate('', xy=(0.8, 5.15), xytext=(0.8, 5.85), arrowprops=dict(arrowstyle='<->', color=ACCENT, lw=1.5))
ax2.text(1.2, 5.5, 'Sensor\nPod', color=ACCENT, fontsize=7, fontfamily='monospace', va='center')

# Thin panel callout
ax2.text(0, 6.5, 'Target is only\n1/4" thick!', color='#ffaa44', fontsize=8, 
         ha='center', fontweight='bold', fontfamily='monospace')


# ============================================================
# TOP VIEW — Home plate shape
# ============================================================
ax3 = ax_top
ax3.set_facecolor(BG)
ax3.set_xlim(-3, 3)
ax3.set_ylim(-1, 5)
ax3.set_aspect('equal')
ax3.axis('off')
ax3.set_title('TOP VIEW (Home Plate Shape)', color='white', fontsize=12, fontweight='bold', pad=10)

# Home plate pentagon
hp = np.array([(-1.7, 0), (1.7, 0), (1.7, 0.85), (0, 1.7), (-1.7, 0.85), (-1.7, 0)])
hp_poly = Polygon(hp, fill=True, facecolor='#d0d8e0', edgecolor='#8899aa', linewidth=2.5, alpha=0.8)
ax3.add_patch(hp_poly)

# Zone outline glow
hp_zone = Polygon(hp, fill=False, edgecolor=LED_BLUE, linewidth=4, alpha=0.6)
ax3.add_patch(hp_zone)

# Sensor pod (center-ish)
pod_top = Circle((0, 0.5), 0.4, fill=True, facecolor=POD_DARK, edgecolor='#445566', linewidth=2)
ax3.add_patch(pod_top)

# Camera positions
ax3.plot(-0.15, 0.6, 'o', color='#1a1a2a', markersize=6, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax3.plot(0.15, 0.6, 'o', color='#1a1a2a', markersize=5, markeredgecolor='#4488aa', markeredgewidth=1.5)

# Radar
radar_top = Circle((0, 0.3), 0.1, fill=True, facecolor='#1a3a1a', edgecolor='#44aa44', linewidth=1.5)
ax3.add_patch(radar_top)

# Leg positions
for lx, ly in [(-0.8, 0.2), (0.8, 0.2), (0.35, 1.2), (-0.35, 1.2)]:
    ax3.plot(lx, ly, 's', color=FRAME, markersize=8)

# Labels
ax3.text(0, -0.3, 'FRONT (faces pitcher)', color='#aaccee', fontsize=7, ha='center', fontfamily='monospace')
ax3.text(0, 2.1, 'BACK (faces catcher)', color='#8899aa', fontsize=7, ha='center', fontfamily='monospace')
ax3.text(0, 0.5, 'Sensor\nPod', color=ACCENT, fontsize=6, ha='center', fontfamily='monospace', fontweight='bold')

# Dimensions
ax3.annotate('', xy=(-1.7, 2.4), xytext=(1.7, 2.4), arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax3.text(0, 2.6, '17" (431.8mm)', color='#ffcc00', fontsize=7, ha='center', fontfamily='monospace')

ax3.annotate('', xy=(2.0, 0), xytext=(2.0, 0.85), arrowprops=dict(arrowstyle='<->', color='#ff8844', lw=1.5))
ax3.text(2.4, 0.4, '8.5"', color='#ff8844', fontsize=6, fontfamily='monospace')

# Material labels on the panel
ax3.text(0, 0.9, '1/4" Aluminum 5052\nor 3/8" UHMW\n(impact-proof)', 
         color='#334455', fontsize=7, ha='center', va='center', fontfamily='monospace', fontweight='bold')

plt.tight_layout()
plt.savefig('D:/AI Drive/pi-agent/tekton/smart-home-plate/v2/v2_render.png', dpi=200, 
            facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
plt.close()
print("v2 render saved!")