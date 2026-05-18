#!/usr/bin/env python3
"""
SmartHome Plate™ — Comprehensive Build Guide PDF Generator
Includes all design docs, engineering analysis, BOM, assembly, and new features.
"""

from fpdf import FPDF
import os

class SmartHomePDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)
        
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(100, 100, 120)
            self.cell(0, 5, f'SmartHome Plate - Build Guide v1.0', align='L')
            self.cell(0, 5, f'Page {self.page_no()}', align='R', new_x='LMARGIN', new_y='NEXT')
            self.set_draw_color(50, 50, 80)
            self.line(10, 12, 200, 12)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 7)
        self.set_text_color(120, 120, 140)
        self.cell(0, 5, 'Confidential - For authorized builders only', align='C')
    
    def chapter_title(self, title, num=None):
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(0, 100, 200)
        prefix = f'{num}. ' if num else ''
        self.cell(0, 15, f'{prefix}{title}', new_x='LMARGIN', new_y='NEXT')
        self.set_draw_color(0, 100, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(8)
    
    def section_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(0, 70, 150)
        self.cell(0, 10, title, new_x='LMARGIN', new_y='NEXT')
        self.ln(3)
    
    def subsection(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(30, 30, 60)
        self.cell(0, 8, title, new_x='LMARGIN', new_y='NEXT')
        self.ln(1)
    
    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(30, 30, 30)
        self.set_x(self.l_margin)
        self.multi_cell(self.w - self.l_margin - self.r_margin, 5, text)
        self.ln(2)
    
    def bullet(self, text, indent=10):
        self.set_font('Helvetica', '', 9)
        self.set_text_color(30, 30, 30)
        self.set_x(self.l_margin)
        self.multi_cell(self.w - self.l_margin - self.r_margin, 5, '  - ' + text)
    
    def table_row(self, cells, widths, bold=False, fill=False):
        self.set_font('Helvetica', 'B' if bold else '', 8)
        if fill:
            self.set_fill_color(220, 230, 245)
        for i, (cell, width) in enumerate(zip(cells, widths)):
            self.cell(width, 6, str(cell), border=1, fill=fill)
        self.ln()
    
    def warning_box(self, text):
        self.set_fill_color(255, 240, 220)
        self.set_draw_color(255, 150, 0)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(180, 80, 0)
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y, 190, 15, style='DF')
        self.set_xy(x + 3, y + 2)
        self.multi_cell(184, 5, f'WARNING: {text}')
        self.ln(5)
    
    def info_box(self, text):
        self.set_fill_color(220, 240, 255)
        self.set_draw_color(0, 100, 200)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(0, 50, 100)
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y, 190, 12, style='DF')
        self.set_xy(x + 3, y + 2)
        self.multi_cell(184, 4, text)
        self.ln(5)


