// ============================================================================
// SmartHome Plate™ — Top Plate (CNC Aluminum 6061-T6)
// ============================================================================
// Manufacturing: 3-axis CNC mill from 1/4" aluminum plate
// Tolerance: ±0.005" (±0.13mm)
// Finish: bead-blasted, anodized black or natural
// ============================================================================

use <../parameters.scad>

module top_plate() {
    difference() {
        // Main plate body — home plate pentagon
        linear_extrude(height = plate_thickness)
        offset(r = 3)  // 3mm fillet on all outer edges
        polygon(points = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5]);
        
        // ---- Perimeter channel (mirror of base plate) ----
        // Channels face DOWNWARD from the top plate
        // Front edge channel
        translate([0, -channel_width/2, -1])
        cube([front_edge_width, channel_width, channel_depth + 1], center=true);
        
        // Right side channel
        translate([front_edge_width/2 + channel_width/2, side_edge_width/2, channel_depth/2])
        cube([channel_width, side_edge_width, channel_depth + 1], center=false);
        
        // Left side channel
        translate([-front_edge_width/2 - channel_width/2, side_edge_width/2, channel_depth/2])
        cube([channel_width, side_edge_width, channel_depth + 1], center=false);
        
        // Right diagonal channel
        hull() {
            translate([hp_v3[0], hp_v3[1], channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
            translate([hp_v4[0], hp_v4[1], channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
        }
        
        // Left diagonal channel
        hull() {
            translate([hp_v4[0], hp_v4[1], channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
            translate([hp_v5[0], hp_v5[1], channel_depth/2])
            cube([channel_width, channel_width, channel_depth + 1], center=true);
        }
        
        // ---- Through-holes for M8 rods at each vertex ----
        for (v = [hp_v1, hp_v2, hp_v3, hp_v4, hp_v5]) {
            translate([v[0], v[1], -1])
            cylinder(d = rod_diameter + 0.5, h = plate_thickness + 2, $fn = 32);
            
            // Washer recess on top
            translate([v[0], v[1], plate_thickness - 3])
            cylinder(d = washer_diameter + 0.5, h = 3.5, $fn = 32);
        }
        
        // ---- Display cutout (front section, facing pitcher) ----
        // Position: center of front edge, 65-80% of depth from front
        display_y_pos = 40;  // mm from front edge, toward center
        translate([-display_cutout_w/2, display_y_pos - display_cutout_h/2, -1])
        cube([display_cutout_w, display_cutout_h, plate_thickness + 2]);
        
        // Display pocket (recess for display frame, 4mm deep on inside)
        translate([-display_cutout_w/2 - 3, display_y_pos - display_cutout_h/2 - 3, plate_thickness - display_pocket_d])
        cube([display_cutout_w + 6, display_cutout_h + 6, display_pocket_d + 1]);
        
        // ---- Wide-angle camera cutout ----
        cam_y_offset = -5;  // Slightly behind front edge
        cam_x_offset = -30;  // Left of center
        translate([cam_x_offset, cam_y_offset, -1])
        cylinder(d = wide_angle_cam_dia, h = plate_thickness + 2, $fn = 32);
        
        // Camera recess on inside
        translate([cam_x_offset, cam_y_offset, plate_thickness - 8])
        cylinder(d = wide_angle_cam_dia + 4, h = 9, $fn = 32);
        
        // ---- High-speed camera cutout ----
        hs_cam_x_offset = 30;  // Right of center
        translate([hs_cam_x_offset, cam_y_offset, -1])
        cylinder(d = high_speed_cam_dia, h = plate_thickness + 2, $fn = 32);
        
        translate([hs_cam_x_offset, cam_y_offset, plate_thickness - 8])
        cylinder(d = high_speed_cam_dia + 4, h = 9, $fn = 32);
        
        // ---- Radar module cutout ----
        radar_y_pos = 60;  // Behind camera cutouts
        translate([-radar_cutout_w/2, radar_y_pos - radar_cutout_h/2, -1])
        cube([radar_cutout_w, radar_cutout_h, plate_thickness + 2]);
        
        // ---- Ventilation slots (near back/apex of plate) ----
        for (i = [0 : vent_slot_count - 1]) {
            // Slots along the back section
            angle = -30 + (i * 60 / (vent_slot_count - 1));
            slot_x = sin(angle) * 50;
            slot_y = side_edge_width + cos(angle) * 30 + 100;
            
            translate([slot_x, slot_y, -1])
            rotate([0, 0, angle + 90])
            cube([vent_slot_length, vent_slot_width, plate_thickness + 2], center=false);
        }
        
        // ---- Electronics tray mounting holes (4× M4) ----
        tray_holes = [
            [-40, 70],
            [40, 70],
            [-40, 140],
            [40, 140]
        ];
        for (pos = tray_holes) {
            translate([pos[0], pos[1], -1])
            cylinder(d = m4_screw_dia + 0.3, h = plate_thickness + 2, $fn = 32);
            
            translate([pos[0], pos[1], plate_thickness - heatset_insert_depth])
            cylinder(d = heatset_insert_dia, h = heatset_insert_depth + 1, $fn = 32);
        }
        
        // ---- LED controller mounting holes (4× M3) ----
        led_holes = [
            [-80, 200],
            [80, 200],
            [-80, 350],
            [80, 350]
        ];
        for (pos = led_holes) {
            translate([pos[0], pos[1], plate_thickness - 6])
            cylinder(d = 3.3, h = 7, $fn = 16);
        }
    }
}

$fn = 64;
top_plate();