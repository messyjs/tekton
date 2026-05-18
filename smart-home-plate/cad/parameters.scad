// ============================================================================
// SmartHome Plate™ — Shared Parameters
// ============================================================================
// All dimensions in MILLIMETERS unless otherwise noted.
// This file is included by all part files for consistent parametric design.
// ============================================================================

// --- Home Plate Geometry (Official MLB Dimensions) ---
front_edge_width     = 431.8;   // 17 inches (431.8mm)
side_edge_width      = 215.9;   // 8.5 inches
diagonal_edge_width  = 304.8;   // 12 inches

// Home plate vertices (plan view, origin at center of front edge, Y+ toward catcher)
hp_v1 = [-front_edge_width/2, 0];           // Front-Left
hp_v2 = [ front_edge_width/2, 0];           // Front-Right
hp_v3 = [ front_edge_width/2, side_edge_width]; // Right-Rear
hp_v4 = [0, side_edge_width + side_edge_width]; // Apex (back point) = (0, 431.8)
hp_v5 = [-front_edge_width/2, side_edge_width]; // Left-Rear

// --- Device Dimensions ---
device_height        = 609.6;    // 24 inches - main body height
panel_thickness      = 9.525;    // 3/8 inch polycarbonate
plate_thickness      = 6.35;     // 1/4 inch aluminum (6061-T6)
channel_depth        = 12.0;    // Depth of panel retainer channel in top/base plates
channel_width        = panel_thickness + 1.0; // Panel slot width (with 1mm clearance)
gasket_compression   = 2.0;     // EPDM gasket compression in channel

// --- Adjustable Leg Dimensions ---
leg_outer_width      = 38.1;    // 1.5 inch square tube
leg_outer_wall       = 3.175;   // 0.125 inch wall
leg_inner_width      = 31.75;   // 1.25 inch square tube
leg_inner_wall       = 1.651;   // 0.065 inch wall
leg_extension_low    = 50.8;    // 2 inches
leg_extension_mid    = 127.0;   // 5 inches
leg_extension_high   = 203.2;  // 8 inches
foot_diameter        = 50.8;    // 2 inches
foot_height          = 19.05;  // 3/4 inch
detent_hole_dia      = 5.0;    // Spring pin diameter

// --- Through-Rod Dimensions ---
rod_diameter         = 8.0;     // M8  
rod_length           = device_height + plate_thickness * 2 + 20; // Total with nut clearance
rod_head_diameter    = 13.0;    // M8 hex head
rod_head_height      = 5.5;     // M8 hex head height
 washer_diameter     = 16.0;    // M8 flat washer
nut_height          = 6.5;      // M8 nut height

// --- Camera & Sensor Cutouts ---
wide_angle_cam_dia   = 14.0;   // RPi Camera v3 hole
high_speed_cam_dia   = 12.0;   // OV9281 hole
radar_cutout_w       = 50.0;   // IWR6843 width
radar_cutout_h       = 35.0;   // IWR6843 height
display_cutout_w     = 120.0;  // ~5" display width
display_cutout_h     = 78.0;   // Display height
display_pocket_d     = 4.0;    // Recess depth for display frame

// --- Piezo Sensor Layout (4 per panel) ---
piezo_from_corner    = 25.0;    // Distance from panel corner to piezo center
piezo_width          = 30.0;    // LDT0-028K width
piezo_height         = 60.0;    // LDT0-028K height (film with leads)

// --- LED Matrix Layout ---
led_density          = 30;      // LEDs per meter (WS2812B 30/m)
led_strip_width      = 10.0;   // 10mm wide strip
led_rows_min         = 152.4;  // 6 inches from top (where strike zone starts)
led_rows_max         = 609.6;  // Bottom of panel (entire panel can be lit)
zone_border_height   = 25.4;   // 1-inch LED row for zone boundary

// --- Fastener Dimensions ---
m4_screw_dia        = 4.0;
m4_nut_height       = 3.2;
m4_washer_dia       = 8.5;
m6_screw_dia        = 6.0;
heatset_insert_dia   = 6.5;    // For M4 brass heat-set inserts
heatset_insert_depth = 8.0;    // Insert depth in aluminum

// --- Ventilation ---
vent_slot_width      = 3.0;
vent_slot_length     = 20.0;
vent_slot_count      = 8;      // Slots on top plate

// --- Tolerances ---
fit_loose            = 0.5;     // Loose fit (panels in channels)
fit_snug             = 0.15;    // Snug fit (gaskets, seals)
cnc_tolerance        = 0.13;    // CNC milling tolerance

// --- Safety Factors ---
impact_safety_factor = 3.0;     // Safety factor for impact design
fatigue_cycles       = 500000;  // Target fatigue life in impact cycles