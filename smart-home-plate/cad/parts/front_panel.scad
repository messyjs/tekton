// ============================================================================
// SmartHome Plate™ — Front Panel (Polycarbonate, CNC Routed)
// ============================================================================
// Panel A: Faces the pitcher, 17" (431.8mm) wide
// Manufacturing: CNC router from 3/8" polycarbonate sheet
// Tolerance: ±0.010" (±0.25mm)
// Finish: Both sides UV-hardcoated, front surface anti-glare
// ============================================================================

use <../parameters.scad>

panel_height = device_height - 2 * channel_depth + gasket_compression;

module front_panel() {
    difference() {
        // Main panel — rectangular slab of polycarbonate
        translate([0, 0, 0])
        cube([front_edge_width - 2*fit_loose, panel_thickness, panel_height], center=false);
        
        // ---- Display window cutout ----
        // Positioned at 65% height from bottom, centered horizontally
        display_bottom_z = panel_height * 0.55;
        translate([
            (front_edge_width - display_cutout_w) / 2 - fit_loose,
            -1,
            display_bottom_z
        ])
        cube([display_cutout_w + 2*fit_loose, panel_thickness + 2, display_cutout_h], center=false);
        
        // Display window recess (deeper pocket on inside surface for display mount frame)
        // 2mm lip all around the display window for the mount to snap into
        display_lip = 2.0;
        translate([
            (front_edge_width - display_cutout_w) / 2 - fit_loose - display_lip,
            panel_thickness / 2,  // Inside surface (mid-thickness for pocket)
            display_bottom_z - display_lip
        ])
        // Note: in actual manufacturing, this would be a shallow pocket
        // For now, just the through-cutout is sufficient
        
        // ---- Wide-angle camera lens window ----
        // Small optically-clear section above display
        cam_y_z = panel_height * 0.85;  // Near top
        cam_x = front_edge_width / 2 - 30;
        translate([cam_x - 10, -1, cam_y_z - 10])
        cube([20, panel_thickness + 2, 15], center=false);
        
        // ---- High-speed camera lens window ----
        hcam_x = front_edge_width / 2 + 30 - 10;
        translate([hcam_x, -1, cam_y_z - 10])
        cube([20, panel_thickness + 2, 15], center=false);
        
        // ---- Piezo sensor position markers (surface indicators, not through-holes) ----
        // These are etched/reference marks for sensor placement during assembly
        // Bottom-left corner sensor
        piezo_bl_x = piezo_from_corner;
        piezo_bl_z = piezo_from_corner;
        
        // Four corner positions (etched circles on inner surface)
        for (pos = [
            [piezo_from_corner, piezo_from_corner],                    // Bottom-left
            [front_edge_width - piezo_from_corner, piezo_from_corner], // Bottom-right
            [piezo_from_corner, panel_height - piezo_from_corner],     // Top-left
            [front_edge_width - piezo_from_corner, panel_height - piezo_from_corner] // Top-right
        ]) {
            // Sensor reference mark (0.5mm deep etch, not through)
            translate([pos[0], panel_thickness - 0.5, pos[1]])
            cube([piezo_width, 0.6, piezo_height], center=true);
        }
        
        // ---- Panel retainer mounting holes (4× M4) ----
        // Near each corner, inset from edge
        retainer_inset_x = 15;
        retainer_inset_z = 15;
        retainer_positions = [
            [retainer_inset_x, retainer_inset_z],
            [front_edge_width - retainer_inset_x, retainer_inset_z],
            [retainer_inset_x, panel_height - retainer_inset_z],
            [front_edge_width - retainer_inset_x, panel_height - retainer_inset_z]
        ];
        for (pos = retainer_positions) {
            translate([pos[0], -1, pos[1]])
            rotate([-90, 0, 0])
            cylinder(d = 4.2, h = panel_thickness + 2, $fn = 16);
        }
        
        // ---- Gasket groove on top and bottom edges ----
        // 1.5mm wide × 2mm deep groove for EPDM gasket seal
        // Top edge
        translate([10, panel_thickness/2 - 0.75, panel_height - 2])
        cube([front_edge_width - 20, 1.5, 2.5]);
        // Bottom edge
        translate([10, panel_thickness/2 - 0.75, -0.5])
        cube([front_edge_width - 20, 1.5, 2.5]);
    }
    
    // ---- LED matrix area reference lines (etched, not through) ----
    // Horizontal lines every 25.4mm (1 inch) to show LED row positions
    // These are very faint etch marks for alignment during assembly
    color([0.9, 0.9, 0.95])
    for (z = [led_rows_min : 25.4 : panel_height]) {
        translate([5, panel_thickness - 0.2, z])
        cube([front_edge_width - 10, 0.3, 0.1]);
    }
}

$fn = 64;

// Display the panel standing up, centered
// In the assembly, this panel's front face (Y=0) faces the pitcher
// and it's positioned at the front edge of the home plate
translate([0, 0, channel_depth - gasket_compression/2])
front_panel();

// Annotation showing this is Panel A (Front, 17")
// In OpenSCAD console: echo("Panel A: Front panel, 431.8mm wide, faces pitcher");