// ============================================================================
// SmartHome Plate™ — Base Plate (CNC Aluminum 6061-T6)
// ============================================================================
// Manufacturing: 3-axis CNC mill from 1/4" aluminum plate
// Tolerance: ±0.005" (±0.13mm)
// Finish: bead-blasted, anodized black or natural
// ============================================================================

use <../parameters.scad>

module base_plate() {
    difference() {
        // Main plate body — home plate pentagon
        linear_extrude(height = plate_thickness)
        offset(r = 3)  // 3mm fillet on all outer edges
        polygon(points = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5]);
        
        // ---- Perimeter channel for polycarbonate panels ----
        // This channel runs around the entire perimeter, 12mm deep, 
        // wide enough for the panel + gasket clearance
        // Front edge channel
        translate([0, -channel_width/2, plate_thickness - channel_depth])
        cube([front_edge_width, channel_width, channel_depth + 1], center=true);
        
        // Right side channel (perpendicular to front edge)
        translate([front_edge_width/2 + channel_width/2, side_edge_width/2, plate_thickness - channel_depth])
        cube([channel_width, side_edge_width, channel_depth + 1], center=false);
        
        // Left side channel (perpendicular to front edge)
        translate([-front_edge_width/2 - channel_width/2, side_edge_width/2, plate_thickness - channel_depth])
        cube([channel_width, side_edge_width, channel_depth + 1], center=false);
        
        // Right diagonal channel (from V3 to V4)
        hull() {
            translate([hp_v3[0], hp_v3[1], plate_thickness - channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
            translate([hp_v4[0], hp_v4[1], plate_thickness - channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
        }
        
        // Left diagonal channel (from V4 to V5)
        hull() {
            translate([hp_v4[0], hp_v4[1], plate_thickness - channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
            translate([hp_v5[0], hp_v5[1], plate_thickness - channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
        }
        
        // ---- Through-holes for M8 rods at each vertex ----
        for (v = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5]) {
            // M8 rod clearance hole
            translate([v[0], v[1], -1])
            cylinder(d = rod_diameter + 0.5, h = plate_thickness + 2, $fn = 32);
            
            // Washer recess on top
            translate([v[0], v[1], plate_thickness - 2])
            cylinder(d = washer_diameter + 0.5, h = 2.5, $fn = 32);
            
            // Washer recess on bottom
            translate([v[0], v[1], -0.5])
            cylinder(d = washer_diameter + 0.5, h = 2.5, $fn = 32);
        }
        
        // ---- M6 threaded insert holes for adjustable feet (5×) ----
        // Slightly inset from vertices for stability
        foot_offset = 15.0;  // mm inset from each vertex toward center
        for (i = [0:4]) {
            v = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5][i];
            // Calculate direction toward centroid
            centroid = [0, side_edge_width * 0.6];
            dir = (centroid - v) / norm(centroid - v);
            fpos = v + dir * foot_offset;
            
            translate([fpos[0], fpos[1], -1])
            cylinder(d = 6.5, h = plate_thickness + 2, $fn = 32);
        }
        
        // ---- Drain holes for condensation (4mm near each vertex) ----
        drain_offset = 25.0;
        for (i = [0:4]) {
            v = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5][i];
            centroid = [0, side_edge_width * 0.6];
            dir = (centroid - v) / norm(centroid - v);
            dpos = v + dir * drain_offset;
            
            translate([dpos[0], dpos[1], -1])
            cylinder(d = 3.0, h = plate_thickness + 2, $fn = 16);
        }
        
        // ---- Battery access slot (rectangular, center of plate) ----
        translate([-60, side_edge_width/2 - 40, -1])
        cube([120, 80, plate_thickness + 2]);
        
        // ---- Gasket channel (1.5mm wide, 2mm deep, runs full perimeter) ----
        // This is an inner channel inside the panel channel for the EPDM gasket
        gasket_offset = channel_width/2 - 2;
        // Front gasket
        translate([0, -gasket_offset, plate_thickness - channel_depth])
        cube([front_edge_width - 10, 2.0, 3.0], center=true);
    }
    
    // ---- Corner reinforcements (fillets) ----
    // Small triangular gussets at each inside corner for strength
    for (v = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5]) {
        translate([v[0], v[1], 0])
        cylinder(d = 12, h = plate_thickness, $fn = 32);
    }
}

// Render with $fn for smooth circles
$fn = 64;

base_plate();