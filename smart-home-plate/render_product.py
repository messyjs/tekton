#!/usr/bin/env python3
"""
SmartHome Plate™ — 3D Technical Illustration Generator
Creates isometric product render, exploded view, and front detail view.
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection, Line3DCollection
import numpy as np

# ============================================================================
# HOME PLATE GEOMETRY (mm)
# ============================================================================
W = 431.8   # Front edge width (17")
S = 215.9   # Side edge width (8.5")
H = 609.6   # Device height (24")
PT = 9.525  # Panel thickness (3/8")
AT = 6.35   # Aluminum plate thickness (1/4")

# Home plate vertices (X, Y)
V = np.array([
    [-W/2, 0],      # V1 Front-left
    [W/2, 0],       # V2 Front-right
    [W/2, S],        # V3 Right-rear
    [0, S + S],      # V4 Apex (back)
    [-W/2, S],       # V5 Left-rear
])

# ============================================================================
# RENDERING HELPERS
# ============================================================================

def create_poly_face(vertices_2d, z_bottom, z_top, color, alpha=0.3, edgecolor='#333'):
    """Create a 3D polygon face from 2D vertices and Z range."""
    faces = []
    # Front face
    n = len(vertices_2d)
    bottom = [(v[0], v[1], z_bottom) for v in vertices_2d]
    top = [(v[0], v[1], z_top) for v in vertices_2d]
    return bottom, top

def polygon_area_3d(verts):
    """Rough area for depth sorting."""
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    return sum(xs) / len(xs) + sum(ys) / len(ys)

# ============================================================================
# MAIN PRODUCT RENDER — Isometric View
# ============================================================================

def render_product_view():
    fig = plt.figure(figsize=(16, 12), facecolor='#0a0a1a')
    ax = fig.add_subplot(111, projection='3d')
    ax.set_facecolor('#0a0a1a')
    
    # Grid
    ax.xaxis.pane.fill = False
    ax.yaxis.pane.fill = False
    ax.zaxis.pane.fill = False
    ax.xaxis.pane.set_edgecolor('#1a1a3a')
    ax.yaxis.pane.set_edgecolor('#1a1a3a')
    ax.zaxis.pane.set_edgecolor('#1a1a3a')
    ax.grid(True, alpha=0.15, color='#444')
    
    # Scale factor for display
    sc = 1.0  # mm
    
    # ---- Ground Plane ----
    ground_x = [-600, 600, 600, -600]
    ground_y = [-200, -200, 1000, 1000]
    ground_z = [-20, -20, -20, -20]
    ground = Poly3DCollection([list(zip(ground_x, ground_y, ground_z))], 
                              alpha=0.3, facecolor='#1a3a1a', edgecolor='#2a5a2a')
    ax.add_collection3d(ground)
    
    # ---- Adjustable Feet ----
    foot_h = 127  # 5" extension for display (medium setting)
    foot_r = 19  # radius
    for v in V:
        xs = [v[0] + foot_r * np.cos(a) for a in np.linspace(0, 2*np.pi, 8)]
        ys = [v[1] + foot_r * np.sin(a) for a in np.linspace(0, 2*np.pi, 8)]
        # Outer foot (bottom)
        bottom_z = [-20] * 8
        top_z = [-10] * 8
        foot_bottom = Poly3DCollection([list(zip(xs, ys, top_z))], 
                                        alpha=0.7, facecolor='#222', edgecolor='#444')
        ax.add_collection3d(foot_bottom)
        # Leg tube
        for offset in [-foot_r*0.5, foot_r*0.5]:
            ax.plot([v[0]+offset, v[0]+offset], [v[1], v[1]], [-10, 0], 
                   color='#888', linewidth=2, alpha=0.8)
    
    # ---- Base Plate (Aluminum) ----
    base_bottom = [(v[0]*sc, v[1]*sc, 0) for v in V]
    base_top = [(v[0]*sc, v[1]*sc, AT*sc) for v in V]
    base_poly = Poly3DCollection([base_top], alpha=0.85, facecolor='#667788', edgecolor='#334455', linewidth=2)
    ax.add_collection3d(base_poly)
    
    # ---- Top Plate (Aluminum) ----
    top_bottom = [(v[0]*sc, v[1]*sc, H) for v in V]
    top_top = [(v[0]*sc, v[1]*sc, H + AT*sc) for v in V]
    top_poly = Poly3DCollection([top_top], alpha=0.85, facecolor='#667788', edgecolor='#334455', linewidth=2)
    ax.add_collection3d(top_poly)
    
    # ---- Polycarbonate Panels ----
    panel_colors = [
        ('#4488cc', '#66aaee'),  # Front - blue tint
        ('#44cc88', '#66eeaa'),  # Right - green tint
        ('#cccc44', '#eeee66'),  # Right-diag - yellow
        ('#cc4444', '#ee6666'),  # Left-diag - red
        ('#cc44cc', '#ee66ee'),  # Left - magenta
    ]
    
    for i in range(5):
        v1 = V[i]
        v2 = V[(i+1) % 5]
        color_face, color_edge = panel_colors[i]
        
        # Panel face (4 corners: bottom-v1, bottom-v2, top-v2, top-v1)
        panel_verts = [
            (v1[0]*sc, v1[1]*sc, AT*sc),  # bottom-v1
            (v2[0]*sc, v2[1]*sc, AT*sc),  # bottom-v2
            (v2[0]*sc, v2[1]*sc, H),       # top-v2
            (v1[0]*sc, v1[1]*sc, H),        # top-v1
        ]
        
        panel_poly = Poly3DCollection([panel_verts], alpha=0.35, 
                                        facecolor=color_face, edgecolor=color_edge, linewidth=1.5)
        ax.add_collection3d(panel_poly)
    
    # ---- LED Strike Zone (illuminated rows on front panel) ----
    # Front panel strike zone - rows glowing blue
    zone_bottom = 200  # ~8" from bottom
    zone_top = 480     # ~19" from bottom
    for z in range(int(zone_bottom), int(zone_top), 25):
        led_verts = [
            (-W/2 * 0.95, 10, z),
            (W/2 * 0.95, 10, z),
            (W/2 * 0.95, 10, z + 8),
            (-W/2 * 0.95, 10, z + 8),
        ]
        led_poly = Poly3DCollection([led_verts], alpha=0.5, 
                                     facecolor='#0088ff', edgecolor='#0044aa', linewidth=0.5)
        ax.add_collection3d(led_poly)
    
    # ---- Zone boundary glow (top and bottom) ----
    for z in [zone_bottom, zone_top]:
        glow_verts = [
            (-W/2 * 0.95, 15, z - 10),
            (W/2 * 0.95, 15, z - 10),
            (W/2 * 0.95, 15, z + 10),
            (-W/2 * 0.95, 15, z + 10),
        ]
        glow_poly = Poly3DCollection([glow_verts], alpha=0.7, 
                                      facecolor='#00ccff', edgecolor='#0088ff', linewidth=2)
        ax.add_collection3d(glow_poly)
    
    # ---- Display on front panel ----
    disp_w = 120
    disp_h = 78
    disp_z = 380  # Height of display
    disp_verts = [
        (-disp_w/2, -5, disp_z),
        (disp_w/2, -5, disp_z),
        (disp_w/2, -5, disp_z + disp_h),
        (-disp_w/2, -5, disp_z + disp_h),
    ]
    disp_poly = Poly3DCollection([disp_verts], alpha=0.8, 
                                  facecolor='#001122', edgecolor='#00aaff', linewidth=2)
    ax.add_collection3d(disp_poly)
    
    # Display text (simulated)
    ax.text(0, -15, disp_z + disp_h/2, "92 MPH\nSTRIKE 1-1", 
            color='#00ff88', fontsize=8, ha='center', va='center', fontweight='bold')
    
    # ---- Camera lenses on top ----
    cam_y = 10
    # Wide angle camera
    ax.scatter([-30], [cam_y], [H + AT + 5], color='#111', s=100, marker='o', zorder=10)
    ax.scatter([-30], [cam_y], [H + AT + 5], color='#336699', s=40, marker='o', zorder=11)
    # High speed camera
    ax.scatter([30], [cam_y], [H + AT + 5], color='#111', s=80, marker='o', zorder=10)
    ax.scatter([30], [cam_y], [H + AT + 5], color='#336699', s=30, marker='o', zorder=11)
    
    # ---- Through rods at vertices ----
    for v in V:
        ax.plot([v[0], v[0]], [v[1], v[1]], [-10, H + AT + 10], 
               color='#aaa', linewidth=1.5, alpha=0.5)
    
    # ---- Impact splash effect (simulated on front panel) ----
    impact_x = 50  # Where a ball hit
    impact_z = 350
    # Draw splash as scatter points
    for r in [5, 15, 30, 50]:
        theta = np.linspace(0, 2*np.pi, 16)
        for t in theta:
            ax.scatter([impact_x + r*np.cos(t)], [20], [impact_z + r*np.sin(t)*0.3], 
                      color='#00ff44', s=20*(1-r/50), alpha=0.4*(1-r/50), marker='.')
    
    # Impact point
    ax.scatter([impact_x], [20], [impact_z], color='#00ff44', s=200, marker='*', zorder=15, alpha=0.9)
    ax.text(impact_x + 40, 20, impact_z, "IMPACT\nDETECTED", color='#00ff44', fontsize=8, fontweight='bold')
    
    # ---- Annotations ----
    # Title
    ax.text2D(0.5, 0.97, "SmartHome Plate™", transform=ax.transAxes,
             color='white', fontsize=24, ha='center', fontweight='bold',
             fontfamily='sans-serif')
    ax.text2D(0.5, 0.935, "Smart Strike Zone Trainer & Pitching Analytics", transform=ax.transAxes,
             color='#88bbee', fontsize=12, ha='center')
    
    # Feature callouts
    callouts = [
        (0.02, 0.85, "5\" Daylight Display\nSpeed • Count • B/S", '#00aaff'),
        (0.02, 0.72, "4,200 NeoPixel LEDs\nStrike Zone • Impact Splash", '#00ff88'),
        (0.02, 0.58, "3/8\" Polycarbonate\nWithstands 105+ MPH", '#ffaa44'),
        (0.02, 0.44, "Dual Cameras\n4K Wide + 120fps Global Shutter", '#ff6688'),
        (0.02, 0.30, "60GHz FMCW Radar\nSpeed • Spin Rate • Exit Velocity", '#ffcc00'),
        (0.02, 0.16, "Auto-Adjust Strike Zone\nCamera Detects Batter Height", '#cc88ff'),
    ]
    
    for x, y, text, color in callouts:
        ax.text2D(x, y, text, transform=ax.transAxes,
                 color=color, fontsize=9, fontweight='bold',
                 fontfamily='monospace',
                 bbox=dict(boxstyle='round,pad=0.4', facecolor='#111133', edgecolor=color, alpha=0.85))
    
    # Side panel labels
    ax.text2D(0.78, 0.82, "Panel A\n(Front)\n17\" wide", transform=ax.transAxes,
             color='#4488cc', fontsize=8, ha='center')
    
    # ---- Key specs ----
    specs = [
        "DIMENSIONS",
        "17\" × 17\" × 24\" (+2-8\" legs)",
        "",
        "WEIGHT",
        "~20 lbs (without battery)",
        "",
        "IMPACT RATING",
        "105+ MPH repeated impacts",
        "",
        "BATTERY LIFE",
        "4-6 hours",
        "",
        "COST TO BUILD",
        "~$931 materials",
        "",
        "TARGET MSRP",
        "$1,299 (Pro)",
    ]
    spec_text = "\n".join(specs)
    ax.text2D(0.72, 0.45, spec_text, transform=ax.transAxes,
             color='#aabbcc', fontsize=7, fontfamily='monospace',
             bbox=dict(boxstyle='round,pad=0.5', facecolor='#0a0a2a', edgecolor='#334455', alpha=0.9))
    
    # Axis settings
    ax.set_xlim(-500, 500)
    ax.set_ylim(-200, 800)
    ax.set_zlim(-50, 700)
    ax.set_axis_off()
    
    # Viewing angle
    ax.view_init(elev=25, azim=-55)
    
    plt.tight_layout()
    plt.savefig('renders/product_render.png', dpi=200, 
                facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print("  [OK] Product render saved")


def render_front_detail():
    """Front detail view showing display, cameras, LED zones."""
    fig, ax = plt.subplots(figsize=(12, 16), facecolor='#0a0a1a')
    ax.set_facecolor('#0a0a1a')
    
    pw = W / 10  # Scaled panel width for front view
    ph = H / 10  # Scaled panel height
    
    # Draw front panel outline
    rect = plt.Rectangle((-pw/2, 0), pw, ph, fill=True, 
                          facecolor='#334455', edgecolor='#5588aa', linewidth=3, alpha=0.6)
    ax.add_patch(rect)
    
    # Corner reinforcements
    corner_r = 8
    for (cx, cy) in [(-pw/2, 0), (pw/2, 0), (-pw/2, ph), (pw/2, ph)]:
        circle = plt.Circle((cx, cy), corner_r, fill=True, facecolor='#556677', 
                            edgecolor='#778899', linewidth=2, alpha=0.8)
        ax.add_patch(circle)
    
    # Through-rod positions
    for (cx, cy) in [(-pw/2, 0), (pw/2, 0), (-pw/2, ph), (pw/2, ph)]:
        circle = plt.Circle((cx, cy), 4, fill=True, facecolor='#999', 
                            edgecolor='#666', linewidth=2)
        ax.add_patch(circle)
        ax.text(cx, cy, 'M8', color='#aaa', fontsize=6, ha='center', va='center')
    
    # ============== STRIKE ZONE (Blue illuminated area) ==============
    zone_bottom = 200/10  # Scaled
    zone_top = 480/10
    zone = plt.Rectangle((-pw/2 + 3, zone_bottom), pw - 6, zone_top - zone_bottom,
                          fill=True, facecolor='#003366', edgecolor='#0088ff', 
                          linewidth=2, alpha=0.4)
    ax.add_patch(zone)
    
    # Zone boundary lines (bright)
    ax.plot([-pw/2 + 3, pw/2 - 3], [zone_bottom, zone_bottom], 
            color='#00ccff', linewidth=3, alpha=0.9)
    ax.plot([-pw/2 + 3, pw/2 - 3], [zone_top, zone_top], 
            color='#00ccff', linewidth=3, alpha=0.9)
    
    # LED row indicators (horizontal lines with glow)
    for z in np.arange(zone_bottom + 2.5, zone_top, 2.54):
        ax.plot([-pw/2 + 5, pw/2 - 5], [z, z], color='#0055aa', linewidth=0.3, alpha=0.3)
    
    # ============== DISPLAY ==============
    disp_w_scaled = 120/10
    disp_h_scaled = 78/10
    disp_y = 380/10
    
    # Display bezel
    disp_bezel = plt.Rectangle((-disp_w_scaled/2 - 2, disp_y - 2), 
                                disp_w_scaled + 4, disp_h_scaled + 4,
                                fill=True, facecolor='#222', edgecolor='#444', linewidth=2)
    ax.add_patch(disp_bezel)
    
    # Display screen
    disp = plt.Rectangle((-disp_w_scaled/2, disp_y), disp_w_scaled, disp_h_scaled,
                          fill=True, facecolor='#001122', edgecolor='#0088ff', linewidth=2)
    ax.add_patch(disp)
    
    # Display content
    ax.text(0, disp_y + disp_h_scaled * 0.75, "92.3 MPH", 
            color='#00ff88', fontsize=16, ha='center', fontweight='bold', fontfamily='monospace')
    ax.text(0, disp_y + disp_h_scaled * 0.5, "STRIKE 1-1", 
            color='#00ccff', fontsize=11, ha='center', fontweight='bold', fontfamily='monospace')
    ax.text(0, disp_y + disp_h_scaled * 0.25, "SPIN: 2240 RPM  MVMT: 8.2\"", 
            color='#ffaa44', fontsize=7, ha='center', fontfamily='monospace')
    ax.text(0, disp_y + disp_h_scaled * 0.08, "EXIT VEL: --  LAUNCH: --", 
            color='#888', fontsize=6, ha='center', fontfamily='monospace')
    
    # ============== CAMERA LENSES ==============
    cam_y = ph * 0.85
    # Wide angle camera
    cam1 = plt.Circle((-pw/4, cam_y), 5, fill=True, facecolor='#111', 
                       edgecolor='#336699', linewidth=2)
    ax.add_patch(cam1)
    ax.text(-pw/4, cam_y + 8, 'WIDE ANGLE\n4K Camera', color='#6699cc', 
            fontsize=6, ha='center', fontfamily='monospace')
    
    # High speed camera
    cam2 = plt.Circle((pw/4, cam_y), 4, fill=True, facecolor='#111', 
                       edgecolor='#336699', linewidth=2)
    ax.add_patch(cam2)
    ax.text(pw/4, cam_y + 8, 'HIGH SPEED\n120fps Global Shutter', color='#6699cc', 
            fontsize=6, ha='center', fontfamily='monospace')
    
    # ============== RADAR ==============
    radar_y = ph * 0.65
    radar = plt.Rectangle((-10, radar_y - 5), 20, 10, fill=True, 
                           facecolor='#1a1a1a', edgecolor='#44aa44', linewidth=2)
    ax.add_patch(radar)
    ax.text(0, radar_y - 9, '60GHz FMCW RADAR', color='#44cc44', 
            fontsize=6, ha='center', fontfamily='monospace')
    
    # ============== IMPACT SPLASH DEMONSTRATION ==============
    impact_z = 350/10
    impact_x = pw/4
    
    # Glow rings
    for r, a in [(3, 0.9), (8, 0.6), (15, 0.4), (25, 0.2), (35, 0.1)]:
        splash = plt.Circle((impact_x, impact_z), r, fill=True, 
                             facecolor='#00ff44', alpha=a, edgecolor='none')
        ax.add_patch(splash)
    
    ax.text(impact_x + 42, impact_z, 'IMPACT\nDETECTED\n\nGreen = STRIKE\nPrecise location\nvia acoustic\ntiangulation\n(4 piezo sensors)', 
            color='#00ff44', fontsize=7, fontweight='bold', fontfamily='monospace',
            bbox=dict(boxstyle='round', facecolor='#001a00', edgecolor='#00ff44', alpha=0.85))
    
    # ============== PIEZO SENSOR POSITIONS ==============
    piezo_offset = 25/10
    piezo_size = 6/10 * 5  # Scaled up for visibility
    for (px, py) in [(-pw/2 + piezo_offset, piezo_offset + piezo_size/2),
                     (pw/2 - piezo_offset, piezo_offset + piezo_size/2),
                     (-pw/2 + piezo_offset, ph - piezo_offset - piezo_size),
                     (pw/2 - piezo_offset, ph - piezo_offset - piezo_size)]:
        piezo = plt.Rectangle((px - piezo_size/2, py - piezo_size/2), piezo_size, piezo_size * 2,
                               fill=True, facecolor='#554400', edgecolor='#aa8800', 
                               linewidth=1, alpha=0.7)
        ax.add_patch(piezo)
    
    ax.text(pw/2 + 5, piezo_offset + 3, 'PIEZO\nSENSOR\n(LDT0-028K)', 
            color='#aa8800', fontsize=5, fontfamily='monospace')
    
    # ============== BUTTON POSITIONS ==============
    btn_y = ph * 0.15
    for i, label in enumerate(['POWER', 'ZONE', 'MODE']):
        btn = plt.Circle((-pw/4 + i * pw/4, btn_y), 3, fill=True, 
                          facecolor='#222', edgecolor='#666', linewidth=2)
        ax.add_patch(btn)
        ax.text(-pw/4 + i * pw/4, btn_y - 5, label, color='#888', 
                fontsize=5, ha='center', fontfamily='monospace')
    
    # ============== LEG HEIGHT LABELS ==============
    leg_labels = [
        (pw/2 + 15, ph * 0.96, '24" body height'),
        (pw/2 + 15, zone_top, f'Strike zone top\n(~{zone_top:.0f}")'),
        (pw/2 + 15, zone_bottom, f'Strike zone bottom\n(~{zone_bottom:.0f}")'),
        (pw/2 + 15, 0, 'Base plate\n(1/4" aluminum)'),
    ]
    for x, y, label in leg_labels:
        ax.plot([pw/2 + 2, pw/2 + 12], [y, y], color='#557799', linewidth=0.5)
        ax.text(x, y, label, color='#88aacc', fontsize=6, va='center', fontfamily='monospace')
    
    # ============== DIMENSION LABELS ==============
    # Width
    ax.annotate('', xy=(pw/2, -8), xytext=(-pw/2, -8),
                arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
    ax.text(0, -12, '17" (431.8mm)', color='#ffcc00', fontsize=8, ha='center', fontfamily='monospace')
    
    # Height
    ax.annotate('', xy=(pw/2 + 25, ph), xytext=(pw/2 + 25, 0),
                arrowprops=dict(arrowstyle='<->', color='#ffcc00', lw=1.5))
    ax.text(pw/2 + 28, ph/2, '24" (610mm)', color='#ffcc00', fontsize=8, 
            va='center', rotation=-90, fontfamily='monospace')
    
    # ============== TITLE ==============
    ax.text(0.5, 1.02, "SmartHome Plate™ — Front Panel Detail", 
            transform=ax.transAxes, color='white', fontsize=16, ha='center', fontweight='bold')
    ax.text(0.5, 0.99, "Panel A (Front) — 17\" Wide — Faces Pitcher", 
            transform=ax.transAxes, color='#88bbee', fontsize=9, ha='center')
    
    # Material labels
    ax.text(0.02, 0.03, "PANEL: 3/8\" Polycarbonate (Lexan) — UV Hardcoated Both Sides", 
            transform=ax.transAxes, color='#88bbee', fontsize=6, fontfamily='monospace')
    ax.text(0.02, 0.01, "3/8\" POLYCARBONATE: 37× stronger than acrylic, survives 105+ MPH impacts", 
            transform=ax.transAxes, color='#ff8844', fontsize=7, fontweight='bold', fontfamily='monospace')
    
    ax.set_xlim(-pw/2 - 30, pw/2 + 50)
    ax.set_ylim(-20, ph + 10)
    ax.set_aspect('equal')
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('renders/front_detail.png', dpi=200,
                facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print("  [OK] Front detail render saved")


def render_exploded_view():
    """Exploded view showing all components separated."""
    fig = plt.figure(figsize=(16, 16), facecolor='#0a0a1a')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#0a0a1a')
    
    # Scaled dimensions
    sc = 0.08  # Scale factor
    
    # Layout: vertical stack, spread out for exploded view
    base_y = 0
    gap = 35  # Gap between exploded layers
    
    # ---- BASE PLATE ----
    bv = [(v[0]*sc + 300, v[1]*sc + base_y) for v in V]
    base_poly = plt.Polygon(bv, fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2)
    ax.add_patch(base_poly)
    ax.text(300, base_y + 60, 'BASE PLATE\n6061-T6 Aluminum\n1/4" (6.35mm)', 
            color='#aabbcc', fontsize=9, fontweight='bold', ha='center', fontfamily='mon-serif')
    
    # ---- PANELS ----
    panel_names = ['Panel A\n(Front)\n17" wide', 'Panel B\n(Right)\n8.5"', 
                   'Panel C\n(R-Diag)\n12"', 'Panel D\n(L-Diag)\n12"', 'Panel E\n(Left)\n8.5"']
    panel_widths = [W, S, 304.8, 304.8, S]
    panel_colors = ['#4488cc', '#44cc88', '#cccc44', '#cc4444', '#cc44cc']
    
    for i in range(5):
        pw = panel_widths[i] * sc
        ph = H * sc * 0.7  # Scaled height
        py = 120 + i * 12  # Offset each panel differently
        
        rect = plt.Rectangle((-pw/2 + i*40 + 150, py), pw, ph, 
                               fill=True, facecolor=panel_colors[i], 
                               edgecolor='white', linewidth=1.5, alpha=0.3)
        ax.add_patch(rect)
        ax.text(i*40 + 150, py + ph + 5, panel_names[i], 
                color=panel_colors[i], fontsize=7, ha='center', fontweight='bold')
    
    # ---- TOP PLATE ----
    tv = [(v[0]*sc + 300, v[1]*sc + 460) for v in V]
    top_poly = plt.Polygon(tv, fill=True, facecolor='#556677', edgecolor='#778899', linewidth=2)
    ax.add_patch(top_poly)
    ax.text(300, 530, 'TOP PLATE\n6061-T6 Aluminum\nDisplay, Cameras, Radar', 
            color='#aabbcc', fontsize=9, fontweight='bold', ha='center')
    
    # ---- ELECTRONICS ----
    elec_rect = plt.Rectangle((60, 400), 60, 45, fill=True, facecolor='#224422', 
                               edgecolor='#44aa44', linewidth=2, alpha=0.8)
    ax.add_patch(elec_rect)
    ax.text(90, 445, 'ELECTRONICS\nTRAY (PETG)', color='#44cc44', 
            fontsize=7, ha='center', fontweight='bold')
    ax.text(90, 428, 'Jetson Orin\nESP32-S3 ×5\nBattery Pack', 
            color='#88cc88', fontsize=5, ha='center', fontfamily='monospace')
    
    # ---- THROUGH RODS ----
    for v in V:
        ax.plot([v[0]*sc + 300, v[0]*sc + 300], [60, 460], 
               color='#aaaaaa', linewidth=2, alpha=0.5, linestyle='--')
        ax.text(v[0]*sc + 300, 457, 'M8', color='#999', fontsize=5, ha='center')
    
    # ---- ADJUSTABLE FEET ----
    for v in V:
        foot = plt.Circle((v[0]*sc + 300, 10), 5, fill=True, facecolor='#333', 
                           edgecolor='#666', linewidth=1)
        ax.add_patch(foot)
    ax.text(300, 0, 'ADJUSTABLE FEET\n(3 positions: 2" / 5" / 8")', 
            color='#888', fontsize=7, ha='center')
    
    # ---- COMPONENTS LIST ----
    components = [
        ("1. Base Plate", "6061-T6 Aluminum, CNC milled", '#aabbcc'),
        ("2. Polycarbonate Panels ×5", "3/8\" Lexan, UV hardcoated", '#88bbee'),
        ("3. Top Plate", "6061-T6 Aluminum, CNC milled", '#aabbcc'),
        ("4. Through Rods ×5", "M8 SS 304 threaded", '#aaaaaa'),
        ("5. Adjustable Feet ×5", "Aluminum + rubber, 3-position", '#888888'),
        ("6. EPDM Gaskets", "3/8\" channel, 60A durometer", '#666666'),
        ("7. LED Strips ~4,200", "WS2812B NeoPixel, 30/m", '#00ff88'),
        ("8. Piezo Sensors ×20", "LDT0-028K, 4 per panel", '#ffaa44'),
        ("9. Jetson Orin Nano", "Main compute + ML", '#cc44cc'),
        ("10. ESP32-S3 ×5", "LED + sensor controllers", '#44cc88'),
        ("11. Dual Cameras", "4K wide + 120fps global shutter", '#4488cc'),
        ("12. FMCW Radar", "60GHz, speed + spin + movement", '#ffcc44'),
        ("13. 5\" IPS Display", "800×480, 1000 nits", '#88aaff'),
        ("14. 21700 Battery ×6", "3S2P, 111Wh, 4-6hr runtime", '#ff6644'),
    ]
    
    for i, (name, desc, color) in enumerate(components):
        y = 560 - i * 22
        ax.text(15, y, name, color=color, fontsize=7, fontweight='bold', fontfamily='monospace')
        ax.text(200, y, desc, color='#888', fontsize=6, fontfamily='monospace')
    
    # ---- DASHED LINES showing assembly ----
    # Lines connecting components
    ax.annotate('ASSEMBLY\nORDER', xy=(550, 250), color='#ffcc00', fontsize=10,
                fontweight='bold', ha='center', fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='#1a1a00', edgecolor='#ffcc00'))
    ax.text(550, 220, '1. Install feet\n2. Base plate gaskets\n3. Slide panels in\n4. Top plate on\n5. Tighten M8 rods\n6. Install LEDs\n7. Wire sensors\n8. Mount electronics\n9. Install cameras\n10. Install display\n11. Connect battery\n12. Test & calibrate',
            color='#cccc88', fontsize=6, fontfamily='monospace',
            bbox=dict(boxstyle='round', facecolor='#0a0a1a', edgecolor='#444'))
    
    # Title
    ax.text(300, 570, "SmartHome Plate™ — Exploded Assembly View", 
            color='white', fontsize=16, fontweight='bold', ha='center')
    ax.text(300, 555, "14 critical components • 16-step assembly • ~2 hours build time", 
            color='#88bbee', fontsize=9, ha='center')
    
    ax.set_xlim(-30, 630)
    ax.set_ylim(-30, 590)
    ax.set_aspect('equal')
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('renders/exploded_view.png', dpi=200,
                facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print("  [OK] Exploded view saved")


# ============================================================================
# MAIN
# ============================================================================
if __name__ == '__main__':
    print("Generating SmartHome Plate renders...")
    render_product_view()
    render_front_detail()
    render_exploded_view()
    print("\nAll renders generated successfully!")