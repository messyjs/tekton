// ============================================================================
// SmartHome Plate™ — Adjustable Foot Assembly
// ============================================================================
// Telescoping leg with 3-position quick-detent
// Manufacturing: Aluminum 6063 tube (CNC milled slots + drilled holes)
//                + stainless spring pin + polyurethane foot
// ============================================================================

use <../parameters.scad>

module adjustable_foot(extension=0) {
    // extension = 0, 50.8, 127.0, or 203.2 (mm for each detent position)
    valid_extensions = [0, leg_extension_low, leg_extension_mid, leg_extension_high];
    ext = (extension == 0) ? 0 : extension;
    
    // ---- Outer tube ----
    difference() {
        // Outer square tube
        translate([-leg_outer_width/2, -leg_outer_width/2, 0])
        cube([leg_outer_width, leg_outer_width, 80]);
        
        // Inner bore
        bore = leg_outer_width - 2 * leg_outer_wall;
        translate([-bore/2, -bore/2, -1])
        cube([bore, bore, 82]);
        
        // Detent holes (3 positions, spring-pin access)
        for (i = [0:2]) {
            hole_z = 20 + i * 30;  // Spaced 30mm apart
            translate([leg_outer_width/2 + 1, 0, hole_z])
            rotate([0, 90, 0])
            cylinder(d = detent_hole_dia + 0.5, h = leg_outer_wall + 2, $fn = 16);
        }
        
        // M6 threaded hole at top for base plate mounting
        translate([0, 0, 75])
        cylinder(d = 6.5, h = 10, $fn = 16);
    }
    
    // ---- Inner tube (slides inside outer) ----
    translate([0, 0, -ext - 20])  // Extended downward
    difference() {
        // Inner square tube
        translate([-leg_inner_width/2, -leg_inner_width/2, 0])
        cube([leg_inner_width, leg_inner_width, 120]);
        
        // Inner bore
        inner_bore = leg_inner_width - 2 * leg_inner_wall;
        translate([-inner_bore/2, -inner_bore/2, -1])
        cube([inner_bore, inner_bore, 122]);
        
        // Spring pin hole (through both walls, aligns with outer tube detents)
        for (i = [0:2]) {
            pin_z = 20 + i * 30;  // Same positions as outer tube holes
            // Front hole
            translate([leg_inner_width/2 + 1, 0, pin_z + ext + 20])
            rotate([0, 90, 0])
            cylinder(d = detent_hole_dia, h = leg_inner_wall + 2, $fn = 16);
            // Back hole
            translate([-leg_inner_width/2 - leg_inner_wall - 1, 0, pin_z + ext + 20])
            rotate([0, 90, 0])
            cylinder(d = detent_hole_dia, h = leg_inner_wall + 2, $fn = 16);
        }
    }
    
    // ---- Spring-loaded detent pin (stainless steel) ----
    // Simplified: just a cylinder at the lowest position
    pin_z = 20;
    color([0.7, 0.7, 0.72])
    translate([0, 0, pin_z])
    cylinder(d = detent_hole_dia - 0.5, h = leg_inner_width + 2, center=true, $fn = 16);
    
    // ---- Rubber foot pad ----
    color([0.15, 0.15, 0.15])
    translate([0, 0, -ext - 20 - 5])
    difference() {
        cylinder(d = foot_diameter, h = foot_height, $fn = 32);
        // Anti-slip texture pattern (concentric rings)
        for (r = [5 : 5 : foot_diameter/2 - 5]) {
            translate([0, 0, -0.5])
            difference() {
                cylinder(d = r * 2 + 4, h = 1, $fn = 32);
                cylinder(d = r * 2 - 4, h = 2, $fn = 32);
            }
        }
    }
}

$fn = 64;

// Render at default (fully retracted) position
adjustable_foot(0);

// To render at other positions, change the argument:
// adjustable_foot(leg_extension_low);   // 2" extension
// adjustable_foot(leg_extension_mid);   // 5" extension  
// adjustable_foot(leg_extension_high);  // 8" extension