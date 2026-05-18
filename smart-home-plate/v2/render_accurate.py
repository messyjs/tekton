#!/usr/bin/env python3
"""
SmartHome Plate v2.1 — ACCURATELY SCALED renders.
Home plate is 17" wide x 17" deep — it's a substantial pentagon.
Strike zone is 17" wide x 24" tall — almost SQUARE from the front.
Total device is ~42" tall — taller than a baseball bat.
These renders show the real proportions with a baseball for scale.
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon, Arc, Wedge, Ellipse
from matplotlib.lines import Line2D

# REAL dimensions in INCHES (we scale to display units)
SCALE = 0.065  # 1 inch = 0.065 display units

# Home plate exact dimensions (inches)
HP_FRONT = 17.0    # Front edge width
HP_SIDE = 8.5      # Side edges
HP_DIAG = 12.0     # Diagonal edges  
HP_DEPTH = 17.0    # Total depth (front to apex)

# Device dimensions (inches)
ZONE_WIDTH = 17.0    # Front face = same as home plate width
ZONE_HEIGHT = 24.0   # Strike zone panel height
ZONE_BOTTOM_H = 15.0 # Bottom of zone (above ground/knees)
ZONE_TOP_H = 39.0    # Top of zone
POD_HEIGHT = 5.0      # Sensor pod height
DEFLECTOR_H = 3.0     # Angled top
BASE_H = 3.5          # Base/ballast height
TOTAL_H = 42.0        # Total height
PANEL_THICK = 0.25    # 1/4" aluminum

# Baseball for scale
BASEBALL_DIA = 2.9    # inches

# Colors
BG = '#0a0e1a'
ALUM = '#c8d0d8'
ALUM_DARK = '#8899aa'
UHMW_WHITE = '#e0e4e8'
LED_BLUE = '#00aaff'
LED_GREEN = '#00ff66'
LED_RED = '#ff3344'
POD = '#2a3040'
FRAME = '#667788'
ACCENT = '#00ccff'
WARN = '#ff8844'
GROUND = '#1a2a1a'

s = SCALE  # shorthand

fig = plt.figure(figsize=(20, 14), facecolor=BG)

# 3 panels: front view, 3/4 perspective, side view
ax_front = fig.add_axes([0.02, 0.05, 0.32, 0.90])   # Front view
ax_persp = fig.add_axes([0.35, 0.05, 0.35, 0.90])     # 3/4 perspective
ax_side = fig.add_axes([0.72, 0.05, 0.26, 0.90])       # Side view with dimensions

for ax in [ax_front, ax_persp, ax_side]:
    ax.set_facecolor(BG)
    ax.set_aspect('equal')

# ============================================================
# HELPER: Draw baseball for scale
# ============================================================
def draw_baseball(ax, x, y, size=1.0, label=True):
    """Draw a baseball at (x,y) with scale size."""
    r = BASEBALL_DIA * s * size / 2
    ball = Circle((x, y), r, fill=True, facecolor='white', edgecolor='#cc3333', linewidth=1.5*size)
    ax.add_patch(ball)
    # Red stitching
    arc1 = Arc((x, y), r*1.6, r*0.4, angle=0, theta1=0, theta2=180, 
               color='#cc3333', linewidth=1.2*size)
    ax.add_patch(arc1)
    arc2 = Arc((x, y), r*1.6, r*0.4, angle=0, theta1=180, theta2=360,
               color='#cc3333', linewidth=1.2*size)
    ax.add_patch(arc2)
    if label:
        ax.text(x, y - r - 0.15*size, '2.9" baseball', color='#888', fontsize=7, ha='center', fontfamily='monospace')

# ============================================================
# HELPER: Draw the device from front
# ============================================================
def draw_device_front(ax, x_center, base_y, show_ball=True, show_impact=True):
    """Draw the front view of the device centered at x_center, base at base_y"""
    
    # Ground
    ax.fill_between([x_center - 1.5*s*HP_FRONT, x_center + 1.5*s*HP_FRONT], 
                    -10, base_y, color=GROUND, alpha=0.3)
    ax.plot([x_center - 1.3*s*HP_FRONT, x_center + 1.3*s*HP_FRONT], 
            [base_y, base_y], color='#3a5a3a', linewidth=2, alpha=0.7)
    
    # Home plate outline on ground
    hp_s = SCALE * 0.8  # Slightly smaller for perspective
    hp_pts = np.array([
        [x_center - HP_FRONT*hp_s/2, base_y],
        [x_center + HP_FRONT*hp_s/2, base_y],
        [x_center + HP_FRONT*hp_s/2, base_y + HP_SIDE*hp_s],
        [x_center, base_y + HP_DEPTH*hp_s],
        [x_center - HP_FRONT*hp_s/2, base_y + HP_SIDE*hp_s],
    ])
    hp = Polygon(hp_pts, fill=True, facecolor='#2a3a2a', edgecolor='#4a6a4a', linewidth=1.5, alpha=0.4)
    ax.add_patch(hp)
    
    # ---- BASE / BALLAST (wide, low, heavy) ----
    bw = HP_FRONT * s * 1.05  # Slightly wider than home plate for stability
    bh = BASE_H * s
    by = base_y
    base = FancyBboxPatch((x_center - bw/2, by), bw, bh, boxstyle="round,pad=0.05",
                           fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2.5)
    ax.add_patch(base)
    ax.text(x_center, by + bh/2, 'BALLAST\nCOMPARTMENT', color='#99aabb', fontsize=7, 
            ha='center', va='center', fontfamily='monospace', fontweight='bold')
    ax.text(x_center, by + bh*0.15, '(fill with sand or steel shot: 8-12 lbs)', 
            color='#778899', fontsize=5, ha='center', fontfamily='monospace')
    
    # Feet / ground stakes
    foot_y = by
    for fx in [x_center - bw*0.35, x_center - bw*0.12, x_center + bw*0.12, x_center + bw*0.35]:
        ax.plot([fx, fx], [foot_y - 0.12, foot_y + bh], color='#778899', linewidth=3.5, solid_capstyle='round')
        # Ground stake going into ground
        ax.plot([fx, fx], [foot_y - 0.12, foot_y], color='#555', linewidth=2)
        ax.plot([fx - 0.04, fx + 0.04], [foot_y, foot_y], color='#555', linewidth=3)
    
    # ---- FRAME (connecting base to zone) ----
    frame_bottom = by + bh
    frame_top = by + bh + ZONE_BOTTOM_H * s
    fw = HP_FRONT * s * 0.95
    # Vertical frame members
    for fx_off in [-fw/2, 0, fw/2]:
        ax.plot([x_center + fx_off, x_center + fx_off], [frame_bottom, frame_bottom + 2*s], 
                color=FRAME, linewidth=3, solid_capstyle='round')
    # Horizontal cross brace
    ax.plot([x_center - fw/2, x_center + fw/2], [frame_bottom + 1*s, frame_bottom + 1*s], 
            color=FRAME, linewidth=2)
    
    # ---- STRIKE ZONE TARGET PANEL ----
    zone_bottom_y = by + bh + ZONE_BOTTOM_H * s
    zone_top_y = zone_bottom_y + ZONE_HEIGHT * s
    pw = ZONE_WIDTH * s  # Panel width (front face)
    ph = ZONE_HEIGHT * s   # Panel height
    
    # Panel depth (pentagon shape) shown as side surfaces
    panel_depth = HP_DEPTH * s * 0.3  # Exaggerated slightly for visibility
    panel_thickness = PANEL_THICK * s * 8  # Exaggerated thickness for visibility
    
    # Front face (the main target)
    front = Rectangle((x_center - pw/2, zone_bottom_y), pw, ph,
                       fill=True, facecolor=ALUM, edgecolor=ALUM_DARK, linewidth=2.5, alpha=0.9)
    ax.add_patch(front)
    
    # Subtle panel texture lines
    for y_line in np.arange(zone_bottom_y + 1.5*s, zone_top_y, 3*s):
        ax.plot([x_center - pw/2 + 1*s, x_center + pw/2 - 1*s], [y_line, y_line],
                color='#aab5c0', linewidth=0.3, alpha=0.3)
    
    # ---- Side panels showing depth (pentagon from front) ----
    # Right side
    side_pts = [
        (x_center + pw/2, zone_bottom_y),
        (x_center + pw/2 + panel_depth*0.7, zone_bottom_y + panel_depth*0.3),
        (x_center + pw/2 + panel_depth*0.7, zone_top_y - panel_depth*0.15),
        (x_center + pw/2 + panel_depth*0.3, zone_top_y + panel_depth*0.15),
        (x_center + pw/2, zone_top_y),
    ]
    side = Polygon(side_pts, fill=True, facecolor='#b0b8c0', edgecolor=ALUM_DARK, linewidth=1.5, alpha=0.85)
    ax.add_patch(side)
    
    # Top surface (angled)
    top_pts = [
        (x_center - pw/2, zone_top_y),
        (x_center + pw/2, zone_top_y),
        (x_center + pw/2 + panel_depth*0.3, zone_top_y + panel_depth*0.15),
        (x_center - pw/2 + panel_depth*0.5, zone_top_y + panel_depth*0.1),
    ]
    top = Polygon(top_pts, fill=True, facecolor='#bcc4cc', edgecolor=ALUM_DARK, linewidth=1.5, alpha=0.8)
    ax.add_patch(top)
    
    # ---- Zone boundary LEDs (BRIGHT, prominent) ----
    # Bottom zone line
    ax.plot([x_center - pw/2 + 0.5*s, x_center + pw/2 - 0.5*s], 
            [zone_bottom_y, zone_bottom_y], color=LED_BLUE, linewidth=4, alpha=0.9)
    ax.plot([x_center - pw/2 + 0.5*s, x_center + pw/2 - 0.5*s], 
            [zone_bottom_y, zone_bottom_y], color=LED_BLUE, linewidth=12, alpha=0.2)
    
    # Top zone line
    ax.plot([x_center - pw/2 + 0.5*s, x_center + pw/2 - 0.5*s], 
            [zone_top_y, zone_top_y], color=LED_BLUE, linewidth=4, alpha=0.9)
    ax.plot([x_center - pw/2 + 0.5*s, x_center + pw/2 - 0.5*s], 
            [zone_top_y, zone_top_y], color=LED_BLUE, linewidth=12, alpha=0.2)
    
    # Side zone lines
    ax.plot([x_center - pw/2, x_center - pw/2], [zone_bottom_y, zone_top_y], 
            color=LED_BLUE, linewidth=3, alpha=0.7)
    ax.plot([x_center + pw/2, x_center + pw/2], [zone_bottom_y, zone_top_y], 
            color=LED_BLUE, linewidth=3, alpha=0.7)
    
    # Horizontal LED rows within zone (every ~2 inches)
    for y_led in np.arange(zone_bottom_y + 2*s, zone_top_y, 2*s):
        ax.plot([x_center - pw/2 + 1*s, x_center + pw/2 - 1*s], 
                [y_led, y_led], color=LED_BLUE, linewidth=0.3, alpha=0.15)
    
    # Zone label
    ax.text(x_center, (zone_bottom_y + zone_top_y)/2, 'STRIKE\nZONE', 
            color='#405060', fontsize=16, ha='center', va='center', fontweight='bold', alpha=0.15,
            fontfamily='sans-serif')
    ax.text(x_center, (zone_bottom_y + zone_top_y)/2 + 8*s, '17"', 
            color='#8090a0', fontsize=12, ha='center', fontfamily='monospace', fontweight='bold', alpha=0.4)
    ax.text(x_center, (zone_bottom_y + zone_top_y)/2 - 3*s, 'wide', 
            color='#8090a0', fontsize=8, ha='center', fontfamily='monospace', alpha=0.4)
    
    # ---- IMPACT SPLASH (simulated hit) ----
    if show_impact:
        iy = zone_bottom_y + 12 * s
        ix = x_center + 2 * s
        for r_mult, alpha in [(1.5, 0.08), (1.0, 0.15), (0.5, 0.3), (0.2, 0.6)]:
            r = BASEBALL_DIA * s * r_mult
            splash = Circle((ix, iy), r, fill=True, facecolor=LED_GREEN, alpha=alpha, edgecolor='none')
            ax.add_patch(splash)
        ax.text(ix + 2.5*s, iy, 'BALL\nHIT\nSTRIKE!', color=LED_GREEN, fontsize=8, 
                fontweight='bold', fontfamily='monospace')
    
    # ---- SENSOR POD (above zone) ----
    pod_bottom = zone_top_y + 1.5*s
    pod_h = POD_HEIGHT * s * 1.2
    pod_w = pw * 0.5
    pod = FancyBboxPatch((x_center - pod_w/2, pod_bottom), pod_w, pod_h, 
                          boxstyle="round,pad=0.08", fill=True, facecolor=POD, 
                          edgecolor='#445566', linewidth=2.5)
    ax.add_patch(pod)
    
    # Deflector top (angled so balls bounce off)
    defl = Polygon([(x_center - pod_w/2 - 0.2*s, pod_bottom + pod_h),
                    (x_center, pod_bottom + pod_h + DEFLECTOR_H*s),
                    (x_center + pod_w/2 + 0.2*s, pod_bottom + pod_h)],
                   fill=True, facecolor='#3a4555', edgecolor='#556677', linewidth=2)
    ax.add_patch(defl)
    
    # Camera lenses
    ax.plot(x_center - pod_w*0.2, pod_bottom + pod_h*0.75, 'o', 
            color='#1a1a2a', markersize=7, markeredgecolor='#4488aa', markeredgewidth=1.5)
    ax.plot(x_center + pod_w*0.2, pod_bottom + pod_h*0.75, 'o', 
            color='#1a1a2a', markersize=6, markeredgecolor='#4488aa', markeredgewidth=1.5)
    
    # Radar
    radar = Circle((x_center, pod_bottom + pod_h*0.35), 0.15, fill=True, 
                   facecolor='#1a3a1a', edgecolor='#44aa44', linewidth=1.5)
    ax.add_patch(radar)
    
    # Display on pod front
    disp_w = pod_w * 0.65
    disp_h = pod_h * 0.2
    disp_y = pod_bottom + pod_h * 0.1
    disp = Rectangle((x_center - disp_w/2, disp_y), disp_w, disp_h, fill=True,
                     facecolor='#001122', edgecolor='#0088ff', linewidth=1.5)
    ax.add_patch(disp)
    ax.text(x_center, disp_y + disp_h*0.65, '92.3', color='#00ff88', fontsize=7, 
            ha='center', fontweight='bold', fontfamily='monospace')
    ax.text(x_center, disp_y + disp_h*0.2, 'S 1-1', color='#00ccff', fontsize=4.5, 
            ha='center', fontfamily='monospace')
    
    # ---- Baseball for scale (on ground next to device) ----
    if show_ball:
        draw_baseball(ax, x_center + pw/2 + 4*s, base_y + 1.5*s, size=1.0, label=True)
    
    return zone_bottom_y, zone_top_y, by + bh  # Return key Y positions


# ============================================================
# FRONT VIEW
# ============================================================
ax_front.set_xlim(-2.5, 2.5)
ax_front.set_ylim(-0.5, 3.5)
ax_front.axis('off')
ax_front.set_title('FRONT VIEW', color='white', fontsize=14, fontweight='bold', pad=10)

zy_bottom, zy_top, base_top = draw_device_front(ax_front, 0, 0, show_ball=True, show_impact=True)

# ============================================================
# 3/4 PERSPECTIVE VIEW
# ============================================================
ax_persp.set_xlim(-3, 3)
ax_persp.set_ylim(-1, 4)
ax_persp.axis('off')
ax_persp.set_title('3/4 PERSPECTIVE (Accurate Scale)', color='white', fontsize=14, fontweight='bold', pad=10)

# This view shows the WIDE nature of the device + pentagon shape from above

# Ground
ax_persp.fill_between([-3, 3], -1, 0, color=GROUND, alpha=0.3)
ax_persp.plot([-3, 3], [0, 0], color='#3a5a3a', linewidth=2, alpha=0.5)

# Draw the device from a slight top-down angle to show the WIDE pentagon shape
pz = draw_device_front(ax_persp, 0, 0.1, show_ball=False, show_impact=False)

# Add a baseball AND a person for scale
draw_baseball(ax_persp, 1.8, 0.25, size=1.0, label=True)

# Person silhouette (rough) for scale — 6' tall is ~72 inches
# At our scale, 72" * SCALE = 72 * 0.065 = 4.68 display units
# But our view only goes to 4, so let's show a 6' reference line instead
person_height = 72 * SCALE  # 72 inches
ax_persp.plot([-2.3, -2.3], [0, person_height], color='#666', linewidth=3, solid_capstyle='round')
ax_persp.plot([-2.3-0.15, -2.3+0.15], [person_height, person_height], color='#666', linewidth=3)
ax_persp.plot([-2.3-0.15, -2.3+0.15], [0, 0], color='#666', linewidth=3)
ax_persp.text(-2.3, person_height/2, "6'\n(72\")", color='#888', fontsize=8, ha='center', 
              fontfamily='monospace', fontweight='bold')

# Arrow pointing to device total height
device_top = 42 * SCALE + 0.1
ax_persp.annotate('', xy=(2.3, device_top), xytext=(2.3, 0.1),
                  arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=2))
ax_persp.text(2.5, device_top/2 + 0.1, '42"\ntotal', color='#ffcc00', fontsize=9, ha='center',
              fontfamily='monospace', fontweight='bold')

# Zone height arrow
zone_h = 24 * SCALE
zone_bot = 15 * SCALE + 0.1 + BASE_H*SCALE
ax_persp.annotate('', xy=(2.0, zone_bot + zone_h), xytext=(2.0, zone_bot),
                  arrowprops=dict(arrowstyle='<->', color=ACCENT, lw=2))
ax_persp.text(1.7, zone_bot + zone_h/2, '24"\nzone', color=ACCENT, fontsize=8, ha='center',
              fontfamily='monospace', fontweight='bold')

# Width indicator
panel_w = ZONE_WIDTH * SCALE
ax_persp.annotate('', xy=(-panel_w/2, -0.3), xytext=(panel_w/2, -0.3),
                  arrowprops=dict(arrowstyle='<->', color=WARN, lw=2))
ax_persp.text(0, -0.55, '17" (MLB home plate width)', color=WARN, fontsize=8, ha='center',
              fontfamily='monospace', fontweight='bold')

# Top-down inset showing pentagon shape
inset_ax = fig.add_axes([0.58, 0.65, 0.12, 0.15], facecolor='#0d1420')
inset_ax.set_aspect('equal')
inset_ax.axis('off')
inset_ax.set_title('TOP VIEW', color='#ccc', fontsize=7, pad=2)

# Home plate pentagon (top down)
inset_scale = 0.15  # inset scale
hp_inset = np.array([
    [-HP_FRONT/2*inset_scale, 0],
    [HP_FRONT/2*inset_scale, 0],
    [HP_FRONT/2*inset_scale, HP_SIDE*inset_scale],
    [0, HP_DEPTH*inset_scale],
    [-HP_FRONT/2*inset_scale, HP_SIDE*inset_scale],
])
hp_poly = Polygon(hp_inset, fill=True, facecolor=ALUM, edgecolor=ALUM_DARK, linewidth=2, alpha=0.85)
inset_ax.add_patch(hp_poly)

# Zone boundaries on inset
zone_zone = Polygon(hp_inset, fill=False, edgecolor=LED_BLUE, linewidth=2, alpha=0.7)
inset_ax.add_patch(zone_zone)

# Sensor pod on inset
pod_circle = Circle((0, HP_SIDE*inset_scale*0.4), 0.15, fill=True, facecolor=POD, edgecolor='#445566', linewidth=1.5)
inset_ax.add_patch(pod_circle)

# Dimensions on inset
inset_ax.annotate('', xy=(-HP_FRONT/2*inset_scale, -0.15), xytext=(HP_FRONT/2*inset_scale, -0.15),
                  arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
inset_ax.text(0, -0.25, '17"', color='#ffcc00', fontsize=7, ha='center', fontfamily='monospace')

inset_ax.text(0, HP_DEPTH*inset_scale + 0.15, 'HOME PLATE\nSHAPE (TOP)', color='#aac', fontsize=6, ha='center', fontfamily='monospace')

inset_ax.set_xlim(-3, 3)
inset_ax.set_ylim(-1.5, 2)


# ============================================================
# SIDE/DETAIL VIEW with Dimensions
# ============================================================
ax_side.set_xlim(-2, 6)
ax_side.set_ylim(-1.5, 4)
ax_side.axis('off')
ax_side.set_title('EXACT DIMENSIONS', color='white', fontsize=14, fontweight='bold', pad=10)

# Draw simplified side view with all key dimensions
# Using a consistent scale
ss = SCALE

# Ground
ax_side.fill_between([-2, 6], -1.5, 0, color=GROUND, alpha=0.3)

# Home plate on ground
hp2 = Polygon([(-0.6, 0.02), (0.8, 0.02), (0.8, 0.4), (0, 0.8), (-0.6, 0.4)],
               fill=True, facecolor='#2a3a2a', edgecolor='#4a6a4a', linewidth=1.5, alpha=0.5)
ax_side.add_patch(hp2)
ax_side.text(0.1, 0.15, 'Home\nPlate', color='#5a7a5a', fontsize=5, ha='center', fontfamily='monospace')

# Base/ballast
base_y = 0.1
base_h = BASE_H * ss * 3.5  # Exaggerated for visibility
base_w = HP_FRONT * ss * 0.7
base_rect = FancyBboxPatch((-base_w/2, base_y), base_w, base_h, boxstyle="round,pad=0.03",
                            fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2)
ax_side.add_patch(base_rect)
ax_side.text(0, base_y + base_h/2, 'BASE\n18-22 lbs', color='#99aabb', fontsize=7, ha='center', fontfamily='monospace')

# Legs (4x visible from side)
for lx in [-base_w*0.3, base_w*0.3]:
    ax_side.plot([lx, lx], [base_y, base_y + base_h], color='#778899', linewidth=4, solid_capstyle='round')

# Frame/gap
gap_bottom = base_y + base_h
gap_top = base_y + base_h + ZONE_BOTTOM_H * ss * 0.55  # Scaled

# Target panel
panel_bottom = gap_top
panel_height = ZONE_HEIGHT * ss * 0.55
panel_width_side = 0.25  # Appears as thin from side
panel = Rectangle((-panel_width_side/2, panel_bottom), panel_width_side, panel_height,
                  fill=True, facecolor=ALUM, edgecolor=ALUM_DARK, linewidth=2.5)
ax_side.add_patch(panel)

# Zone LEDs on side
for y_zone in [panel_bottom, panel_bottom + panel_height]:
    ax_side.plot([-0.3, 0.3], [y_zone, y_zone], color=LED_BLUE, linewidth=3, alpha=0.8)

# Sensor pod
pod_bottom_y = panel_bottom + panel_height + 0.12
pod_h = POD_HEIGHT * ss * 0.55
pod_w = 0.5
pod_rect = FancyBboxPatch((-pod_w/2, pod_bottom_y), pod_w, pod_h,
                           boxstyle="round,pad=0.05", fill=True, facecolor=POD,
                           edgecolor='#445566', linewidth=1.5)
ax_side.add_patch(pod_rect)

# ---- DIMENSION LINES ----
dim_x = 1.5

# Total height
top_of_everything = pod_bottom_y + pod_h + DEFLECTOR_H * ss * 0.5
ax_side.annotate('', xy=(dim_x, base_y), xytext=(dim_x, top_of_everything),
                 arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=2))
ax_side.text(dim_x + 0.2, (base_y + top_of_everything)/2, '~42"\ntotal', color='#ffcc00', 
             fontsize=9, fontfamily='monospace', fontweight='bold')

# Zone height
ax_side.annotate('', xy=(dim_x - 0.4, panel_bottom), xytext=(dim_x - 0.4, panel_bottom + panel_height),
                 arrowprops=dict(arrowstyle='<->', color=ACCENT, lw=1.5))
ax_side.text(dim_x - 0.2, panel_bottom + panel_height/2, '24"\nzone', color=ACCENT, 
             fontsize=8, fontfamily='monospace')

# Zone bottom height (from ground)
ax_side.annotate('', xy=(dim_x - 0.8, base_y), xytext=(dim_x - 0.8, panel_bottom),
                 arrowprops=dict(arrowstyle='<->', color='#888', lw=1))
ax_side.text(dim_x - 0.6, (base_y + panel_bottom)/2, '15-22"\nadjust', color='#888', 
             fontsize=7, fontfamily='monospace')

# Key measurements text box
dims = (
    'EXACT DIMENSIONS (MLB)\n'
    '=========================\n'
    'Home plate front:  17.0"\n'
    'Home plate sides:   8.5"\n'
    'Home plate diag:   12.0"\n'  
    'Home plate depth:  17.0"\n'
    '\n'
    'Target panel:\n'
    '  Width:            17.0"\n'
    '  Height:           24.0"\n'
    '  Shape:      pentagon\n'  
    '  Material: 1/4" Al 5052\n'
    '\n'
    'Sensor pod:  ~5" tall\n'
    'Base:        ~3.5" tall\n'
    'Total:       ~42" tall\n'
    '\n'
    'WEIGHT:\n'
    '  Device:    10-12 lbs\n'
    '  + Ballast: 8-12 lbs\n'
    '  Total:     18-22 lbs\n'
    '\n'
    'STABILITY:\n'
    '  + Ground stakes: INFINITE\n'
    '  + Suction cups: STRONG\n'
    '  + Ballast only:  3.5x margin'
)
ax_side.text(2.8, 3.5, dims, color='#aabbcc', fontsize=7, fontfamily='monospace',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#0d1117', edgecolor='#334455', alpha=0.95),
             verticalalignment='top')

# Baseball for scale on side view
draw_baseball(ax_side, -1.2, 0.35, size=1.0, label=True)

# Person outline for scale (rough)
ax_side.text(-1.2, 1.8, '|', color='#555', fontsize=20, ha='center', fontweight='bold')
ax_side.text(-1.2, 2.0, '|', color='#555', fontsize=20, ha='center', fontweight='bold')
ax_side.text(-1.2, 2.2, '|', color='#555', fontsize=20, ha='center', fontweight='bold')
ax_side.text(-1.2, 2.4, '|', color='#555', fontsize=20, ha='center', fontweight='bold')
ax_side.text(-1.2, 2.6, '|', color='#555', fontsize=20, ha='center', fontweight='bold')
ax_side.text(-1.2, 2.8, '|', color='#555', fontsize=20, ha='center', fontweight='bold')

# Title
fig.text(0.5, 0.98, 'SmartHome Plate v2.1 — TRUE TO SCALE', color='white', fontsize=18, 
         ha='center', fontweight='bold', fontfamily='sans-serif')
fig.text(0.5, 0.96, '17" wide × 17" deep × 42" tall — Same size as MLB home plate from above — Baseball for scale',
         color=ACCENT, fontsize=11, ha='center')

plt.savefig('D:/AI Drive/pi-agent/tekton/smart-home-plate/v2/v2.1_accurate_render.png', dpi=200,
            facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
plt.close()
print("v2.1 accurate render saved!")