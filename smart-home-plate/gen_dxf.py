#!/usr/bin/env python3
"""
SmartHome Plate™ — CNC-Ready DXF Generator
============================================
Generates manufacturing-ready DXF files for all CNC/Laser-cut parts.

Parts generated:
  1. base_plate.dxf       — Aluminum base plate (CNC mill)
  2. top_plate.dxf        — Aluminum top plate (CNC mill)  
  3. front_panel.dxf      — Polycarbonate front panel (CNC router)
  4. side_panel_left.dxf  — Polycarbonate side panel (CNC router)
  5. side_panel_right.dxf — Polycarbonate side panel (CNC router)
  6. rear_panel_left.dxf  — Polycarbonate diagonal panel (CNC router)
  7. rear_panel_right.dxf — Polycarbonate diagonal panel (CNC router)

Each DXF includes:
  - Outer轮廓 (ON layer 0, color 1 = RED) — Cut path
  - Interior holes/cutouts (ON layer 0) — Drill/cut path
  - Reference marks (ON layer REFS, color 3 = GREEN) — Sensor positions
  - Center marks (ON layer CENTER, color 5 = BLUE) — Hole centers
  - Dimensions (ON layer DIMS, color 2 = YELLOW)

Usage:
  python gen_dxf.py [--output-dir OUTPUT_DIR]

Output files go to smart-home-plate/cnc/ by default.
"""

import ezdxf
import math
import os
import sys
from ezdxf.enums import TextEntityAlignment

# ============================================================================
# DESIGN PARAMETERS (millimeters) — Must match parameters.scad
# ============================================================================
FRONT_EDGE_W = 431.8    # 17 inches
SIDE_EDGE_W = 215.9      # 8.5 inches
DIAG_EDGE_W = 304.8      # 12 inches

PANEL_THICKNESS = 9.525   # 3/8 inch
PLATE_THICKNESS = 6.35    # 1/4 inch
CHANNEL_DEPTH = 12.0
CHANNEL_WIDTH = PANEL_THICKNESS + 1.0
GASKET_COMPRESSION = 2.0

DEVICE_HEIGHT = 609.6     # 24 inches
PANEL_HEIGHT = DEVICE_HEIGHT - 2 * CHANNEL_DEPTH + GASKET_COMPRESSION

# Home plate vertices
HP_V1 = (-FRONT_EDGE_W / 2, 0)      # Front-left
HP_V2 = (FRONT_EDGE_W / 2, 0)        # Front-right
HP_V3 = (FRONT_EDGE_W / 2, SIDE_EDGE_W)  # Right-rear
HP_V4 = (0, SIDE_EDGE_W + SIDE_EDGE_W)     # Apex (back point)
HP_V5 = (-FRONT_EDGE_W / 2, SIDE_EDGE_W)  # Left-rear

VERTICES = [HP_V1, HP_V2, HP_V3, HP_V4, HP_V5]

# Fastener holes
ROD_DIA = 8.5       # M8 + 0.5mm clearance
WASHER_DIA = 16.5   # Washer recess
FOOT_DIA = 6.5      # M6 foot mounting
DRAIN_DIA = 3.0     # Drain holes

# Display cutout
DISPLAY_W = 120.0
DISPLAY_H = 78.0
DISPLAY_Y = 40.0    # Y position from front edge

# Camera cutouts
WIDE_CAM_DIA = 14.0
HS_CAM_DIA = 12.0
CAM_Y = -5.0
WIDE_CAM_X = -30.0
HS_CAM_X = 30.0

# Radar cutout
RADAR_W = 50.0
RADAR_H = 35.0
RADAR_Y = 60.0

# Panel features
PIEZO_OFFSET = 25.0
PIEZO_W = 30.0
PIEZO_H = 60.0
RETAINER_INSET = 15.0
M4_DIA = 4.2

# Fillet radius for aluminum plates
FILLET_R = 3.0


def create_dxf(filename, part_name):
    """Create a new DXF document with standard layers."""
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()
    
    # Create layers
    doc.layers.add('CUT', color=1)      # Red — cut paths
    doc.layers.add('REFS', color=3)     # Green — reference marks
    doc.layers.add('CENTER', color=5)   # Blue — center marks
    doc.layers.add('DIMS', color=2)     # Yellow — dimensions
    doc.layers.add('ENGRAVE', color=7)  # White — engravings
    
    return doc, msp