def generate_pdf():
    pdf = SmartHomePDF()
    pdf.set_margins(10, 15, 10)
    
    # =========================================================================
    # COVER PAGE
    # =========================================================================
    pdf.add_page()
    pdf.ln(30)
    pdf.set_font('Helvetica', 'B', 36)
    pdf.set_text_color(0, 100, 200)
    pdf.cell(0, 20, 'SmartHome Plate', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 16)
    pdf.set_text_color(60, 60, 80)
    pdf.cell(0, 10, 'Smart Strike Zone Trainer & Pitching Analytics', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(5)
    pdf.set_draw_color(0, 100, 200)
    pdf.line(30, pdf.get_y(), 180, pdf.get_y())
    pdf.ln(8)
    pdf.set_font('Helvetica', '', 12)
    pdf.cell(0, 8, 'Complete Build Guide', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 8, 'Design Specification & Engineering Analysis', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 8, 'Bill of Materials & Assembly Instructions', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 8, 'Firmware Architecture & App Wireframes', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(15)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(0, 10, 'WITHSTANDS 105+ MPH BASEBALL IMPACTS', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(5)
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(60, 60, 80)
    pdf.cell(0, 7, 'Dual Mode: Pitching Training + Hitting Analytics', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 7, 'Auto-Adjusting Strike Zone | Spin Rate | Pitch Movement | Exit Velocity', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(15)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 7, 'Version 1.0 | May 2025', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 7, 'For Prototype Build', align='C', new_x='LMARGIN', new_y='NEXT')

    # Try to add renders
    for img_file in ['renders/product_render.png', 'renders/front_detail.png', 'renders/exploded_view.png']:
        if os.path.exists(img_file):
            pdf.image(img_file, x=30, w=150)
            pdf.ln(5)
            break

    # =========================================================================
    # TABLE OF CONTENTS
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Table of Contents')
    toc = [
        ('1', 'Product Overview & Features', '3'),
        ('2', 'Design Specification', '5'),
        ('3', 'Engineering Analysis', '8'),
        ('4', 'Critical Design Decisions', '12'),
        ('5', 'Pitching Analytics: Spin Rate & Movement', '14'),
        ('6', 'Hitting Analytics: Exit Velocity & Launch Angle', '16'),
        ('7', 'Auto-Adjusting Strike Zone', '18'),
        ('8', 'Game Modes', '20'),
        ('9', 'Bill of Materials & Cost Analysis', '22'),
        ('10', 'CNC Manufacturing Files', '24'),
        ('11', 'Assembly Guide (16 Steps)', '26'),
        ('12', 'Firmware Architecture', '30'),
        ('13', 'Companion App Architecture', '33'),
        ('14', 'Safety Warnings & Maintenance', '35'),
    ]
    for num, title, page in toc:
        pdf.set_font('Helvetica', 'B' if num.isdigit() else '', 10)
        pdf.set_text_color(30, 30, 60)
        pdf.cell(10, 7, num)
        pdf.cell(140, 7, title)
        pdf.cell(0, 7, page, align='R', new_x='LMARGIN', new_y='NEXT')

    # =========================================================================
    # CHAPTER 1: PRODUCT OVERVIEW
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Product Overview & Features', 1)
    
    pdf.body_text('SmartHome Plate is a ruggedized, impact-rated smart device shaped like official home plate that sits on top of a standard baseball home plate. It provides real-time pitch tracking, instant HD video replay, radar speed measurement, spin rate analysis, pitch movement quantification, and arcade-style training games - all in a housing that survives repeated 105+ mph baseball impacts.')
    
    pdf.section_title('Primary Functions')
    functions = [
        'Strike Zone Trainer - Detects ball/strike contact on any of five vertical faces',
        'HD Recording - Wide-angle (4K/30fps) + high-speed (120fps global shutter) cameras',
        'Radar Speed - 60GHz FMCW Doppler measures pitch velocity (40-110 mph)',
        'Spin Rate Detection - Micro-Doppler signatures from radar analyze spin (0-3500 RPM)',
        'Pitch Movement Analysis - Tracks curveball break, slider sweep, knuckleball dance',
        'Pitch Type Classification - ML auto-classifies fastball, curveball, slider, changeup, etc.',
        'Exit Velocity Tracking - Measures ball speed off the bat (hitting mode)',
        'Launch Angle Detection - Calculates ball departure angle after bat contact',
        'Batter Swing Analysis - Camera tracks bat path, swing plane, late/early detection',
        'Auto-Adjusting Strike Zone - Camera ML detects batter height and sets zone',
        'Live Display - 5" daylight-readable screen shows speed, count, spin, movement',
        'LED Feedback - 4,200+ NeoPixels illuminate precisely where ball contacts the panel',
        'Arcade Games - Simon Says, Pop-a-Shot, competitive pitch count games',
        'Companion App - iOS/Android for session review, stats, leaderboards',
    ]
    for f in functions:
        pdf.bullet(f)
    
    pdf.ln(5)
    pdf.section_title('Target Users')
    users = [
        'Competitive pitchers (Little League through Pro)',
        'Pitching coaches and academies',
        'Hitters and batting coaches (exit velocity + launch angle)',
        'Training facilities and batting cages',
        'Backyard/family use',
        'Scouting and player evaluation',
    ]
    for u in users:
        pdf.bullet(u)
    
    pdf.ln(5)
    pdf.section_title('Key Specifications')
    specs = [
        ['Footprint', 'Official home plate (17" front x 17" depth)'],
        ['Body Height', '24" (adjustable to 26", 29", 32" with legs)'],
        ['Weight', '~20 lbs (without battery), ~23 lbs (with)'],
        ['Impact Rating', 'Withstands 105+ mph repeated baseball impacts'],
        ['Panels', '3/8" polycarbonate (Lexan), UV-hardcoated'],
        ['Frame', '1/4" 6061-T6 aluminum, bead-blasted, anodized'],
        ['Display', '5" IPS, 800x480, 1000 nits daylight-readable'],
        ['Cameras', '4K wide-angle + 120fps global shutter'],
        ['Radar', '60GHz FMCW (speed, spin rate, movement)'],
        ['LEDs', '~4,200 WS2812B NeoPixels, individually addressable'],
        ['Impact Detection', '20x piezo film sensors, acoustic triangulation'],
        ['Battery', '6x 21700 Li-Ion (111Wh), 4-6 hour runtime'],
        ['Wireless', 'WiFi 6 + Bluetooth 5.2'],
        ['Compute', 'Jetson Orin Nano (Pro) or RPi CM4 (Standard)'],
        ['Weatherproof', 'IP54 (rain resistant)'],
    ]
    
    w = [35, 155]
    pdf.table_row(['Parameter', 'Value'], w, bold=True, fill=True)
    for row in specs:
        pdf.table_row(row, w)

    # =========================================================================
    # CHAPTER 2: DESIGN SPECIFICATION
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Design Specification', 2)
    
    pdf.section_title('Home Plate Geometry')
    pdf.body_text('The device matches official MLB home plate dimensions - a 17-inch wide pentagon with two 8.5-inch sides, two 12-inch diagonal sides, and a rear point facing the catcher.')
    
    pdf.subsection('Vertices (mm, origin at center of front edge)')
    verts = [
        ['V1 (Front-Left)', '(-215.9, 0)'],
        ['V2 (Front-Right)', '(215.9, 0)'],
        ['V3 (Right-Rear)', '(215.9, 215.9)'],
        ['V4 (Apex/Back)', '(0, 431.8)'],
        ['V5 (Left-Rear)', '(-215.9, 215.9)'],
    ]
    pdf.table_row(['Vertex', 'Coordinates (X, Y)'], [40, 150], bold=True, fill=True)
    for row in verts:
        pdf.table_row(row, [40, 150])
    
    pdf.ln(5)
    pdf.section_title('Construction - Sandwich Frame')
    pdf.body_text('The device uses a bolt-together sandwich frame: two CNC-milled aluminum plates (top & bottom) with polycarbonate panels sliding into perimeter channels, tied together by 5 M8 stainless steel through-rods at each vertex.')
    
    pdf.subsection('Panel Assignments')
    panels = [
        ['A (Front)', '431.8 mm (17")', 'Faces pitcher, has display, cameras'],
        ['B (Right)', '215.9 mm (8.5")', 'Strike zone panel'],
        ['C (Right-Diag)', '304.8 mm (12")', 'Strike zone panel'],
        ['D (Left-Diag)', '304.8 mm (12")', 'Strike zone panel'],
        ['E (Left)', '215.9 mm (8.5")', 'Strike zone panel'],
    ]
    pdf.table_row(['Panel', 'Width', 'Description'], [25, 40, 125], bold=True, fill=True)
    for row in panels:
        pdf.table_row(row, [25, 40, 125])
    
    pdf.ln(5)
    pdf.section_title('Adjustable Leg System')
    pdf.body_text('Five telescoping legs with quick-detent pins allow height adjustment without tools. Each leg has a linear potentiometer that reports its height to the microcontroller, enabling automatic strike zone calibration.')
    
    legs = [
        ['Low (Little League)', '50.8 mm (2")', '24"+2" = 26"', 'Ages 8-12, under 5\''],
        ['Medium (High School)', '127 mm (5")', '24"+5" = 29"', 'Ages 13-18, 5\'-6\''],
        ['High (College/Pro)', '203 mm (8")', '24"+8" = 32"', '6\', extended zone'],
    ]
    pdf.table_row(['Setting', 'Extension', 'Total Height', 'Target User'], [40, 35, 35, 80], bold=True, fill=True)
    for row in legs:
        pdf.table_row(row, [40, 35, 35, 80])

    # =========================================================================
    # CHAPTER 3: ENGINEERING ANALYSIS
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Engineering Analysis', 3)
    
    pdf.section_title('Impact Force Analysis')
    pdf.body_text('A regulation baseball at 105 mph delivers approximately 160 Joules of kinetic energy. The peak impact force depends on surface compliance:')
    
    forces = [
        ['Rigid concrete', '0.5 ms', '12,920 N (2,904 lbf)'],
        ['Wooden backstop', '1.0 ms', '6,460 N (1,452 lbf)'],
        ['3/8" Polycarbonate', '2.5-3.0 ms', '2,153-2,584 N (484-581 lbf)'],
        ['1/2" Polycarbonate', '3.0-4.0 ms', '1,705-2,154 N'],
    ]
    pdf.table_row(['Surface', 'Contact Time', 'Peak Force'], [55, 40, 95], bold=True, fill=True)
    for row in forces:
        pdf.table_row(row, [55, 40, 95])
    
    pdf.ln(3)
    pdf.subsection('Polycarbonate vs. Acrylic (Plexiglass)')
    pdf.warning_box('NEVER use acrylic/plexiglass. A 100mph baseball WILL shatter acrylic into dangerous shards. Polycarbonate (Lexan) is 37x more impact resistant and flexes to absorb the hit.')
    
    compare = [
        ['Impact Strength (Izod)', '0.4 ft-lb/in', '15+ ft-lb/in', '37x'],
        ['Elongation at Break', '4%', '110%', '27x'],
        ['Behavior at 100mph', 'SHATTERS', 'Flexes, recovers', 'CRITICAL'],
        ['Cost per sq ft', '~$5', '~$8', '1.6x'],
    ]
    pdf.table_row(['Property', 'Acrylic', 'Polycarbonate', 'Ratio'], [45, 45, 45, 45], bold=True, fill=True)
    for row in compare:
        pdf.table_row(row, [45, 45, 45, 45])
    
    pdf.ln(5)
    pdf.section_title('Structural Integrity')
    pdf.body_text('3/8" polycarbonate panels at the widest span (17") experience a maximum bending stress of ~4,073 psi under a 105 mph impact, well below the 10,000 psi yield strength. Safety factor: 2.49x. The aluminum frame (6061-T6, 276 MPa yield) has a safety factor >10x. Panel retention in EPDM-gasketed channels is ensured by >25,000 N of through-rod clamping force vs. <2,600 N impact ejection force.')
    
    pdf.body_text('Fatigue life: Polycarbonate endurance limit is ~2,000 psi. Calculated cyclic stress is ~1,800 psi per impact. Estimated panel lifespan: 500,000+ impacts (14+ years at 100/day).')
    
    pdf.ln(3)
    pdf.section_title('Thermal Analysis')
    pdf.body_text('Under typical operation (LEDs at 30%, compute active), total heat dissipation is ~95W. With natural convection through top-plate ventilation slots and the aluminum top plate acting as a heatsink, the enclosure temperature rises only 13 deg C above ambient. Maximum safe ambient temperature: 45 deg C (113 deg F). Brief LED bursts (strike/ball effects) add 252W peak but last only 200ms, causing negligible heating.')
    
    pdf.ln(3)
    pdf.section_title('Sensor Accuracy')
    pdf.subsection('Impact Location (Acoustic Triangulation)')
    pdf.body_text('Each panel has 4 piezo film sensors at its corners. Sound travels through polycarbonate at 2,200 m/s. The ESP32-S3 timestamps detections with +/-2 microsecond resolution. With 4-sensor trilateration, impact location accuracy is +/-1 cm. This enables the "illuminate precisely where the ball touches" feature.')
    
    pdf.subsection('Radar (IWR6843 60GHz FMCW)')
    radar_specs = [
        ['Speed Accuracy', '+/- 1 mph at 60 feet'],
        ['Range Accuracy', '+/- 5 cm'],
        ['Update Rate', '50 Hz (20ms per reading)'],
        ['Spin Rate Detection', 'Yes, via micro-Doppler analysis'],
        ['Pitch Movement', 'Tracks lateral/vertical deviation from expected path'],
        ['Effective Range', '0.2m to 20m (covers 60\'6" pitcher distance)'],
    ]
    pdf.table_row(['Parameter', 'Specification'], [50, 140], bold=True, fill=True)
    for row in radar_specs:
        pdf.table_row(row, [50, 140])

    # =========================================================================
    # CHAPTER 5: PITCHING ANALYTICS
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Pitching Analytics: Spin Rate & Movement', 5)
    
    pdf.body_text('The SmartHome Plate provides professional-grade pitch analytics that were previously only available in major league stadiums with $100K+ tracking systems. Using the 60GHz FMCW radar and the dual-camera system, the device measures:')
    
    pdf.section_title('Spin Rate Detection')
    pdf.body_text('Spin rate is measured using micro-Doppler analysis from the FMCW radar. A spinning baseball creates sidebands in the radar return signal. The frequency offset of these sidebands is directly proportional to the spin rate:')
    
    pdf.set_font('Courier', '', 9)
    pdf.multi_cell(0, 4, '  f_spin = (2 * omega * r * cos(theta)) / lambda\n  where omega = angular velocity, r = ball radius (~37mm), theta = spin axis angle')
    pdf.ln(3)
    pdf.set_font('Helvetica', '', 10)
    
    spin_data = [
        ['4-Seam Fastball', '1500-2500 RPM', 'Backspin, rises (less drop)'],
        ['2-Seam Fastball', '1200-1800 RPM', 'Backspin + arm-side run'],
        ['Curveball', '2000-3000 RPM', 'Topspin, 12-6 drop'],
        ['Slider', '1800-2600 RPM', 'Gyro spin, lateral sweep'],
        ['Changeup', '800-1500 RPM', 'Reduced spin mimics slower pitch'],
        ['Knuckleball', '0-300 RPM', 'Near-zero spin, unpredictable dance'],
        ['Cutter', '2000-2500 RPM', 'Backspin + glove-side break'],
        ['Splitter', '600-1200 RPM', 'Reduced spin, tumbling drop'],
    ]
    pdf.table_row(['Pitch Type', 'Typical Spin', 'Movement Profile'], [40, 45, 105], bold=True, fill=True)
    for row in spin_data:
        pdf.table_row(row, [40, 45, 105])
    
    pdf.ln(5)
    pdf.section_title('Pitch Movement Analysis')
    pdf.body_text('Movement is defined as the deviation from an expected straight-line path from the pitcher to the plate. The radar tracks the ball\'s position at regular intervals during its flight, and the camera system confirms the trajectory:')
    
    pdf.subsection('How Movement is Calculated')
    pdf.bullet('Radar tracks the ball\'s 3D position at 50 Hz during flight (every ~1.3 feet)')
    pdf.bullet('Expected path: straight line from release point to center of zone')
    pdf.bullet('Horizontal movement (induced break): deviation perpendicular to the straight path')
    pdf.bullet('Vertical movement (drop/rise): deviation from gravitational drop line')
    pdf.bullet('Total movement: vector magnitude of horizontal + vertical deviation')
    
    pdf.ln(3)
    move_data = [
        ['4-Seam Fastball', '5-12"', 'Rise effect (less than expected drop)'],
        ['Curveball', '8-15"', '12-6 or 1-7 drop (depending on grip)'],
        ['Slider', '4-10"', 'Lateral sweep, late break'],
        ['Changeup', '2-6"', 'Arm-side fade, tumbling action'],
        ['Knuckleball', '3-8"', 'Unpredictable, changes direction multiple times'],
    ]
    pdf.table_row(['Pitch Type', 'Typical Movement', 'Description'], [40, 40, 110], bold=True, fill=True)
    for row in move_data:
        pdf.table_row(row, [40, 40, 110])
    
    pdf.ln(3)
    pdf.info_box('Knuckleball tracking: The radar samples at 50Hz and can detect the characteristic micro-movements of a knuckleball. The 3D trajectory plot shows the ball\'s sinusoidal or chaotic path, with each directional change counted and displayed. The "wobble index" quantifies overall unpredictability on a 0-10 scale.')

    # =========================================================================
    # CHAPTER 6: HITTING ANALYTICS
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Hitting Analytics: Exit Velocity & Launch Angle', 6)
    
    pdf.body_text('The SmartHome Plate is dual-purpose. In hitting mode, the device is placed in the batter\'s box to measure ball flight characteristics and bat performance:')
    
    pdf.section_title('Exit Velocity')
    pdf.body_text('Exit velocity (EV) is the speed of the ball immediately after contact with the bat. The 60GHz FMCW radar tracks the ball\'s approach speed and, upon detecting a direction reversal (ball bouncing off), its departure speed:')
    
    pdf.bullet('Approach speed: Pitch velocity (40-110 mph range)')
    pdf.bullet('Exit velocity: Ball speed after bat contact (up to 120+ mph)')
    pdf.bottle_err = None  # clean up
    pdf.bullet('Ratio calculation: Exit vel / Approach vel = efficiency metric')
    pdf.bullet('Display updates in real-time (< 200ms) on the front display and app')
    pdf.bullet('Historical tracking: Session averages, personal bests, trend analysis')
    
    pdf.ln(3)
    pdf.section_title('Launch Angle')
    pdf.body_text('Launch angle is the vertical angle at which the ball leaves the bat, measured in degrees from horizontal. This is critical for understanding batted-ball outcomes:')
    
    angle_data = [
        ['Ground ball', '< 10 degrees', 'High outs, low AVG'],
        ['Line drive', '10-25 degrees', 'Highest AVG, most productive'],
        ['Fly ball', '25-50 degrees', 'Home run range (25-35 optimal)'],
        ['Pop up', '> 50 degrees', 'Near-automatic outs'],
    ]
    pdf.table_row(['Type', 'Angle Range', 'Outcome'], [35, 45, 110], bold=True, fill=True)
    for row in angle_data:
        pdf.table_row(row, [35, 45, 110])
    
    pdf.body_text('Launch angle is calculated from the radar\'s measured departure vector and camera trajectory analysis. The system captures the first 30 feet of ball flight post-contact to calculate the precise angle.')
    
    pdf.ln(3)
    pdf.section_title('Batter Swing Analysis')
    pdf.body_text('The wide-angle camera captures the batter\'s swing from the side view:')
    
    pdf.bullet('Swing plane angle: Measured from shoulder-to-hand path at contact point')
    pdf.bullet('Bat speed: Estimated from video analysis of swing duration')
    pdf.bullet('Late swing detection: If bat angle at contact is > 5 degrees behind the ball, display "LATE" alert')
    pdf.bullet('Early swing detection: If bat angle is > 5 degrees ahead, display "EARLY" alert')
    pdf.bullet('Contact point quality: Combines exit velocity, launch angle, and contact location')
    
    pdf.ln(3)
    pdf.section_title('Dual Mode Summary')
    pdf.info_box('The device seamlessly switches between PITCHING MODE and HITTING MODE based on its placement. When placed on home plate, it enters pitching mode (strike zone, pitch analytics). When placed in the batter\'s box, it enters hitting mode (exit velocity, launch angle, swing analysis).')

    # =========================================================================
    # CHAPTER 7: AUTO-ADJUSTING STRIKE ZONE
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Auto-Adjusting Strike Zone', 7)
    
    pdf.body_text('A fixed-height device cannot serve a 10-year-old Little Leaguer and a 6\'3" college pitcher. The SmartHome Plate solves this with a three-tier adaptation system:')
    
    pdf.section_title('1. Physical: Adjustable Telescoping Legs')
    pdf.body_text('Five quick-detent legs provide three height positions that set the physical device to approximately match the batter\'s zone:')
    pdf.bullet('LOW (2" extension): 26" total height - Little League, ages 8-12')
    pdf.bullet('MEDIUM (5" extension): 29" total height - High School, ages 13-18')
    pdf.bullet('HIGH (8" extension): 32" total height - College/Pro, 6\' and above')
    pdf.body_text('Each leg includes a linear potentiometer that reports its extension to the microcontroller.')
    
    pdf.section_title('2. Software: LED-Illuminated Zone Boundaries')
    pdf.body_text('Regardless of the physical height, the LED matrix can illuminate only the rows that correspond to the current batter\'s strike zone. The panel has ~4,200 NeoPixels in a grid; each "row" of LEDs corresponds to a 1-inch vertical band. The active zone illuminates with a bright blue border:')
    pdf.bullet('Zone bottom (knees): Blue line + slight glow')
    pdf.bullet('Zone top (mid-torso): Blue line + slight glow')
    pdf.bullet('Between: Subtle ambient glow marking the valid zone')
    pdf.bullet('Outside zone: Panels dim but still detect impacts for ball/strike calls')
    
    pdf.section_title('3. Automatic: Camera-Based Batter Detection')
    pdf.body_text('The wide-angle camera uses ML pose estimation (MoveNet Thunder running on the Jetson) to automatically detect the batter and calculate their strike zone:')
    
    pdf.subsection('Detection Process')
    pdf.bullet('1. User presses "ZONE SET" button or triggers via app')
    pdf.bullet('2. Camera captures the batter standing next to home plate')
    pdf.bullet('3. MoveNet Thunder detects 17 body keypoints (knees, hips, shoulders)')
    pdf.bullet('4. Strike zone bottom = midpoint of left & right knee heights')
    pdf.bullet('5. Strike zone top = midpoint between shoulders and hips')
    pdf.bullet('6. System maps zone to LED row numbers and illuminates boundaries')
    pdf.bullet('7. User confirms zone via app or green button press')
    pdf.bullet('8. Zone locks in for the current session or until re-detection')
    
    pdf.info_box('The auto-detect system works in ~2 seconds and is accurate to within 1 inch. If no batter is detected (e.g., solo pitcher practice), the system falls back to the physical leg-position setting.')

    # =========================================================================
    # CHAPTER 8: GAME MODES
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Game Modes', 8)
    
    modes = [
        ('Practice', 'Free pitch. All stats displayed. Adjustable targets. Session recording.', 'Session stats, spin/movement per pitch'),
        ('Simon Says / Pop-a-Shot', 'One zone of one panel lights up. Pitcher must hit it within 3 seconds. Targets get smaller and faster as score increases. 5-minute rounds with 3-minute double-points bonus.', 'Points per hit, national leaderboard by league'),
        ('Game Mode', '1-20 innings, 1-10 pitchers/teams. Full ball/strike calling. Simulates a real game.', 'Fewest balls = winning team'),
        ('Batter\'s Box', 'Device in batter\'s box. Calls balls/strikes on real pitches during batting practice.', 'Pitch accuracy stats for the pitcher'),
        ('Hitting Mode', 'Device in batter\'s box. Measures exit velocity, launch angle, contact quality.', 'Exit velocity averages, launch angle distribution, swing analysis'),
    ]
    
    pdf.table_row(['Mode', 'Description', 'Scoring'], [30, 100, 60], bold=True, fill=True)
    for row in modes:
        pdf.table_row(row, [30, 100, 60])

    pdf.ln(5)
    pdf.section_title('Anti-Cheat Detection')
    pdf.body_text('For competitive game modes (Simon Says, Pop-a-Shot), the system validates every target hit:')
    pdf.bullet('Impact must register on the ILLUMINATED panel, not a different one')
    pdf.bullet('Impact force must exceed minimum threshold (equivalent to >20 mph pitch)')
    pdf.bullet('Radar must confirm an approaching object exceeding 30 mph (prevents tapping the device)')
    pdf.bullet('Impact timestamp must be within 3 seconds of target appearing')
    pdf.bullet('Repeated violations trigger a "suspected interference" warning and 30-second cooldown')
    
    pdf.ln(3)
    pdf.section_title('League Divisions (Pop-a-Shot)')
    leagues = [
        ['Little League', 'Target = 50% of panel width', 'No spin requirement', 'Top 100 nationally'],
        ['High School', 'Target = 35% of panel width', '30+ mph required', 'Top 100 nationally'],
        ['College', 'Target = 25% of panel width', '50+ mph required', 'Top 100 nationally'],
        ['Pro', 'Target = 15% of panel width', '70+ mph required', 'Top 100 nationally'],
    ]
    pdf.table_row(['League', 'Target Size', 'Speed Requirement', 'Leaderboard'], [30, 50, 55, 55], bold=True, fill=True)
    for row in leagues:
        pdf.table_row(row, [30, 50, 55, 55])

    # =========================================================================
    # CHAPTER 9: BOM & COST
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Bill of Materials & Cost Analysis', 9)
    
    pdf.section_title('Material Cost Breakdown')
    bom = [
        ('Polycarbonate panels (5x)', '$45'),
        ('Aluminum plates (top+base, CNC)', '$85'),
        ('Aluminum extrusions (legs+rods)', '$30'),
        ('Hardware (fasteners, gaskets, feet)', '$25'),
        ('Jetson Orin Nano (Pro model)', '$250'),
        ('ESP32-S3 (5x)', '$25'),
        ('Wide-angle camera', '$35'),
        ('High-speed camera (OV9281)', '$25'),
        ('Radar module (IWR6843ISK)', '$55'),
        ('5" IPS display', '$40'),
        ('WS2812B LEDs (~4,200)', '$60'),
        ('Piezo sensors (20x)', '$15'),
        ('Battery pack (6x 21700)', '$50'),
        ('3D printed parts (PETG)', '$35'),
        ('Misc (wiring, PCBs, connectors)', '$40'),
    ]
    
    pdf.table_row(['Component', 'Cost'], [130, 60], bold=True, fill=True)
    for row in bom:
        pdf.table_row(row, [130, 60])
    
    pdf.ln(3)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(0, 100, 200)
    pdf.cell(130, 7, 'TOTAL MATERIALS (Pro model)')
    pdf.cell(60, 7, '$815', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(130, 7, 'Assembly labor (2 hours)')
    pdf.cell(60, 7, '$40', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(130, 7, 'QC & Testing (1 hour)')
    pdf.cell(60, 7, '$20', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(130, 10, 'TOTAL COGS (Pro)')
    pdf.cell(60, 10, '$875', new_x='LMARGIN', new_y='NEXT')
    pdf.set_text_color(30, 30, 30)
    
    pdf.ln(5)
    pdf.section_title('Pricing Recommendation')
    pricing = [
        ['Standard (RPi CM4)', '$750', '$899', '1.2x', 'Budget-minded users, Little League'],
        ['Pro (Jetson Orin)', '$875', '$1,299', '1.48x', 'Competitive pitchers, hitting training'],
        ['Pro+ (Motorized legs)', '$1,050', '$1,499', '1.43x', 'Pro facilities, automated zone detection'],
    ]
    pdf.table_row(['Configuration', 'COGS', 'MSRP', 'Margin', 'Target Market'], [35, 25, 25, 20, 85], bold=True, fill=True)
    for row in pricing:
        pdf.table_row(row, [35, 25, 25, 20, 85])
    
    pdf.ln(3)
    pdf.body_text('At $1,299 MSRP for the Pro model, the device offers significant value compared to dedicated radar guns ($300-600), pitching trainers ($500-2,000), and tracking systems that cost $5,000+. The SmartHome Plate combines ALL of these functions in one device.')

    # =========================================================================
    # CHAPTER 10-11: CNC FILES + ASSEMBLY
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('CNC Manufacturing Files', 10)
    
    pdf.body_text('Seven CNC-ready DXF files are included in this package, located in the cnc/ directory. Each file contains manufacturing layers:')
    
    dxf_files = [
        ['base_plate.dxf', 'Base plate', '6061-T6 Aluminum, 1/4"', '3-axis CNC mill'],
        ['top_plate.dxf', 'Top plate', '6061-T6 Aluminum, 1/4"', '3-axis CNC mill'],
        ['front_panel.dxf', 'Front panel (17")', 'Polycarbonate, 3/8"', 'CNC router'],
        ['side_panel_left.dxf', 'Left side (8.5")', 'Polycarbonate, 3/8"', 'CNC router'],
        ['side_panel_right.dxf', 'Right side (8.5")', 'Polycarbonate, 3/8"', 'CNC router'],
        ['rear_panel_left.dxf', 'Left diagonal (12")', 'Polycarbonate, 3/8"', 'CNC router'],
        ['rear_panel_right.dxf', 'Right diagonal (12")', 'Polycarbonate, 3/8"', 'CNC router'],
    ]
    pdf.table_row(['File', 'Part', 'Material', 'Process'], [45, 40, 60, 45], bold=True, fill=True)
    for row in dxf_files:
        pdf.table_row(row, [45, 40, 60, 45])
    
    pdf.ln(3)
    pdf.subsection('DXF Layer Guide')
    layers = [
        ['CUT (Red)', 'Cut profiles and through-holes', 'Send to machine'],
        ['REFS (Green)', 'Reference marks, sensor positions', 'Assembly aids only'],
        ['CENTER (Blue)', 'Hole center marks', 'Drill start points'],
        ['DIMS (Yellow)', 'Dimensions and notes', 'Reference only'],
        ['ENGRAVE (White)', 'Engraved text/lines', 'Optional decorative'],
    ]
    pdf.table_row(['Layer', 'Content', 'Use'], [35, 100, 55], bold=True, fill=True)
    for row in layers:
        pdf.table_row(row, [35, 100, 55])
    
    pdf.ln(3)
    pdf.section_title('3D-Printed Parts')
    pdf.body_text('Nine 3D-printed parts in PETG are required. OpenSCAD source files are in cad/parts/. Export to STL using OpenSCAD (File > Export > STL):')
    
    prints = [
        ['Electronics tray', 'PETG, 30% infill', '1', '8 hours'],
        ['Camera housing (wide)', 'PETG, 40% infill', '1', '2 hours'],
        ['Camera housing (high-speed)', 'PETG, 40% infill', '1', '2 hours'],
        ['Display mount frame', 'PETG, 30% infill', '1', '4 hours'],
        ['LED panel frames (5x)', 'PETG, 20% infill', '5', '6 hours each'],
        ['Battery sled', 'PETG, 40% infill', '1', '3 hours'],
        ['Corner cable guides', 'PETG, 100% infill', '5', '1 hour each'],
        ['Radar module mount', 'PETG, 40% infill', '1', '1 hour'],
        ['BMS board mount', 'PETG, 40% infill', '1', '1 hour'],
    ]
    pdf.table_row(['Part', 'Settings', 'Qty', 'Time'], [55, 45, 15, 75], bold=True, fill=True)
    for row in prints:
        pdf.table_row(row, [55, 45, 15, 75])
    
    # ASSEMBLY
    pdf.add_page()
    pdf.chapter_title('Assembly Guide (16 Steps)', 11)
    
    steps = [
        ('CNC Mill Aluminum Plates', 'Mill top and base plates from 1/4" 6061-T6 aluminum per DXF drawings. Deburr all edges, break corners. Anodize optional.'),
        ('CNC Route Polycarbonate Panels', 'Route all 5 panels from 3/8" UV-hardcoated Lexan per DXF drawings. Keep protective film on outer surface.'),
        ('Install Heat-Set Brass Inserts', 'M4 (8x) in top plate, M3 (16x) in 3D printed parts. Use soldering iron at 230C, press and hold 5s.'),
        ('Assemble Adjustable Feet', 'Slide inner tube into outer tube. Align detent holes. Insert spring pins. Screw rubber feet onto M6 studs.'),
        ('Install EPDM Gaskets', 'Cut gasket lengths for all 5 channel segments. Press into base and top plate channels. Apply silicone at joints. Cure 24h.'),
        ('Install Polycarbonate Panels', 'Place base plate flat. Slide bottom edge of each panel into base channel. Work front-to-back (A, B, C, D, E).'),
        ('Install Top Plate', 'Carefully lower top plate over panel top edges. Align all 5 channels simultaneously. Press down firmly.'),
        ('Install Through-Rods', 'Insert 5x M8 threaded rods through all vertices. Add washers and nuts top and bottom. Torque to 8 Nm in star pattern.'),
        ('Install LED Matrix Strips', 'Clean panel inner surfaces with IPA. Apply WS2812B strips horizontally every 33mm. Solder daisy chains.'),
        ('Install Piezo Sensors', 'Adhere 4x LDT0-028K sensors per panel at corners. Route leads through cable guides to ESP32 boards.'),
        ('Mount Electronics', 'Shock-mount tray to top plate with M4 screws through silicone dampeners. Install Jetson, ESP32 boards, BMS, buck converters.'),
        ('Install Cameras & Radar', 'Mount cameras in top plate housings. Route FPC cables. Mount radar module. Apply anti-fog coating to lens windows.'),
        ('Install Display', 'Slide display into mount frame. Connect HDMI + power. Snap frame into front panel cutout. Secure with M3 screws.'),
        ('Connect Battery', 'Install 6x 21700 cells in sled. Connect BMS leads. VERIFY POLARITY with multimeter. Slide sled into base plate cavity.'),
        ('Final Wiring & Sealing', 'Route all cables through cable guides. Apply silicone sealant around cameras, display, cable glands. Cure 24h.'),
        ('Software & Calibration', 'Flash Jetson with Ubuntu + drivers. Flash ESP32s with firmware. Configure WiFi. Run calibration: IMU level, radar distance, piezo tap test, LED rainbow test, camera focus.'),
    ]
    
    for i, (title, desc) in enumerate(steps, 1):
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(0, 100, 200)
        pdf.cell(15, 6, f'Step {i}:')
        pdf.cell(0, 6, title, new_x='LMARGIN', new_y='NEXT')
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(0, 4, desc)
        pdf.ln(2)

    # =========================================================================
    # CHAPTER 12-14: FIRMWARE, APP, SAFETY
    # =========================================================================
    pdf.add_page()
    pdf.chapter_title('Firmware Architecture', 12)
    
    pdf.body_text('The system uses a dual-processor architecture: a Jetson Orin Nano for ML/video/radar processing, and 5 ESP32-S3 microcontrollers for real-time sensor polling and LED control.')
    
    pdf.subsection('Jetson Orin Nano (Main Compute)')
    pdf.bullet('Camera pipeline: GStreamer -> 4K wide-angle @30fps + 120fps global shutter')
    pdf.bullet('ML pipeline: TensorRT -> MoveNet Thunder pose estimation + pitch type classifier')
    pdf.bullet('Radar pipeline: TI mmWave SDK -> Doppler analysis -> speed + spin + movement')
    pdf.bullet('Video: 2-second ring buffer, triggered by radar detection (>30mph approach)')
    pdf.bullet('Comms: WiFi 6 + BT 5.2 for app connection')
    
    pdf.ln(2)
    pdf.subsection('ESP32-S3 (Per-Panel Controllers)')
    pdf.bullet('Impact detection: 4-channel ADC at 10 kHz per sensor (20 sensors total)')
    pdf.bullet('Acoustic triangulation: +/-1 cm accuracy, <500us response time')
    pdf.bullet('LED control: WS2812B protocol, 800+ LEDs per ESP32, daisy-chained data')
    pdf.bullet('Communication: UART daisy-chain to master ESP32 -> Jetson')
    
    pdf.ln(2)
    pdf.subsection('Impact Detection Algorithm')
    pdf.bullet('Continuous ADC sampling at 10 kHz on all 4 channels per panel')
    pdf.bullet('Bandpass filter: 100 Hz - 5 kHz (remove ambient noise)')
    pdf.bullet('Threshold crossing: >5g equivalent (~800 ADC counts)')
    pdf.bullet('On detection: capture 500 samples, timestamp each sensor crossing')
    pdf.bullet('Trilateration: solve for (x,y) impact point using differential timing')
    pdf.bullet('Force estimation: sum of all 4 sensor amplitudes, calibrated to Newtons')
    pdf.bullet('Result sent to Jetson in <1ms: {panel, x, y, force, timestamp}')
    
    pdf.add_page()
    pdf.chapter_title('Companion App Architecture', 13)
    
    pdf.section_title('Minimum Viable Product (Web App - Phase 1)')
    pdf.body_text('The first version will be a Progressive Web App (PWA) that works on any device with a browser. This reaches the widest audience with the fastest development time. Native iOS/Android apps follow in Phase 2.')
    
    pdf.subsection('Web App Tech Stack')
    pdf.bullet('Frontend: React + TypeScript + Tailwind CSS (PWA with offline support)')
    pdf.bullet('Backend: Node.js + Express + WebSocket (for real-time data)')
    pdf.bullet('Database: PostgreSQL for user data, InfluxDB for time-series pitch data')
    pdf.bullet('Real-time: WebSocket for pitch-by-pitch updates')
    pdf.bullet('Video: WebRTC for streaming from device, HLS for recorded sessions')
    pdf.bullet('Deployment: Vercel (frontend) + Railway (backend)')
    
    pdf.ln(2)
    pdf.subsection('Core Screens')
    screens = [
        ['Dashboard', 'Live session view, current stats, real-time pitch data', 'P0'],
        ['Session Review', 'Video replay with overlaid stats (speed, spin, movement)', 'P0'],
        ['Historical Stats', 'All-time stats, trends, comparison charts', 'P0'],
        ['Session Setup', 'Select mode, configure zones, set targets', 'P0'],
        ['Leaderboard', 'Pop-a-Shot scores by league, weekly/monthly/all-time', 'P1'],
        ['Game Mode', 'Innings, pitch count, balls/strikes, teams', 'P1'],
        ['Hitting Mode', 'Exit velocity, launch angle, contact quality', 'P1'],
        ['Device Settings', 'WiFi config, calibration, firmware updates', 'P0'],
    ]
    pdf.table_row(['Screen', 'Description', 'Priority'], [30, 130, 30], bold=True, fill=True)
    for row in screens:
        pdf.table_row(row, [30, 130, 30])

    pdf.ln(3)
    pdf.subsection('Data Flow')
    pdf.body_text('Device -> WiFi -> Cloud -> App: Each pitch generates a data packet containing: {timestamp, speed_mph, spin_rpm, movement_horiz_in, movement_vert_in, pitch_type_estimate, strike_zone_x, strike_zone_y, impact_force, result (ball/strike)}. Video is stored locally on device and synced to app on request.')
    
    pdf.add_page()
    pdf.chapter_title('Safety Warnings & Maintenance', 14)
    
    pdf.warning_box('CRITICAL: This device is designed to withstand repeated 105+ mph baseball impacts. However, always stand behind a protective screen when using it with live pitching. Never stand directly in the line of fire.')
    
    pdf.ln(2)
    pdf.warning_box('MATERIAL SAFETY: Only use polycarbonate (Lexan) for panels. Acrylic (Plexiglass) WILL shatter and create dangerous flying shards. Verify panel material before each use.')
    
    pdf.ln(2)
    pdf.warning_box('ELECTRICAL SAFETY: This device contains a 111Wh lithium battery. Do not expose to water beyond IP54 rating. Do not modify or puncture battery. Use only the included charger.')
    
    pdf.ln(5)
    pdf.section_title('Maintenance Schedule')
    maint = [
        ['Every use', 'Wipe panels with microfiber cloth. Check for loose fasteners.'],
        ['Weekly', 'Clean camera lenses. Verify battery charge. Check LED function.'],
        ['Monthly', 'Run full diagnostic (all sensors, all LEDs, radar, cameras). Update firmware.'],
        ['Quarterly', 'Inspect EPDM gaskets for wear. Replace silica gel desiccant pack.'],
        ['Annually', 'Full disassembly inspection. Replace any cracked panels. Re-calibrate radar.'],
        ['As needed', 'Replace worn rubber feet. Clean ventilation slots. Reset device.'],
    ]
    pdf.table_row(['Interval', 'Task'], [30, 160], bold=True, fill=True)
    for row in maint:
        pdf.table_row(row, [30, 160])

    # =========================================================================
    # SAVE
    # =========================================================================
    output_path = 'SmartHome_Plate_Build_Guide.pdf'
    pdf.output(output_path)
    print(f'PDF generated: {output_path}')
    print(f'Pages: {pdf.pages_count}')


if __name__ == '__main__':
    generate_pdf()