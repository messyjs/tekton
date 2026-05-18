// ============================================================================
// SmartHome Plate™ — Electronics Tray (3D Printed PETG)
// ============================================================================
// Houses: Jetson Orin Nano, ESP32-S3 (×5), radar module, BMS, wiring
// Manufacturing: FDM 3D printing, PETG, 30% infill, 0.4mm nozzle
// Post-processing: Heat-set brass inserts for M4 mounting
// ============================================================================

use <../parameters.scad>

tray_width = 180;
tray_depth = 140;
tray_height = 30;
wall_thickness = 2.0;
corner_radius = 5;

module electronics_tray() {
    difference() {
        // Main tray body with rounded corners
        hull() {
            for (x = [corner_radius, tray_width - corner_radius]) {
                for (y = [corner_radius, tray_depth - corner_radius]) {
                    translate([x, y, 0])
                    cylinder(r = corner_radius, h = tray_height, $fn = 32);
                }
            }
        }
        
        // ---- Inner cavity ----
        translate([wall_thickness, wall_thickness, wall_thickness])
        hull() {
            for (x = [corner_radius, tray_width - corner_radius - wall_thickness]) {
                for (y = [corner_radius, tray_depth - corner_radius - wall_thickness]) {
                    translate([x, y, 0])
                    cylinder(r = corner_radius - wall_thickness/2, h = tray_height, $fn = 32);
                }
            }
        }
        
        // ---- Jetson Orin Nano mounting (85mm × 55mm PCB) ----
        jetson_x = 15;
        jetson_y = 15;
        jetson_w = 85;
        jetson_d = 55;
        // 4× M2.5 mounting holes
        for (pos = [
            [jetson_x + 3, jetson_y + 3],
            [jetson_x + jetson_w - 3, jetson_y + 3],
            [jetson_x + 3, jetson_y + jetson_d - 3],
            [jetson_x + jetson_w - 3, jetson_y + jetson_d - 3]
        ]) {
            translate([pos[0], pos[1], wall_thickness])
            cylinder(d = 2.8, h = 5, $fn = 16);
            translate([pos[0], pos[1], wall_thickness + 3])
            cylinder(d = 5.5, h = 3, $fn = 16);  // Screw head recess
        }
        
        // ---- ESP32-S3 × 4 mounting positions (for LED controllers) ----
        // Each ESP32-S3 DevKit: 55mm × 28mm
        esp_positions = [
            [110, 15, 0],    // Panel A controller (front)
            [110, 50, 0],    // Panel B/C controller (right)
            [110, 85, 0],    // Panel D/E controller (left/back)
            [110, 115, 0]    // Master controller / WiFi
        ];
        for (pos = esp_positions) {
            // 4× M2.5 mounting holes per ESP32
            for (dx = [3, 25], dy = [3, 52]) {
                translate([pos[0] + dx, pos[1] + dy, wall_thickness])
                cylinder(d = 2.8, h = 5, $fn = 16);
            }
        }
        
        // ---- BMS board mounting (50mm × 30mm) ----
        bms_x = 15;
        bms_y = 80;
        for (dx = [3, 44], dy = [3, 24]) {
            translate([bms_x + dx, bms_y + dy, wall_thickness])
            cylinder(d = 2.8, h = 5, $fn = 16);
        }
        
        // ---- Cable routing channels ----
        // Along all four inner walls
        // Left wall channel
        translate([wall_thickness, wall_thickness + 5, tray_height - 5])
        cube([6, tray_depth - wall_thickness*2 - 10, 4]);
        
        // Right wall channel
        translate([tray_width - wall_thickness - 6, wall_thickness + 5, tray_height - 5])
        cube([6, tray_depth - wall_thickness*2 - 10, 4]);
        
        // Front wall channel
        translate([wall_thickness + 5, wall_thickness, tray_height - 5])
        cube([tray_width - wall_thickness*2 - 10, 6, 4]);
        
        // Back wall channel
        translate([wall_thickness + 5, tray_depth - wall_thickness - 6, tray_height - 5])
        cube([tray_width - wall_thickness*2 - 10, 6, 4]);
        
        // ---- Ventilation holes (bottom) ----
        for (x = [20 : 20 : tray_width - 20]) {
            for (y = [20 : 20 : tray_depth - 20]) {
                translate([x, y, -1])
                cylinder(d = 8, h = wall_thickness + 2, $fn = 16);
            }
        }
        
        // ---- Heat-set insert holes (4× M4, for shock-mounting to top plate) ----
        insert_positions = [
            [15, 15],
            [tray_width - 15, 15],
            [15, tray_depth - 15],
            [tray_width - 15, tray_depth - 15]
        ];
        for (pos = insert_positions) {
            translate([pos[0], pos[1], 0])
            cylinder(d = heatset_insert_dia, h = wall_thickness + 1, $fn = 16);
        }
    }
    
    // ---- Cable ties / zip-tie anchors (6×, integrated into walls) ----
    for (pos = [
        [tray_width/2, 10],
        [tray_width/2, tray_depth - 10],
        [10, tray_depth/2],
        [tray_width - 10, tray_depth/2],
        [tray_width/3, 10],
        [2*tray_width/3, 10]
    ]) {
        translate([pos[0] - 3, pos[1] - 1, tray_height - 3])
        cube([6, 2, 3]);
    }
}

$fn = 64;
electronics_tray();