def add_home_plate_outline(msp, offset=0, layer='CUT'):
    """Add the home plate pentagon outline to the modelspace."""
    verts = list(VERTICES)
    if offset != 0:
        # Apply offset (approximation using parallel lines)
        # For a proper offset, we'd need line-line intersection calculation
        # Here we use a simplified approach
        centroid = (0, SIDE_EDGE_W * 0.6)
        offset_verts = []
        for v in verts:
            dx = v[0] - centroid[0]
            dy = v[1] - centroid[1]
            dist = math.sqrt(dx*dx + dy*dy)
            offset_verts.append((v[0] + offset * dx / dist, 
                                 v[1] + offset * dy / dist))
        verts = offset_verts
    
    points = [v for v in verts] + [verts[0]]  # Close the polygon
    msp.add_lwpolyline(points, dxfattribs={'layer': layer})


def add_hole(msp, x, y, diameter, layer='CUT'):
    """Add a circle (drill hole) to the modelspace."""
    msp.add_circle(center=(x, y), radius=diameter/2, dxfattribs={'layer': layer})


def add_center_mark(msp, x, y, size=5, layer='CENTER'):
    """Add a cross-hair center mark."""
    msp.add_line(start=(x - size, y), end=(x + size, y), dxfattribs={'layer': layer})
    msp.add_line(start=(x, y - size), end=(x, y + size), dxfattribs={'layer': layer})


def add_dimension(msp, x1, y1, x2, y2, text, layer='DIMS', offset=15):
    """Add a dimension line with text."""
    mid_x = (x1 + x2) / 2
    mid_y = (y1 + y2) / 2
    # Calculate perpendicular offset direction
    dx = x2 - x1
    dy = y2 - y1
    length = math.sqrt(dx*dx + dy*dy)
    if length == 0:
        return
    nx = -dy / length * offset
    ny = dx / length * offset
    
    # Extension lines
    msp.add_line(start=(x1, y1), end=(x1 + nx, y1 + ny), dxfattribs={'layer': layer})
    msp.add_line(start=(x2, y2), end=(x2 + nx, y2 + ny), dxfattribs={'layer': layer})
    
    # Dimension line
    msp.add_line(start=(x1 + nx*0.8, y1 + ny*0.8), 
                 end=(x2 + nx*0.8, y2 + ny*0.8), dxfattribs={'layer': layer})
    
    # Text
    msp.add_text(text, dxfattribs={'layer': layer, 'height': 4}).set_placement(
        (mid_x + nx*1.3, mid_y + ny*1.3))


def add_rectangle(msp, x, y, w, h, layer='CUT'):
    """Add a rectangle outline."""
    points = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
    msp.add_lwpolyline(points, dxfattribs={'layer': layer})


def add_piezo_marks(msp, panel_width, panel_height, layer='REFS'):
    """Add piezo sensor placement reference marks for a panel."""
    corners = [
        (PIEZO_OFFSET, PIEZO_OFFSET),
        (panel_width - PIEZO_OFFSET, PIEZO_OFFSET),
        (PIEZO_OFFSET, panel_height - PIEZO_OFFSET),
        (panel_width - PIEZO_OFFSET, panel_height - PIEZO_OFFSET)
    ]
    for cx, cy in corners:
        add_rectangle(msp, cx - PIEZO_W/2, cy - PIEZO_H/2, PIEZO_W, PIEZO_H, layer)
        add_center_mark(msp, cx, cy, size=3, layer='CENTER')


def add_mounting_holes(msp, panel_width, panel_height, layer='CUT'):
    """Add M4 mounting holes for panel retainers."""
    positions = [
        (RETAINER_INSET, RETAINER_INSET),
        (panel_width - RETAINER_INSET, RETAINER_INSET),
        (RETAINER_INSET, panel_height - RETAINER_INSET),
        (panel_width - RETAINER_INSET, panel_height - RETAINER_INSET)
    ]
    for px, py in positions:
        add_hole(msp, px, py, M4_DIA, layer)
        add_center_mark(msp, px, py, size=2, layer='CENTER')


