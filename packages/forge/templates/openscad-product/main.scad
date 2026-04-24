// OpenSCAD Parametric Module
// Adjust variables to customize your product

// ── Parameters ──────────────────────────────────────────────
width = 50;        // X dimension in mm
depth = 50;        // Y dimension in mm
height = 20;       // Z dimension in mm
wall = 2;          // Wall thickness in mm
corner_radius = 5; // Rounded corners radius

// ── Quality Settings ───────────────────────────────────────
$fn = 32;          // Curve resolution (32=preview, 64=export)

// ── Module ──────────────────────────────────────────────────
module parametric_box(w, d, h, t, r) {
    difference() {
        // Outer shell
        hull() {
            translate([r, r, 0])
                cylinder(h=h, r=r);
            translate([w-r, r, 0])
                cylinder(h=h, r=r);
            translate([r, d-r, 0])
                cylinder(h=h, r=r);
            translate([w-r, d-r, 0])
                cylinder(h=h, r=r);
        }
        // Inner cavity
        hull() {
            translate([r+t, r+t, t])
                cylinder(h=h-t, r=r-t);
            translate([w-r-t, r+t, t])
                cylinder(h=h-t, r=r-t);
            translate([r+t, d-r-t, t])
                cylinder(h=h-t, r=r-t);
            translate([w-r-t, d-r-t, t])
                cylinder(h=h-t, r=r-t);
        }
    }
}

// ── Render ─────────────────────────────────────────────────
parametric_box(width, depth, height, wall, corner_radius);