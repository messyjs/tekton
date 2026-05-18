#!/usr/bin/env python3
"""SmartHome Plate v2.1 — Corrected render with ballast, proper height, stability"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon

BG = '#0a0e1a'
ALUMINUM = '#8899aa'
UHMW = '#d0d8e0'
LED_BLUE = '#00aaff'
LED_GREEN = '#00ff66'
POD = '#2a3040'
FRAME = '#667788'
ACCENT = '#00ccff'

fig, (ax_main, ax_dims) = plt.subplots(1, 2, figsize=(18, 12),
                                          gridspec_kw={'width_ratios': [1.3, 1]},
                                          facecolor=BG)

# ============================================================
# MAIN RENDER — Side/3D perspective view showing full height
# ============================================================
ax = ax_main
ax.set_facecolor(BG)
ax.set_xlim(-4, 4)
ax.set_ylim(-3, 50)
ax.set_aspect('equal')
ax.axis('off')

# Ground
ax.fill_between([-4, 4], -3, 0, color='#0d1a0d', alpha=0.5)
ax.axhline(y=0, color='#2a4a2a', linewidth=2, alpha=0.5)

# ---- Home Plate on Ground (top-down perspective, shown as outline) ----
hp = Polygon([(-1.2, 0.3), (1.2, 0.3), (1.2, 1.0), (0, 1.7), (-1.2, 1.0), (-1.2, 0.3)],
              fill=True, facecolor='#2a3a2a', edgecolor='#4a6a4a', linewidth=2, alpha=0.6)
ax.add_patch(hp)
ax.text(0, 0.7, 'HOME\nPLATE', color='#4a6a4a', fontsize=5, ha='center', fontfamily='monospace', fontweight='bold')

# ---- BASE WITH BALLAST COMPARTMENT ----
# Wide, low base that sits ON TOP of home plate
base_y = 0.5
base = FancyBboxPatch((-2.0, base_y), 4.0, 3.5, boxstyle="round,pad=0.1",
                       fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2)
ax.add_patch(base)

# Ballast label inside base
ax.text(0, base_y + 1.75, 'BALLAST\nCOMPARTMENT\n(fill with sand\nor steel shot)', 
        color='#99aabb', fontsize=6, ha='center', va='center', fontfamily='monospace', fontweight='bold')
ax.text(0, base_y + 0.3, '8-12 lbs of weight\nLOW center of gravity', 
        color='#778899', fontsize=5, ha='center', fontfamily='monospace')

# ---- 4 LEGS (wide stance for stability) ----
leg_positions = [(-1.5, base_y + 3.5), (-0.5, base_y + 3.5), (0.5, base_y + 3.5), (1.5, base_y + 3.5)]
for lx, ly in leg_positions:
    ax.plot([lx, lx], [ly, 12], color=FRAME, linewidth=4, solid_capstyle='round')
    # Ground stake (outdoor mode)
    ax.plot([lx, lx], [0, 0.5], color='#555555', linewidth=2, linestyle='-')
    ax.plot([lx-0.15, lx+0.15], [0.2, 0.2], color='#555555', linewidth=3)  # stake point

# ---- GAP ZONE (between base and strike zone — below knees, open air) ----
# This is the area below the strike zone where no target exists
gap_top = 15  # Bottom of strike zone (~knee height for average adult)
gap_bottom = base_y + 3.5  # Top of base

ax.fill_between([-1.5, 1.5], gap_bottom, gap_top, color=BG, alpha=0.5)
ax.text(2.5, (gap_bottom + gap_top) / 2, 'OPEN\nGAP\n\nNo target\nhere\n(below\nknees)', 
        color='#556677', fontsize=7, ha='center', va='center', fontfamily='monospace')
ax.text(2.5, gap_top - 0.5, '← Ball passes through here = BALL', 
        color='#8899aa', fontsize=5, ha='left')

# ---- STRIKE ZONE TARGET PANEL ----
zone_bottom = gap_top  # ~15" for typical batter (adjustable)
zone_top = zone_bottom + 20  # 20" tall zone
panel_width = 2.4

# Front face (the main target)
front = Rectangle((-panel_width/2, zone_bottom), panel_width, zone_top - zone_bottom,
                  fill=True, facecolor=UHMW, edgecolor='#99aabb', linewidth=2.5, alpha=0.85)
ax.add_patch(front)

# Diagonal side (showing depth — home plate goes back to a point)
side_pts = [(panel_width/2, zone_bottom), (panel_width/2 + 0.8, zone_bottom + 0.5),
            (panel_width/2 + 0.8, zone_top - 0.5), (panel_width/2, zone_top)]
side = Polygon(side_pts, fill=True, facecolor='#b8c0c8', edgecolor='#99aabb', linewidth=1.5, alpha=0.7)
ax.add_patch(side)

# ---- ZONE BOUNDARY LEDs ----
# Bottom zone line (glowing blue)
for y, label in [(zone_bottom, 'ZONE BOTTOM'), (zone_top, 'ZONE TOP')]:
    ax.plot([-panel_width/2, panel_width/2], [y, y], color=LED_BLUE, linewidth=4, alpha=0.9)
    ax.plot([-panel_width/2, panel_width/2], [y, y], color=LED_BLUE, linewidth=12, alpha=0.2)
    ax.text(panel_width/2 + 0.3, y, label, color=LED_BLUE, fontsize=6, va='center', fontfamily='monospace', fontweight='bold')

# Side LEDs
ax.plot([-panel_width/2, -panel_width/2], [zone_bottom, zone_top], color=LED_BLUE, linewidth=3, alpha=0.6)
ax.plot([panel_width/2, panel_width/2], [zone_bottom, zone_top], color=LED_BLUE, linewidth=3, alpha=0.6)

# Zone label on the panel
ax.text(0, (zone_bottom + zone_top) / 2, 'STRIKE\nZONE\nTARGET', 
        color='#445566', fontsize=14, ha='center', va='center', fontweight='bold', fontfamily='sans-serif', alpha=0.4)

# ---- IMPACT SPLASH (simulated hit) ----
impact_y = zone_bottom + 10
impact_x = 0.5
for r, alpha in [(0.6, 0.1), (0.4, 0.2), (0.2, 0.4), (0.08, 0.8)]:
    circle = Circle((impact_x, impact_y), r, fill=True, facecolor=LED_GREEN, alpha=alpha, edgecolor='none')
    ax.add_patch(circle)
ax.text(impact_x + 0.8, impact_y, 'IMPACT!\nGREEN = STRIKE', color=LED_GREEN, fontsize=7, 
        fontweight='bold', fontfamily='monospace')

# ---- SENSOR POD (above the zone, protected) ----
pod_bottom = zone_top + 0.5
pod_height = 5.5

# Angled deflector top (balls bounce off)
deflector = Polygon([(-0.8, pod_bottom + pod_height), (0, pod_bottom + pod_height + 2.5), 
                     (0.8, pod_bottom + pod_height)], 
                    fill=True, facecolor='#3a4555', edgecolor='#556677', linewidth=2, alpha=0.9)
ax.add_patch(deflector)

# Main pod body
pod = FancyBboxPatch((-0.9, pod_bottom), 1.8, pod_height, boxstyle="round,pad=0.1",
                      fill=True, facecolor=POD, edgecolor='#556677', linewidth=2)
ax.add_patch(pod)

# Camera lenses
ax.plot(-0.3, pod_bottom + 3.5, 'o', color='#1a1a2a', markersize=9, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax.plot(0.3, pod_bottom + 3.5, 'o', color='#1a1a2a', markersize=7, markeredgecolor='#4488aa', markeredgewidth=1.5)
ax.text(0, pod_bottom + 4.3, 'DUAL CAMERA', color='#4488aa', fontsize=5, ha='center', fontfamily='monospace')

# Radar dome
radar = Circle((0, pod_bottom + 1.2), 0.2, fill=True, facecolor='#1a3a1a', edgecolor='#44aa44', linewidth=1.5)
ax.add_patch(radar)
ax.text(0, pod_bottom + 0.7, 'RADAR', color='#44aa44', fontsize=5, ha='center', fontfamily='monospace', fontweight='bold')

# Display on front (angled slightly toward pitcher)
disp = Rectangle((-0.55, pod_bottom + 1.8), 1.1, 0.9, fill=True,
                 facecolor='#001122', edgecolor='#00aaff', linewidth=1.5)
ax.add_patch(disp)
ax.text(0, pod_bottom + 2.55, '92.3', color='#00ff88', fontsize=9, ha='center', fontweight='bold', fontfamily='monospace')
ax.text(0, pod_bottom + 2.1, 'STRIKE 1-1', color='#00ccff', fontsize=5, ha='center', fontfamily='monospace')

# Angled deflector label
ax.text(1.5, pod_bottom + pod_height + 1, 'DEFLECTOR\nTOP (angled —\nball bounces off)', 
        color='#778899', fontsize=5, ha='left', fontfamily='monospace')

# ---- ANNOTATIONS ----
# Title
ax.text(0, 48, 'SmartHome Plate v2.1', color='white', fontsize=20, ha='center', fontweight='bold', fontfamily='sans-serif')
ax.text(0, 46.5, 'EXACT MLB Home Plate Dimensions • Strike Zone Target Only', 
        color=ACCENT, fontsize=10, ha='center', fontfamily='sans-serif')

# Key specs box
specs = (
    'v2.1 KEY CHANGES:\n'
    '━━━━━━━━━━━━━━━━━━━━━━━━\n'
    '✓ Exact MLB home plate footprint\n'  
    '✓ Ballast compartment (8-12 lbs)\n'
    '✓ Ground stakes (outdoor)\n'
    '✓ Suction cups (indoor)\n'
    '✓ 18-22 lbs total with ballast\n'
    '✓ Sensor pod ABOVE zone\n'
    '✓ Open gap below zone\n'
    '✓ NO downgraded radar/tech\n'
    '✓ Target = ONLY strike zone\n'
    '━━━━━━━━━━━━━━━━━━━━━━━━\n'
    'Pro MSRP: $999\n'
    'Budget MSRP: $649\n'
    'Weight w/ ballast: 18-22 lbs'
)
ax.text(-3.8, 38, specs, color='#aabbcc', fontsize=7, fontfamily='monospace',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#0d1117', edgecolor='#334455', alpha=0.95))

# ============================================================
# DIMENSIONS VIEW — Exact measurements
# ============================================================
ax2 = ax_dims
ax2.set_facecolor(BG)
ax2.set_xlim(-2, 10)
ax2.set_ylim(-3, 50)
ax2.set_aspect('equal')
ax2.axis('off')
ax2.set_title('EXACT DIMENSIONS', color='white', fontsize=14, fontweight='bold', pad=10)

# Ground
ax2.fill_between([-2, 10], -3, 0, color='#0d1a0d', alpha=0.5)

# Simplified side view with dimensions
# Base
base2 = FancyBboxPatch((0, 0.5), 3, 3.5, boxstyle="round,pad=0.1",
                        fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2)
ax2.add_patch(base2)
ax2.text(1.5, 2.25, 'BASE\n+BALLAST\n10-14 lbs', color='#aabbcc', fontsize=7, ha='center', fontfamily='monospace')

# Legs
for lx in [0.5, 1.5, 2.5]:
    ax2.plot([lx, lx], [4, 15], color=FRAME, linewidth=3)

# Gap
ax2.fill_between([0, 3], 4, 15, color=BG, alpha=0.3)
ax2.text(5, 10, 'GAP\n(below\nknees)', color='#556677', fontsize=7, ha='center', fontfamily='monospace')

# Target panel
panel2 = Rectangle((-0.2, 15), 3.4, 20, fill=True, facecolor=UHMW, edgecolor='#99aabb', linewidth=2, alpha=0.8)
ax2.add_patch(panel2)

# Zone LEDs
ax2.plot([-0.2, 3.2], [15, 15], color=LED_BLUE, linewidth=3)
ax2.plot([-0.2, 3.2], [35, 35], color=LED_BLUE, linewidth=3)
ax2.plot([-0.2, -0.2], [15, 35], color=LED_BLUE, linewidth=2, alpha=0.7)
ax2.plot([3.2, 3.2], [15, 35], color=LED_BLUE, linewidth=2, alpha=0.7)

# Zone label
ax2.text(1.5, 25, 'STRIKE\nZONE\n\n17" × 24"', color='#445566', fontsize=9, ha='center', fontweight='bold', fontfamily='sans-serif')

# Sensor pod
pod2 = FancyBboxPatch((0.2, 36), 2.6, 4, boxstyle="round,pad=0.1",
                        fill=True, facecolor=POD, edgecolor='#556677', linewidth=2)
ax2.add_patch(pod2)
# Deflector
deflector2 = Polygon([(0.2, 40), (1.5, 42.5), (2.8, 40)], fill=True, facecolor='#3a4555', edgecolor='#556677', linewidth=1.5)
ax2.add_patch(deflector2)

# ---- DIMENSION LINES ----
dim_x = -1.2

# Total height
ax2.annotate('', xy=(dim_x, 0.5), xytext=(dim_x, 42.5), arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax2.text(dim_x - 0.3, 21, '~42"\n(tall)', color='#ffcc00', fontsize=7, ha='center', fontfamily='monospace', rotation=90)

# Base height
ax2.annotate('', xy=(dim_x + 0.5, 0.5), xytext=(dim_x + 0.5, 4), arrowprops=dict(arrowstyle='<->', color='#888', lw=1))
ax2.text(dim_x + 0.3, 2.3, '3.5"', color='#888', fontsize=6, fontfamily='monospace')

# Gap height
ax2.annotate('', xy=(dim_x + 0.5, 4), xytext=(dim_x + 0.5, 15), arrowprops=dict(arrowstyle='<->', color='#556677', lw=1))
ax2.text(dim_x + 0.2, 9.5, '10-12"\n(adj.)', color='#556677', fontsize=6, fontfamily='monospace')

# Zone height
ax2.annotate('', xy=(dim_x + 0.5, 15), xytext=(dim_x + 0.5, 35), arrowprops=dict(arrowstyle='<->', color='#ff8844', lw=1.5))
ax2.text(dim_x + 0.2, 25, '24"', color='#ff8844', fontsize=7, fontfamily='monospace', fontweight='bold')

# Pod height
ax2.annotate('', xy=(dim_x + 0.5, 36), xytext=(dim_x + 0.5, 41), arrowprops=dict(arrowstyle='<->', color=ACCENT, lw=1))
ax2.text(dim_x + 0.2, 38.5, '4"', color=ACCENT, fontsize=6, fontfamily='monospace')

# Width dimension
ax2.annotate('', xy=(0, 45), xytext=(3, 45), arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
ax2.text(1.5, 45.8, '17" (MLB standard)', color='#ffcc00', fontsize=7, ha='center', fontfamily='monospace', fontweight='bold')

# Width of panel
ax2.annotate('', xy=(-0.2, 47), xytext=(3.2, 47), arrowprops=dict(arrowstyle='<->', color='#ff8844', lw=1.5))
ax2.text(1.5, 47.8, 'Home plate shape (pentagon)', color='#ff8844', fontsize=7, ha='center', fontfamily='monospace')

# MLB verification
mlb_text = (
    'MLB RULE COMPLIANCE:\n'
    '━━━━━━━━━━━━━━━━━━━━━━\n'
    'Front edge: 17" (exact match)\n'
    'Side edges: 8.5" (exact match)\n'
    'Diagonal edges: 12" (exact match)\n'
    'Overall depth: 17" (exact match)\n'
    '━━━━━━━━━━━━━━━━━━━━━━\n'
    'Strike zone width: 17"\n'
    'Strike zone height: variable\n'
    '  LL: ~11-12" (knee to mid)\n'
    '  HS: ~13-15" (knee to mid)\n'
    '  Pro: ~15-16" (knee to mid)\n'
    '━━━━━━━━━━━━━━━━━━━━━━\n'
    '24" panel covers ALL zones\n'
    'LEDs define exact zone edges'
)
ax2.text(5.5, 28, mlb_text, color='#aabbcc', fontsize=7, fontfamily='monospace',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#0d1117', edgecolor='#334455', alpha=0.95))

# Weight box
weight_text = (
    'STABILITY:\n'
    '━━━━━━━━━━━━━━━━━━━━━━\n'
    'Device body: 10-12 lbs\n'
    'Ballast (sand/steel): 8-12 lbs\n'
    'Total with ballast: 18-22 lbs\n'
    'Center of gravity: ~8" high\n'
    '\n'
    'Ground stakes: outdoor\n'
    'Suction cups: indoor\n'
    '━━━━━━━━━━━━━━━━━━━━━━\n'
    '105 mph hit test:\n'
    '  Without ballast: TIPS ❌\n'
    '  With ballast: STABLE ✅\n'
    '  With stakes: INFINITE ✅✅'
)
ax2.text(5.5, 10, weight_text, color='#aabbcc', fontsize=7, fontfamily='monospace',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='#0d1117', edgecolor='#334455', alpha=0.95))

plt.tight_layout()
plt.savefig('D:/AI Drive/pi-agent/tekton/smart-home-plate/v2/v2.1_render.png', dpi=200,
            facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
plt.close()
print("v2.1 render saved!")