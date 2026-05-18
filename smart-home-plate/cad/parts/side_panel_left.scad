// ============================================================================
// SmartHome Plate™ — Side Panel Left (Polycarbonate, CNC Routed)
// ============================================================================
// Panel E: Left side panel, 8.5" (215.9mm) wide
// Manufacturing: CNC router from 3/8" polycarbonate sheet
// ============================================================================

use <../parameters.scad>

panel_height = device_height - 2 * channel_depth + gasket_compression;

module side_panel_left() {
    difference() {
        // Main panel
        cube([side_edge_width - 2*fit_loose, panel_thickness, panel_height], center=false);
        
        // ---- Piezo sensor position markers ----
        for (pos = [
            [piezo_from_corner, piezo_from_corner],
            [side_edge_width - piezo_from_corner, piezo_from_corner],
            [piezo_from_corner, panel_height - piezo_from_corner],
            [side_edge_width - piezo_from_corner, panel_height - piezo_from_corner]
        ]) {
            translate([pos[0], panel_thickness - 0.5, pos[1]])
            cube([piezo_width, 0.6, piezo_height], center=true);
        }
        
        // ---- Panel retainer mounting holes (4× M4) ----
        retainer_inset = 15;
        for (pos = [
            [retainer_inset, retainer_inset],
            [side_edge_width - retainer_inset, retainer_inset],
            [retainer_inset, panel_height - retainer_inset],
            [side_edge_width - retainer_inset, panel_height - retainer_inset]
        ]) {
            translate([pos[0], -1, pos[1]])
            rotate([-90, 0, 0])
            cylinder(d = 4.2, h = panel_thickness + 2, $fn = 16);
        }
        
        // ---- Gasket groove ----
        translate([10, panel_thickness/2 - 0.75, panel_height - 2])
        cube([side_edge_width - 20, 1.5, 2.5]);
        translate([10, panel_thickness/2 - 0.75, -0.5])
        cube([side_edge_width - 20, 1.5, 2.5]);
    }
    
    // LED row reference lines
    color([0.9, 0.9, 0.95])
    for (z = [led_rows_min : 25.4 : panel_height]) {
        translate([5, panel_thickness - 0.2, z])
        cube([side_edge_width - 10, 0.3, 0.1]);
    }
}

$fn = 64;
side_panel_left();