# ============================================================================
# 1. BASE PLATE
# ============================================================================
def generate_base_plate(output_dir):
    doc, msp = create_dxf(output_dir + '/base_plate.dxf', 'Base Plate')
    
    # Outer profile — home plate pentagon with fillet
    add_home_plate_outline(msp, offset=FILLET_R, layer='CUT')
    
    # Inner profile (sharp corners, for reference)
    add_home_plate_outline(msp, offset=0, layer='REFS')
    
    # Through-holes for M8 rods
    for v in VERTICES:
        add_hole(msp, v[0], v[1], ROD_DIA, 'CUT')
        add_center_mark(msp, v[0], v[1], size=8, layer='CENTER')
        # Washer recess (shown as dashed circle on REF layer)
        add_hole(msp, v[0], v[1], WASHER_DIA, 'REFS')
    
    # M6 foot mounting holes
    centroid = (0, SIDE_EDGE_W * 0.6)
    foot_offset = 15.0
    for v in VERTICES:
        dx = centroid[0] - v[0]
        dy = centroid[1] - v[1]
        dist = math.sqrt(dx*dx + dy*dy)
        fx = v[0] + foot_offset * dx / dist
        fy = v[1] + foot_offset * dy / dist
        add_hole(msp, fx, fy, FOOT_DIA, 'CUT')
        add_center_mark(msp, fx, fy, size=3, layer='CENTER')
    
    # Drain holes
    drain_offset = 25.0
    for v in VERTICES:
        dx = centroid[0] - v[0]
        dy = centroid[1] - v[1]
        dist = math.sqrt(dx*dx + dy*dy)
        dx2 = v[0] + drain_offset * dx / dist
        dy2 = v[1] + drain_offset * dy / dist
        add_hole(msp, dx2, dy2, DRAIN_DIA, 'CUT')
    
    # Battery access slot
    add_rectangle(msp, -60, SIDE_EDGE_W/2 - 40, 120, 80, 'CUT')
    
    # Perimeter channel indication (reference only, machined in 3D)
    # Add dashed outline showing channel path
    channel_offset = CHANNEL_WIDTH / 2
    # Front channel
    add_rectangle(msp, 
                   -FRONT_EDGE_W/2 - channel_offset, 
                   -channel_offset, 
                   FRONT_EDGE_W + 2*channel_offset, 
                   CHANNEL_WIDTH, 
                   'REFS')
    
    # Dimensions
    add_dimension(msp, HP_V1[0], HP_V1[1], HP_V2[0], HP_V2[1], 
                  '17" (431.8mm)', offset=-20, layer='DIMS')
    add_dimension(msp, HP_V2[0], HP_V2[1], HP_V3[0], HP_V3[1],
                  '8.5" (215.9mm)', offset=20, layer='DIMS')
    add_dimension(msp, HP_V3[0], HP_V3[1], HP_V4[0], HP_V4[1],
                  '12" (304.8mm)', offset=20, layer='DIMS')
    
    # Title block
    msp.add_text('SmartHome Plate — BASE PLATE', dxfattribs={'layer': 'DIMS', 'height': 6}
                 ).set_placement((-200, -40))
    msp.add_text('Material: 6061-T6 Aluminum, 1/4" (6.35mm)', dxfattribs={'layer': 'DIMS', 'height': 3}
                 ).set_placement((-200, -48))
    msp.add_text('Tolerance: ±0.005"', dxfattribs={'layer': 'DIMS', 'height': 3}
                 ).set_placement((-200, -53))
    msp.add_text('Finish: Bead-blasted, Anodized', dxfattribs={'layer': 'DIMS', 'height': 3}
                 ).set_placement((-200, -58))
    
    filepath = os.path.join(output_dir, 'base_plate.dxf')
    doc.saveas(filepath)
    print(f"  [OK] Generated: {filepath}")
    return filepath


