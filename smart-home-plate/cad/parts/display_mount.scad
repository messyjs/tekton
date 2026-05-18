// ============================================================================
// SmartHome Plate™ — Display Mount Frame (3D Printed PETG)
// ============================================================================
// Holds the 5" IPS display (800×480) in the front panel cutout
// Snaps into the display window recess in the polycarbonate front panel
// Manufacturing: FDM 3D printing, PETG, 30% infill
// ============================================================================

use <../parameters.scad>

// Display dimensions (5" IPS, 800x480)
disp_w = 120.0;     // Display PCB width
disp_h = 78.0;      // Display PCB height  
disp_depth = 8.0;    // Display + PCB thickness
lip_overlap = 2.0;   // Overlap onto panel face
snap_depth = 3.0;    // Snap-fit tab depth

module display_mount() {
    difference() {
        // Outer frame with lip
        union() {
            // Main body (fits inside panel cutout)
            cube([disp_w + 4, disp_depth + 4, display_cutout_h + 4], center=false);
            
            // Front lip (overlaps panel surface)
            translate([-lip_overlap, -lip_overlap, -lip_overlap])
            cube([disp_w + 4 + 2*lip_overlap, disp_depth + 4 + 2*lip_overlap, lip_overlap + 2], center=false);
        }
        
        // Display recess (display slides in from side)
        translate([2, 2, 2])
        cube([disp_w, disp_depth, display_cutout_h], center=false);
        
        // Window opening (slightly smaller than display active area)
        window_margin = 8;  // 8mm margin for display bezel
        translate([2 + window_margin, -1, 2 + window_margin])
        cube([disp_w - 2*window_margin, 5, display_cutout_h - 2*window_margin], center=false);
        
        // Cable exit slot (bottom edge)
        translate([disp_w/2 - 10, 2, display_cutout_h + 2 - 2])
        cube([20, 6, 5], center=false);
        
        // M3 mounting holes for display PCB (4×)
        for (pos = [
            [8, 8],
            [disp_w - 4, 8],
            [8, 38],
            [disp_w - 4, 38]
        ]) {
            translate([pos[0], pos[1] - 15, 2])
            cylinder(d = 3.2, h = disp_depth, $fn = 16);
            // Heat-set insert recess
            translate([pos[0], pos[1] - 15, 2])
            cylinder(d = heatset_insert_dia - 1, h = 4, $fn = 16);
        }
        
        // Snap-fit tabs on sides (4×, 2 per side)
        for (y_pos = [10, disp_depth/2, display_cutout_h - 10]) {
            // Left side snap slot
            translate([-lip_overlap, -1, y_pos + 2])
            cube([lip_overlap + 1, snap_depth, 3], center=false);
            
            // Right side snap slot
            translate([disp_w + 4, -1, y_pos + 2])
            cube([lip_overlap + 1, snap_depth, 3], center=false);
        }
        
        // Top and bottom snap slots
        for (x_pos = [15, disp_w/2, disp_w - 10]) {
            // Top snap slot
            translate([x_pos, -1, display_cutout_h + 4 - lip_overlap])
            cube([3, snap_depth + 2, lip_overlap + 1], center=false);
            
            // Bottom snap slot
            translate([x_pos, -1, -lip_overlap])
            cube([3, snap_depth + 2, lip_overlap + 1], center=false);
        }
    }
}

$fn = 32;
display_mount();