// ============================================================================
// SmartHome Plate™ — Full Assembly Model
// ============================================================================
// This file renders the complete assembly. Toggle visibility of sub-assemblies
// using the boolean flags below. Export individual parts from their respective
// files for manufacturing.
//
// RENDERING: Open this file in OpenSCAD. Use Design > Compile and Render (F6)
//            for final STL/DXF export.
// ============================================================================

use <parameters.scad>
use <parts/base_plate.scad>
use <parts/top_plate.scad>
use <parts/front_panel.scad>
use <parts/side_panel_left.scad>
use <parts/side_panel_right.scad>
use <parts/rear_panel_left.scad>
use <parts/rear_panel_right.scad>
use <parts/electronics_tray.scad>
use <parts/adjustable_foot.scad>
use <parts/display_mount.scad>

// ============================================================================
// VISIBILITY TOGGLES — Set to false to hide parts
// ============================================================================
show_base_plate      = true;
show_top_plate       = true;
show_panels          = true;
show_through_rods    = true;
show_electronics    = true;
show_feet            = true;
show_exploded        = false;    // Set true for exploded view

// ============================================================================
// COLOR DEFINITIONS
// ============================================================================
c_polycarbonate  = [0.85, 0.92, 0.96, 0.50]; // Clear blue-ish tint
c_aluminum       = [0.75, 0.78, 0.80, 1.00]; // Brushed aluminum
c_steel          = [0.70, 0.70, 0.72, 1.00]; // Stainless steel
c_pcb_green      = [0.10, 0.55, 0.15, 1.00]; // Electronics tray
c_rubber         = [0.15, 0.15, 0.15, 1.00]; // Black rubber
c_led_strip      = [0.20, 0.20, 0.20, 1.00]; // Dark PCB
c_display        = [0.05, 0.05, 0.10, 1.00]; // Dark display
c_petg           = [0.90, 0.90, 0.85, 0.80]; // 3D printed PETG

// ============================================================================
// ASSEMBLY
// ============================================================================
explode_offset = show_exploded ? 80 : 0;

module home_plate_polygon(offset_val=0) {
    // Generates the home plate polygon, optionally offset outward
    // offset_val > 0 enlarges, < 0 shrinks
    offset(r=offset_val)
    polygon(points=[hp_v1, hp_v2, hp_v3, hp_v4, hp_v5]);
}

// --- BASE PLATE ---
if (show_base_plate) {
    translate([0, 0, -explode_offset])
    color(c_aluminum)
    base_plate();
}

// --- TOP PLATE ---
if (show_top_plate) {
    translate([0, 0, device_height + explode_offset])
    color(c_aluminum)
    top_plate();
}

// --- THROUGH RODS (5x at each vertex) ---
if (show_through_rods) {
    vertices = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5];
    for (i = [0:4]) {
        v = vertices[i];
        color(c_steel)
        translate([v[0], v[1], 0])
        cylinder(d=rod_diameter, h=device_height + plate_thickness * 2, $fn=32);
        
        // Top nut + washer
        color(c_steel)
        translate([v[0], v[1], device_height + plate_thickness])
        cylinder(d=washer_diameter, h=1.5, $fn=32);
        
        color(c_steel)
        translate([v[0], v[1], device_height + plate_thickness + 1.5])
        cylinder(d=rod_diameter*1.7, h=nut_height, $fn=6); // hex nut
        
        // Bottom nut + washer
        color(c_steel)
        translate([v[0], v[1], -plate_thickness - 1.5])
        cylinder(d=washer_diameter, h=1.5, $fn=32);
        
        color(c_steel)
        translate([v[0], v[1], -plate_thickness - 1.5 - nut_height])
        cylinder(d=rod_diameter*1.7, h=nut_height, $fn=6); // hex nut
    }
}

// --- POLYCARBONATE PANELS ---
if (show_panels) {
    // Panel A — Front (facing pitcher, 17" wide)
    color(c_polycarbonate)
    translate([0, 0, 0])
    front_panel();
    
    // Panel B — Right side (8.5" wide)
    color(c_polycarbonate)
    rotate([0, 0, 90])
    translate([0, 0, 0])
    side_panel_right();
    
    // Panel C — Right diagonal (12" wide)
    color(c_polycarbonate)
    translate([0, 0, 0])
    rear_panel_right();
    
    // Panel D — Left diagonal (12" wide)
    color(c_polycarbonate)
    translate([0, 0, 0])
    rear_panel_left();
    
    // Panel E — Left side (8.5" wide)
    color(c_polycarbonate)
    rotate([0, 0, -90])
    translate([0, 0, 0])
    side_panel_left();
}

// --- ADJUSTABLE FEET ---
if (show_feet) {
    feet_positions = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5];
    for (i = [0:4]) {
        f = feet_positions[i];
        color(c_rubber)
        translate([f[0], f[1], -plate_thickness - 19.05 + (show_exploded ? -explode_offset : 0)])
        adjustable_foot();
    }
}

// --- ELECTRONICS TRAY ---
if (show_electronics) {
    color(c_petg)
    translate([0, 100, device_height * 0.55 + (show_exploded ? explode_offset*0.5 : 0)])
    electronics_tray();
}

// --- DISPLAY MOUNT ---
if (show_electronics) {
    color(c_petg)
    translate([-display_cutout_w/2, -plate_thickness - 5, device_height * 0.7])
    rotate([0, 0, 0])
    display_mount();
}

// --- DIMENSION ANNOTATIONS ---
// These show key dimensions when rendered
module dimension_line(start, end, offset=10, text_str="") {
    // Draw a dimension line with text
    dir = end - start;
    len = norm(dir);
    mid = (start + end) / 2;
    perp = [-dir[1], dir[0], 0] / norm([-dir[1], dir[0], 0]) * offset;
    
    color([0.3, 0.3, 0.3])
    {
        // Line
        translate(mid + perp)
        rotate([0, 0, atan2(dir[1], dir[0])])
        translate([0, 0, 0])
        cube([len, 0.5, 0.5], center=true);
        
        // End ticks
        for (p = [start, end]) {
            translate(p + perp)
            cube([0.5, offset*0.8, 0.5], center=true);
        }
        
        // Text
        if (text_str != "") {
            translate(mid + perp * 1.5)
            text(text_str, size=5, halign="center", valign="center");
        }
    }
}

// Uncomment to show dimensions:
// dimension_line(hp_v1, hp_v2, offset=15, text_str="17\" / 431.8mm");
// dimension_line(hp_v2, hp_v3, offset=15, text_str="8.5\" / 215.9mm");

// ============================================================================
// EXPORT INSTRUCTIONS
// ============================================================================
// To export individual parts for manufacturing:
// 
// 1. CNC Aluminum Parts (DXF format):
//    - Open each part .scad file in OpenSCAD
//    - Use projection() to create 2D outlines
//    - File > Export > DXF
//    OR run gen_dxf.py for direct DXF generation
//
// 2. 3D Printed Parts (STL format):
//    - Compile and Render (F6) each part file
//    - File > Export > STL
//
// 3. Polycarbonate Panels (DXF format):
//    - Same as CNC aluminum parts
//    - Use projection() for 2D outline
//    - Include all interior cutouts (display window, sensor positions)
//
// 4. Full Assembly Visualization:
//    - Compile and Render this file (F6)
//    - Export as STL or 3MF for review
// ============================================================================