# ============================================================================
# 2. TOP PLATE
# ============================================================================
def generate_top_plate(output_dir):
    doc, msp = create_dxf(output_dir + '/top_plate.dxf', 'Top Plate')
    
    # Outer profile
    add_home_plate_outline(msp, offset=FILLET_R, layer='CUT')
    add_home_plate_outline(msp, offset=0, layer='REFS')
    
    # Through-holes for M8 rods
    for v in VERTICES:
        add_hole(msp, v[0], v[1], ROD_DIA, 'CUT')
        add_center_mark(msp, v[0], v[1], size=8, layer='CENTER')
        add_hole(msp, v[0], v[1], WASHER_DIA, 'REFS')
    
    # Display cutout
    add_rectangle(msp, -DISPLAY_W/2, DISPLAY_Y - DISPLAY_H/2, DISPLAY_W, DISPLAY_H, 'CUT')
    
    # Camera cutouts
    add_hole(msp, WIDE_CAM_X, CAM_Y, WIDE_CAM_DIA, 'CUT')
    add_center_mark(msp, WIDE_CAM_X, CAM_Y, size=4, layer='CENTER')
    add_hole(msp, HS_CAM_X, CAM_Y, HS_CAM_DIA, 'CUT')
    add_center_mark(msp, HS_CAM_X, CAM_Y, size=4, layer='CENTER')
    
    # Radar cutout
    add_rectangle(msp, -RADAR_W/2, RADAR_Y - RADAR_H/2, RADAR_W, RADAR_H, 'CUT')
    
    # Ventilation slots (near back)
    vent_positions = [
        (-30, 250), (-10, 270), (10, 290), 
        (30, 310), (0, 330), (-20, 350)
    ]
    for vx, vy in vent_positions:
        add_rectangle(msp, vx - 1.5, vy - 10, 3, 20, 'CUT')
    
    # Electronics tray mounting holes
    tray_holes = [(-40, 70), (40, 70), (-40, 140), (40, 140)]
    for px, py in tray_holes:
        add_hole(msp, px, py, M4_DIA, 'CUT')
        add_hole(msp, px, py, 6.5, 'REFS')  # Heat-set insert
        add_center_mark(msp, px, py, size=3, layer='CENTER')
    
    # Dimensions
    add_dimension(msp, HP_V1[0], HP_V1[1], HP_V2[0], HP_V2[1],
                  '17" (431.8mm)', offset=-20, layer='DIMS')
    
    msp.add_text('SmartHome Plate — TOP PLATE', dxfattribs={'layer': 'DIMS', 'height': 6}
                 ).set_placement((-200, -40))
    msp.add_text('Material: 6061-T6 Aluminum, 1/4" (6.35mm)', dxfattribs={'layer': 'DIMS', 'height': 3}
                 ).set_placement((-200, -48))
    msp.add_text('Note: Display, Camera, Radar, and Vent cutouts shown', 
                 dxfattribs={'layer': 'DIMS', 'height': 3}).set_placement((-200, -53))
    
    filepath = os.path.join(output_dir, 'top_plate.dxf')
    doc.saveas(filepath)
    print(f"  [OK] Generated: {filepath}")
    return filepath


# ============================================================================
# 3-7. POLYCARBONATE PANELS
# ============================================================================
def generate_panel(output_dir, name, width, has_display=False, has_camera=False):
    """Generate a DXF for a polycarbonate panel."""
    doc, msp = create_dxf(output_dir + f'/{name}.dxf', name)
    
    height = PANEL_HEIGHT
    
    # Outer profile
    add_rectangle(msp, 0, 0, width, height, 'CUT')
    
    # Piezo sensor reference marks
    add_piezo_marks(msp, width, height, 'REFS')
    
    # Mounting holes
    add_mounting_holes(msp, width, height, 'CUT')
    
    # LED row reference lines (every 25.4mm / 1 inch)
    for z in range(int(152.4), int(height), 25):  # Start at 6" from bottom
        msp.add_line(start=(5, z), end=(width - 5, z), 
                     dxfattribs={'layer': 'REFS', 'linetype': 'DASHED'})
    
    # Strike zone indicator lines (typical zones)
    # Little League: ~16-28" (bottom 12" of panel)
    msp.add_line(start=(width - 15, height - 0.38*height), 
                 end=(width, height - 0.38*height),
                 dxfattribs={'layer': 'DIMS', 'linetype': 'DASHED'})
    msp.add_text('LL', dxfattribs={'layer': 'DIMS', 'height': 4}
                 ).set_placement((width - 12, height - 0.38*height + 2))
    
    # High School: ~18-32" 
    msp.add_line(start=(width - 15, height - 0.47*height),
                 end=(width, height - 0.47*height),
                 dxfattribs={'layer': 'DIMS', 'linetype': 'DASHED'})
    msp.add_text('HS', dxfattribs={'layer': 'DIMS', 'height': 4}
                 ).set_placement((width - 12, height - 0.47*height + 2))
    
    # College/Pro: ~20-36"
    msp.add_line(start=(width - 15, height - 0.55*height),
                 end=(width, height - 0.55*height),
                 dxfattribs={'layer': 'DIMS', 'linetype': 'DASHED'})
    msp.add_text('PRO', dxfattribs={'layer': 'DIMS', 'height': 4}
                 ).set_placement((width - 12, height - 0.55*height + 2))
    
    if has_display:
        # Display window cutout
        disp_x = (width - DISPLAY_W) / 2
        disp_y = height * 0.55
        add_rectangle(msp, disp_x, disp_y, DISPLAY_W, DISPLAY_H, 'CUT')
        msp.add_text('DISPLAY WINDOW', dxfattribs={'layer': 'DIMS', 'height': 3}
                     ).set_placement((disp_x + 5, disp_y + DISPLAY_H/2))
        
        # Camera lens windows (above display)
        cam_y = height * 0.82
        add_rectangle(msp, width/2 - 25, cam_y - 8, 20, 15, 'CUT')
        add_rectangle(msp, width/2 + 5, cam_y - 8, 20, 15, 'CUT')
        msp.add_text('CAM-W', dxfattribs={'layer': 'DIMS', 'height': 2}
                     ).set_placement((width/2 - 22, cam_y + 10))
        msp.add_text('CAM-HS', dxfattribs={'layer': 'DIMS', 'height': 2}
                     ).set_placement((width/2 + 8, cam_y + 10))
    
    # Dimensions
    add_dimension(msp, 0, 0, width, 0, f'{width:.1f}mm', offset=-15, layer='DIMS')
    add_dimension(msp, width + 5, 0, width + 5, height, f'{height:.1f}mm', offset=15, layer='DIMS')
    
    # Title block
    msp.add_text(f'SmartHome Plate — {name.upper()}', dxfattribs={'layer': 'DIMS', 'height': 5}
                 ).set_placement((-50, -25))
    msp.add_text('Material: Polycarbonate (Lexan), 3/8" (9.525mm)', 
                 dxfattribs={'layer': 'DIMS', 'height': 3}).set_placement((-50, -32))
    msp.add_text('Both sides UV-hardcoated, front surface anti-glare',
                 dxfattribs={'layer': 'DIMS', 'height': 3}).set_placement((-50, -37))
    msp.add_text('Tolerance: ±0.010"', dxfattribs={'layer': 'DIMS', 'height': 3}
                 ).set_placement((-50, -42))
    msp.add_text(f'Quantity: {"1" if has_display else "1"}',
                 dxfattribs={'layer': 'DIMS', 'height': 3}).set_placement((-50, -47))
    
    filepath = os.path.join(output_dir, f'{name}.dxf')
    doc.saveas(filepath)
    print(f"  [OK] Generated: {filepath}")
    return filepath


# ============================================================================
# MAIN — Generate all DXF files
# ============================================================================
def main():
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cnc')
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 60)
    print("SmartHome Plate™ — CNC DXF Generator")
    print("=" * 60)
    print(f"Output directory: {output_dir}")
    print()
    
    # Generate base and top plates (aluminum, CNC milled)
    print("Generating aluminum plate DXF files...")
    generate_base_plate(output_dir)
    generate_top_plate(output_dir)
    print()
    
    # Generate polycarbonate panels (CNC routed)
    print("Generating polycarbonate panel DXF files...")
    generate_panel(output_dir, 'front_panel', FRONT_EDGE_W, 
                   has_display=True, has_camera=True)
    generate_panel(output_dir, 'side_panel_left', SIDE_EDGE_W)
    generate_panel(output_dir, 'side_panel_right', SIDE_EDGE_W)
    generate_panel(output_dir, 'rear_panel_left', DIAG_EDGE_W)
    generate_panel(output_dir, 'rear_panel_right', DIAG_EDGE_W)
    print()
    
    print("=" * 60)
    print("All DXF files generated successfully!")
    print("=" * 60)
    print()
    print("CNC NOTES:")
    print("  - Aluminum plates: 3-axis CNC mill, 1/4\" 6061-T6 stock")
    print("  - Polycarbonate panels: CNC router, 3/8\" Lexan sheet")
    print("  - All dimensions in millimeters")
    print("  - CUT layer (RED): Cut profiles and through-holes")
    print("  - REFS layer (GREEN): Sensor positions and references")
    print("  - CENTER layer (BLUE): Hole center marks")
    print("  - DIMS layer (YELLOW): Dimensions and notes")
    print("  - ENGRAVE layer (WHITE): Engravings and text")


if __name__ == '__main__':
    main()