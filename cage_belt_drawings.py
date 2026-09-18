#!/usr/bin/env python3
"""
Drawing set for the MOTORISED manure belt on the H-frame pullet grower cages
(SiloForge farm, Nigeria).

Dimensions here are the single source of truth for the drawings and must match
images/cages/reference/design.md  (sections 8, 15); the decision log that
explains each number is images/cages/reference/decisions.md (D1-D113).
Change a number in D, re-run, and every drawing updates together:

    python cage_belt_drawings.py

Outputs into images/cages/ :
    manure-belt-REVC-2-row.svg        full 22 ft row, drive station + idler       [Rev C]
    manure-belt-REVC-3-house.svg      whole house, 4 double rows, 12 belts       [Rev C]
    manure-belt-REVC-4-details.svg    fabrication details for the welder         [Rev C]
    manure-belt-REVC-5-frontend.svg   idler shelf, tensioner, pan packing, water [Rev C]
    manure-belt-REVC-6-driveend.svg   drive station, gearmotor, limiter, chutes   [Rev C]

The design, as drawn (design.md section 15, D25-D105):
  * the pen is open on two RC columns ~2 ft square, with one 72.7 in central
    aisle (D30 / 15.2);
  * C = 286 in roller centres; drive-roller centre 14 in behind the rear cage
    leg, idler centre 8 in beyond the front leg (R1 / D69);
  * the drive-station post itself runs up to 90 in and carries the top member;
  * one gearmotor per row drives all three tiers through a torque limiter, a
    drop chain and a propshaft (D25, D81/D82);
  * discharge, TIERS 2 AND 3: belt -> hopper + 100x100 cross-channel -> a
    TWO-TIER combining chute -> a 1.2 m CATCH TRAY in the aisle -> 20 L rubbers
    (D77); spout 250 mm above the tray floor (D76);
  * discharge, TIER 1 (ruling R7 / D105): NO chute, NO hopper, NO cross-channel
    and NO flush.  It falls free over its drive roller at ~305 mm onto ITS OWN
    tray, laid 1.0 m ACROSS the row at x = 2-26" (ruling R7(b) / D112 -- 1100 mm
    is all the clear width between the drive-station post feet), behind a
    THREE-SIDED SHROUD open rearward only.  TWO trays per row, TWO LENGTHS off
    ONE tray drawing;
  * hopper: 45 deg walls, 100x100 channel, 150 mm of cross-fall, plus a
    COMPULSORY 2 L flush per channel after the evening run -- 8 hoppers, 8
    channels, 16 L/day for the house (R5 / D83, as governed by R7 / D105);
  * propshaft 602 mm at 1.43 deg (D81/D82); sprocket hub 16 mm off the angle toe
    and overhang <=35 mm at the drop-chain stations (R6 / D84);
  * belt runs ON the pan, roller tops FLUSH with the pan surface, so drive
    centres are ~10.8 / 33.8 / 56.8 in and idler centres ~11.8 / 34.8 / 57.8 in
    because the pan is packed up 25 mm at the front (D93 / D94);
  * the door is at the CENTRE of the front wall, on the column plane.

All linear dimensions are INCHES unless a name ends in _mm.
Axes:  x = along the row,  y = up,  z = across the row (front-to-front depth).
"""

import math
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "cages")

# ----------------------------------------------------------------------------
# DIMENSIONS  (Rev B, locked 2026-08-03)
# ----------------------------------------------------------------------------
D = dict(
    cell=24,            # cell width along the row
    set_full=72,        # 3 cells
    set_half=48,        # 2 cells
    row_len=264,        # 3 x 72 + 48  = 22 ft
    depth=32,           # cage front-to-front == clear span, rod centre to centre
    rod20=0.79,         # 20 mm rod
    rod12=0.47,         # 12 mm rod
    belt_w=30.3,        # 770 mm
    pan_w=31.1,         # 790 mm
    roller_face=31.1,   # 790 mm
    roller_d=2.48,      # 63 mm
    cage_h=14,          # top of cell to its floor
    gap=9,              # dropping gap: cage top -> next cage floor
    ground=12,          # floor -> bottom pan
    upright=78,
    front_off=8,        # idler centre beyond the front leg
    rear_off=14,        # R1/D69: drive-roller centre beyond the rear cage leg
    pen_len=327,        # 27 ft 3 in
    pen_w=342,          # overall internal width: 2 x 168 + the 6 in the old wall used to eat
    aisle=33.33,        # wall aisle and between-rows (machinery) aisle
    aisle_mid=72.67,    # D30: the single central aisle, 6 ft 0.7 in
    col_sq=24,          # RC mid-span column, ~2 ft square
    row_foot=34,        # 32 cage + the angle either side
    birds_cell=8,

    # ---- Rev C drive end (design.md 15.1, 15.4, 15.5, 15.11 R1) ----
    post_x=14,          # drive-station post / drop-chain plane, x behind the rear cage leg
    post_h=90,          # post runs to 90 in and carries the gantry top member itself
    line_y=85,          # line-shaft axis
    ps_off=0.59,        # 15 mm offset of the two line-shaft axes -> 1.43 deg on 602 mm (D82)
    ps_len=23.70,       # 602 mm joint to joint across the 847 mm machinery aisle (D81)
    hub_boss=1.57,      # turned boss OD 40 mm
    hub_flange=3.94,    # integral flange OD ~100 mm
    spr_od=6.30,        # 38T 428 sprocket plate OD ~160 mm
    arm=17.72,          # 450 mm torque-reaction arm

    # ---- discharge (D74-D80, ruling R5 / D83, ruling R7 / D105) ----
    # TIERS 2 AND 3: belt -> hopper + 100 mm cross-channel -> a TWO-TIER
    #   combining chute -> a catch tray in the aisle -> 20 L rubbers.
    # TIER 1: nothing.  It falls free at ~305 mm onto its OWN tray under the
    #   rear of the row, behind a three-sided shroud (R7 / D105).
    spout=9.84,         # 250 mm: the ONE combining-chute spout, above the tray floor (D76)
    chan=3.94,          # 100 x 100 mm hopper cross-channel (R5 / D83)
    xfall=5.91,         # 150 mm of cross-fall across the 790 mm, IDENTICAL on all 8
    hoppers=8,          # tiers 2 and 3 only -- 8 hoppers, 8 channels for the house (R7)
    flush_l=2,          # LITRES per channel after the EVENING run -- compulsory, not advice
    flush_house_l=16,   # 8 channels x 2 L.  There is no channel and no flush at tier 1
    tray_l=47.24,       # AISLE catch tray, 1.2 m -- tiers 2 and 3, under the chute spout
    tray_w=23.62,       # 0.6 m -- both trays
    tray_d=5.91,        # 150 mm deep -- and the rim height that killed tier 1's channel
    tray_pack=2.36,     # 60 mm of packing under ONE end -> 1:20 fall
    tray_cap=108,       # litres, AISLE tray: 3x the 35.2 L it takes from tiers 2 and 3
    trays=8,            # TWO per row: one in the aisle (tiers 2-3), one under the rear
    t1_carry_mm=3,      # horizontal carry at 16 mm/s over that fall: it drops where it is
    t1_x0=2.0,          # tier 1's own tray, x from the rear cage leg ...
    t1_x1=26.0,         # ... to 26", clear of the 23" access floor at 26-49"
    # ---- TIER 1's tray: 1.0 m ACROSS the row, TWO LENGTHS OFF ONE DRAWING
    #      (ruling R7(b) / D112).  1100 mm is all the clear width there is.
    t1_tray_l=39.37,    # 1.0 m ACROSS the row -- tier 1's own tray
    t1_tray_cap=90,     # litres: 5x tier 1's 17.6 L run (D77 asks for 2x)
    t1_margin_mm=105,   # rim outboard of the 790 mm curtain, each side
    t1_ovh_mm=68,       # rim outboard of each frame line: (1000 - 864) / 2
    post_feet_mm=1100,  # CLEAR foot to foot at x = 14" -- the tray draws out between them
    post_gap_mm=50,     # so the tray clears each post foot by this much
    skirt_out_mm=100,   # 250 mm bottom skirt, outboard of the sprocket plane (R4c / D65)
    brace_min=5.91,     # 150 mm: the diagonal brace must clear this across x = 2-26"
    brace_at=7.4,       # and it lands at 7.4" = 188 mm, as drawn

    # ---- ruling R6 / D84: collar outboard, hub set in off the toe ----
    hub_toe_mm=16,      # inboard 38T plate, off the angle toe
    hub_clear_mm=12,    # clear of the collar face: what a 3 mm L-key needs
    hub_need_mm=66,     # 16 + 50 of the 69.5 mm free-shaft budget, 3.5 spare
    hub_free_mm=69.5,
    ovh_mm=33.5,        # sprocket overhang from the housing face
    ovh_max_mm=35,      # limit at the drop-chain stations, on a worked check
)

# elevation schedule -- derived, matches design.md 8A / 14.13
PAN = [D["ground"]]
FLOOR = [PAN[0] + 5]
TOP = [FLOOR[0] + D["cage_h"]]
for _ in range(2):
    FLOOR.append(TOP[-1] + D["gap"])
    PAN.append(FLOOR[-1] - 5)
    TOP.append(FLOOR[-1] + D["cage_h"])

# water: the horizontal runs sit INSIDE each cage, just under its roof.
# These heights are what keep the pipework out of the keep-out bands.
NIPPLE = [t - 3 for t in TOP]              # 28 / 51 / 74 in

# roller centre-to-centre and the drive-roller centres, derived (design.md section 8)
C_CTRS = D["row_len"] + D["rear_off"] + D["front_off"]        # 286 in = 7.264 m
BELT_LOOP_M = (2 * C_CTRS * 25.4 / 1000) + 0.60               # 2C + wrap + allowance = 15.13 m
# NOTE: sheet 6 alone still plots its roller circles off this list.  The ruling
# roller table is ROLL_Y below (D93); nothing new may be set off DRIVE_Y.
DRIVE_Y = [p + 1.5 for p in PAN]


def mm(v):
    """millimetres -> inches, because the doc mixes both and the welder reads both."""
    return v / 25.4


# ---- angle sections (Rev C -- D52: angle iron replaces round rod) ----------
LEG50, TH50 = mm(50), mm(5)        # uprights and all posts
LEG40, TH40 = mm(40), mm(3)        # pan cross-bars, horizontal leg ON TOP
LEG20, TH20 = mm(20), mm(3)        # return-strand skids, horizontal leg UP

# ----------------------------------------------------------------------------
# WATER -- the confirmed route, and the numbers every sheet draws it from.
#   A BUCKET on its OWN HOLDER, which stands on the floor and carries the water;
#   it is tied to the frame for ELEVATION ONLY, so the cage angle carries none
#   of it.  ONE T at the bucket splits into TWO pipes, one per side of the row.
#   Each pipe drops INSIDE THE L of its angle upright -- the angle's inside
#   corner IS the pipe chase, so the pipe never leaves the steel's own outline:
#   nothing in the aisle, nothing in a keep-out band, nothing near belt or
#   rollers.  THREE Ts per side, one per tier: SIX INLETS PER ROW.
#   TWO nipple lines per tier, one per cage side, each 180 mm inboard of its
#   belt edge, so every drip lands on the belt.
# ----------------------------------------------------------------------------
BELT_Z0 = (D["depth"] - D["belt_w"]) / 2        # 0.85"  belt edge, far side
BELT_Z1 = D["depth"] - BELT_Z0                  # 31.15" belt edge, aisle side
NIP_IN_MM = 180                                 # nipple line, inboard of its belt edge
NIP_Z = [BELT_Z0 + mm(NIP_IN_MM),               # 7.94"  far cage side
         BELT_Z1 - mm(NIP_IN_MM)]               # 24.06" aisle cage side
W_INLETS = 6                                    # 3 tiers x 2 sides, per row
W_CHASE = mm(15)                                # pipe centre in the nook, off both legs
W_STEP = 3.0                                    # the inlet steps down-row past the span leg
W_BKT_Y = (84.0, 96.0)                          # bucket body, clear above the 77" top tie
W_BKT_Z = D["depth"] + 6.5                      # holder stands ~165 mm off the cage face
W_XOVER = 80.0                                  # the one cross-over, above the whole stack

# the THREE keep-out bands -- 12-17" is tier 1's and is drawn on every sheet
KEEPOUT = [(PAN[0], FLOOR[0]), (TOP[0], FLOOR[1]), (TOP[1], FLOOR[2])]
KEEPOUT_TAPE = '12–17"  ·  31–40"  ·  54–63"'

# ---- D93: the CORRECTED drive-roller centres -------------------------------
# The belt runs ON the pan and wraps over the TOP of the roller, so the roller
# top is FLUSH with the pan surface and the centre sits ONE RADIUS below it.
PAN_T = mm(1)                                                 # 1 mm galvanised sheet
ROLL_Y = [p + PAN_T - D["roller_d"] / 2 for p in PAN]         # ~10.8 / 33.8 / 56.8 in
SKID_Y = [p - D["roller_d"] for p in PAN]                     # top face 63 mm below the pan seat
LINE_Y_C = ROLL_Y[2] + 25.5                                   # off tier 3's AS-BUILT centre
GANTRY_Y_C = LINE_Y_C + 5.0

FRAME_X = [0, 72, 144, 216, 264]          # 5 frames: 3 full sets + 1 half set
CELLS_SIDE = D["row_len"] // D["cell"]     # 11
CAPACITY = CELLS_SIDE * 2 * 3 * 4 * D["birds_cell"]

# ----------------------------------------------------------------------------
# palette
# ----------------------------------------------------------------------------
INK = "#1b2430"
MUTED = "#6b7684"
FAINT = "#aeb6c1"
STEEL = "#3d4552"          # 20 mm rod
STEEL12 = "#939dab"        # 12 mm rod
PAN_L = "#4a90c4"
PAN_F = "#d3e6f5"
BELT_L = "#d2691e"
BELT_F = "#f2a15c"
CAGE_L = "#4f7f52"
CAGE_F = "#e4efe2"
MECH = "#b6382b"
MANURE = "#8a6a45"
WATER = "#2f8fbf"
PAPER = "#ffffff"
BAND = "#f4f6f9"

C30 = math.cos(math.radians(30))
_bbox = None


def reset_bbox():
    global _bbox
    _bbox = None


def note_pt(X, Y):
    """Track the extent of everything drawn, so we can verify it fits the viewBox."""
    global _bbox
    if _bbox is None:
        _bbox = [X, Y, X, Y]
    else:
        _bbox[0] = min(_bbox[0], X)
        _bbox[1] = min(_bbox[1], Y)
        _bbox[2] = max(_bbox[2], X)
        _bbox[3] = max(_bbox[3], Y)


class Iso:
    """Isometric projection.  X = (x-z)cos30 ; Y = (x+z)/2 - y"""

    def __init__(self, s, ox, oy):
        self.s, self.ox, self.oy = s, ox, oy

    def p(self, x, y, z):
        X = (x - z) * C30 * self.s + self.ox
        Y = ((x + z) * 0.5 - y) * self.s + self.oy
        note_pt(X, Y)
        return (X, Y)


class Flat:
    """Plain 2D mapping for plans and details (y grows downward on screen)."""

    def __init__(self, s, ox, oy, flip_y=True):
        self.s, self.ox, self.oy, self.flip = s, ox, oy, flip_y

    def p(self, u, v):
        X = self.ox + u * self.s
        Y = self.oy + (-v if self.flip else v) * self.s
        note_pt(X, Y)
        return (X, Y)


# ----------------------------------------------------------------------------
# svg helpers
# ----------------------------------------------------------------------------
def f(v):
    return f"{v:.1f}"


def line(a, b, col=INK, w=1.2, dash=None, cap="round", op=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    o = f' opacity="{op}"' if op else ""
    return (f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" '
            f'stroke="{col}" stroke-width="{w}" stroke-linecap="{cap}"{d}{o}/>')


def poly(pts, fill="none", col=INK, w=1.1, op=1.0, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    s = " ".join(f"{f(p[0])},{f(p[1])}" for p in pts)
    return (f'<polygon points="{s}" fill="{fill}" fill-opacity="{op}" '
            f'stroke="{col}" stroke-width="{w}" stroke-linejoin="round"{d}/>')


def path(dstr, fill="none", col=INK, w=1.1, op=1.0):
    return (f'<path d="{dstr}" fill="{fill}" fill-opacity="{op}" stroke="{col}" '
            f'stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>')


def circ(c, r, fill=PAPER, col=INK, w=1.1):
    return (f'<circle cx="{f(c[0])}" cy="{f(c[1])}" r="{f(r)}" fill="{fill}" '
            f'stroke="{col}" stroke-width="{w}"/>')


def txt(p, s, size=13, col=INK, anchor="start", weight="400", style="normal", op=1.0):
    s = (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return (f'<text x="{f(p[0])}" y="{f(p[1])}" font-size="{size}" fill="{col}" '
            f'text-anchor="{anchor}" font-weight="{weight}" font-style="{style}" '
            f'opacity="{op}" font-family="Segoe UI, Helvetica, Arial, sans-serif">{s}</text>')


def vtxt(p, s, size=11, col=INK, anchor="middle", weight="400", ang=-90):
    """Text rotated about its own anchor point -- for narrow aisles and gutters."""
    return txt(p, s, size, col, anchor, weight).replace(
        "<text ", f'<text transform="rotate({ang} {f(p[0])} {f(p[1])})" ', 1)


def rect(p, w, h, fill="none", col=INK, sw=1.1, r=0, op=1.0):
    note_pt(p[0], p[1]); note_pt(p[0] + w, p[1] + h)
    return (f'<rect x="{f(p[0])}" y="{f(p[1])}" width="{f(w)}" height="{f(h)}" '
            f'rx="{r}" fill="{fill}" fill-opacity="{op}" stroke="{col}" stroke-width="{sw}"/>')


def callout(p, n, r=10):
    return (circ(p, r, fill="#ffffff", col=MECH, w=1.6)
            + txt((p[0], p[1] + 4.2), str(n), 12, MECH, "middle", "700"))


def dim_h(a, b, y, label, col=MUTED, size=11, off=0):
    """Horizontal dimension line with ticks, label above."""
    out = [line((a, y), (b, y), col, 0.9),
           line((a, y - 4), (a, y + 4), col, 0.9),
           line((b, y - 4), (b, y + 4), col, 0.9),
           txt(((a + b) / 2, y - 6 + off), label, size, col, "middle", "600")]
    return "".join(out)


def dim_v(x, a, b, label, col=MUTED, size=11):
    out = [line((x, a), (x, b), col, 0.9),
           line((x - 4, a), (x + 4, a), col, 0.9),
           line((x - 4, b), (x + 4, b), col, 0.9),
           txt((x + 6, (a + b) / 2 + 4), label, size, col, "start", "600")]
    return "".join(out)


REVC = "REV C  |  2026-09-18"
STRAP_C = "MOTORISED manure belt"


def header(w, title, sub, rev=None, strap=None):
    rev = rev or REVC
    strap = strap or STRAP_C
    return "".join([
        rect((0, 0), w, 62, fill=BAND, col=BAND),
        line((0, 62), (w, 62), FAINT, 1.2),
        txt((28, 30), title, 21, INK, "start", "700"),
        txt((28, 50), sub, 12.5, MUTED),
        txt((w - 28, 30), rev, 12, MECH, "end", "700"),
        txt((w - 28, 50), strap, 11.5, MUTED, "end"),
    ])


def panel(x, y, w, h, title):
    return "".join([
        rect((x, y), w, h, fill="#fbfcfd", col=FAINT, sw=1, r=6),
        txt((x + 14, y + 22), title, 13, INK, "start", "700"),
        line((x + 14, y + 30), (x + w - 14, y + 30), FAINT, 1),
    ])


def legend(x, y, items, title="Colour key"):
    out = [txt((x, y), title, 12.5, INK, "start", "700")]
    yy = y + 18
    for col, lab in items:
        out.append(rect((x, yy - 8), 22, 10, fill=col, col=INK, sw=0.8, r=2))
        out.append(txt((x + 30, yy), lab, 11.5, MUTED))
        yy += 18
    return "".join(out), yy


def wrap(x, y, w, text, size=11.5, lh=15, col=MUTED, weight="400"):
    """Very small word-wrapper for note blocks."""
    words, lines, cur = text.split(), [], ""
    limit = max(8, int(w / (size * 0.5)))
    for wd in words:
        t = (cur + " " + wd).strip()
        if len(t) > limit:
            lines.append(cur)
            cur = wd
        else:
            cur = t
    if cur:
        lines.append(cur)
    return "".join(txt((x, y + i * lh), ln, size, col, "start", weight)
                   for i, ln in enumerate(lines)), y + len(lines) * lh


def write(name, w, h, body):
    global _bbox
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
           f'width="{w}" height="{h}" font-family="Segoe UI, Helvetica, Arial, sans-serif">'
           f'<rect width="{w}" height="{h}" fill="{PAPER}"/>' + body + "</svg>")
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(doc)
    b = _bbox or [0, 0, 0, 0]
    fits = "OK " if (b[0] > -2 and b[1] > -2 and b[2] < w + 2 and b[3] < h + 2) else "!! OVERFLOW"
    print(f"  {fits} {name:34s} viewBox {w}x{h}  content "
          f"[{b[0]:.0f},{b[1]:.0f}]..[{b[2]:.0f},{b[3]:.0f}]")
    reset_bbox()


# ----------------------------------------------------------------------------
# shared 3-D pieces
# ----------------------------------------------------------------------------
def quad_xz(iso, y, x0, x1, z0, z1, fill, col, w=1.0, op=1.0):
    return poly([iso.p(x0, y, z0), iso.p(x1, y, z0), iso.p(x1, y, z1), iso.p(x0, y, z1)],
                fill=fill, col=col, w=w, op=op)


def slab_xz(iso, y, thick, x0, x1, z0, z1, fill, col, w=1.0, op=1.0):
    """A thin horizontal sheet with visible front edge (pan / belt)."""
    out = [quad_xz(iso, y, x0, x1, z0, z1, fill, col, w, op)]
    # front edge (z1 side) and end edge (x1 side) give it thickness
    a, b = iso.p(x0, y, z1), iso.p(x1, y, z1)
    a2, b2 = iso.p(x0, y - thick, z1), iso.p(x1, y - thick, z1)
    out.append(poly([a, b, b2, a2], fill=col, col=col, w=0.6, op=0.55))
    c, c2 = iso.p(x1, y, z0), iso.p(x1, y - thick, z0)
    out.append(poly([c, b, b2, c2], fill=col, col=col, w=0.6, op=0.35))
    return "".join(out)


def upright(iso, x, z, y0, y1, col=STEEL, w=5.0):
    return line(iso.p(x, y0, z), iso.p(x, y1, z), col, w, cap="round")


def crossbar(iso, x, y, z0, z1, col=STEEL, w=3.4):
    return line(iso.p(x, y, z0), iso.p(x, y, z1), col, w)


def longbar(iso, z, y, x0, x1, col=STEEL12, w=2.6):
    return line(iso.p(x0, y, z), iso.p(x1, y, z), col, w)


def cage_box(iso, x0, x1, y0, y1, z0, z1, mesh=True, col=CAGE_L, fill=CAGE_F, op=0.30):
    """Wireframe cage with a light mesh hint on the two visible faces."""
    out = []
    # visible faces: front (z1) and end (x1) and top (y1)
    out.append(poly([iso.p(x0, y0, z1), iso.p(x1, y0, z1), iso.p(x1, y1, z1), iso.p(x0, y1, z1)],
                    fill=fill, col=col, w=1.0, op=op))
    out.append(poly([iso.p(x1, y0, z0), iso.p(x1, y0, z1), iso.p(x1, y1, z1), iso.p(x1, y1, z0)],
                    fill=fill, col=col, w=1.0, op=op * 0.7))
    out.append(quad_xz(iso, y1, x0, x1, z0, z1, fill, col, 1.0, op * 0.5))
    if mesh:
        n = max(2, int((x1 - x0) / 6))
        for i in range(1, n):
            xx = x0 + (x1 - x0) * i / n
            out.append(line(iso.p(xx, y0, z1), iso.p(xx, y1, z1), col, 0.45, op=0.5))
        for i in range(1, 4):
            yy = y0 + (y1 - y0) * i / 4
            out.append(line(iso.p(x0, yy, z1), iso.p(x1, yy, z1), col, 0.45, op=0.5))
    return "".join(out)


def manure_on_belt(iso, y, x0, x1, z0, z1, n=9):
    out = []
    for i in range(n):
        t = (i + 0.5) / n
        xx = x0 + (x1 - x0) * t
        zz = z0 + (z1 - z0) * (0.22 + 0.56 * ((i * 7) % 5) / 4.0)
        p = iso.p(xx, y, zz)
        rr = 2.6 + 1.5 * ((i * 3) % 4) / 3.0
        out.append(f'<ellipse cx="{f(p[0])}" cy="{f(p[1])}" rx="{f(rr*1.5)}" '
                   f'ry="{f(rr*0.7)}" fill="{MANURE}" fill-opacity="0.55" stroke="none"/>')
    return "".join(out)


def roller(iso, xc, y, z0, z1, col=MECH, r=None):
    """Roller drawn as a thick bar plus end discs."""
    r = r or D["roller_d"] / 2
    out = [line(iso.p(xc, y, z0), iso.p(xc, y, z1), col, 7.5)]
    for zz in (z0, z1):
        out.append(circ(iso.p(xc, y, zz), 3.4, fill="#f2c9c4", col=col, w=1.2))
    return "".join(out)


def tier_stack(iso, x0, x1, z0, z1, show_manure=True, mesh=True, top_wire=False, cutaway=None):
    """The three tiers of pan / belt / cage for a length of row, back to front.

    cutaway = tier index whose belt is drawn short, so the pan below shows.
    """
    out = []
    for t in range(3):
        pz0, pz1 = z0 + (D["depth"] - D["pan_w"]) / 2, z1 - (D["depth"] - D["pan_w"]) / 2
        bz0, bz1 = z0 + (D["depth"] - D["belt_w"]) / 2, z1 - (D["depth"] - D["belt_w"]) / 2
        bx1 = x1 - 24 if cutaway == t else x1
        # pan  (always full length -- it is the continuous element)
        out.append(slab_xz(iso, PAN[t], 0.9, x0, x1, pz0, pz1, PAN_F, PAN_L, 1.0, 0.95))
        # belt on the pan
        out.append(slab_xz(iso, PAN[t] + 0.9, 0.8, x0, bx1, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
        if cutaway == t:  # torn edge of the belt
            out.append(line(iso.p(bx1, PAN[t] + 0.9, bz0), iso.p(bx1, PAN[t] + 0.9, bz1),
                            BELT_L, 2.4, dash="5 3"))
        if show_manure:
            out.append(manure_on_belt(iso, PAN[t] + 1.8, x0 + 3, bx1 - 3, bz0, bz1))
        # deflector strips, both sides, angled inward
        for zz, sgn in ((z0, +1), (z1, -1)):
            a = iso.p(x0, PAN[t] + 3.6, zz)
            b = iso.p(x1, PAN[t] + 3.6, zz)
            c = iso.p(x1, PAN[t] + 1.4, zz + sgn * 1.9)
            dd = iso.p(x0, PAN[t] + 1.4, zz + sgn * 1.9)
            out.append(poly([a, b, c, dd], fill="#dfe4ea", col=MUTED, w=0.8, op=0.9))
        # cage
        wire = top_wire and t == 2
        out.append(cage_box(iso, x0, x1, FLOOR[t], TOP[t], z0, z1,
                            mesh=mesh and not wire, op=0.12 if wire else 0.30))
        # wire divider down the middle of the double
        zm = (z0 + z1) / 2
        out.append(line(iso.p(x0, FLOOR[t], zm), iso.p(x0, TOP[t], zm), CAGE_L, 0.7, op=0.55))
        out.append(line(iso.p(x1, FLOOR[t], zm), iso.p(x1, TOP[t], zm), CAGE_L, 0.7, op=0.55))
        out.append(line(iso.p(x0, TOP[t], zm), iso.p(x1, TOP[t], zm), CAGE_L, 0.7, op=0.55))
    return "".join(out)


def frame(iso, x, z0, z1, with_long=False, x1=None):
    """One H-frame: two uprights + cross-bars at every pan and cage-floor level."""
    out = [upright(iso, x, z0, 0, D["upright"]), upright(iso, x, z1, 0, D["upright"])]
    out.append(crossbar(iso, x, 4, z0, z1, STEEL12, 2.4))          # bottom brace
    for t in range(3):
        out.append(crossbar(iso, x, PAN[t], z0, z1, STEEL, 3.6))     # pan bar, 20 mm
        out.append(crossbar(iso, x, FLOOR[t], z0, z1, STEEL12, 2.4))  # cage bar, 12 mm
    out.append(crossbar(iso, x, D["upright"], z0, z1, STEEL12, 2.2))
    return "".join(out)


# ============================================================================
# WATER -- drawn the same way wherever it appears
# ============================================================================
def keepout_bands(fl, u0, u1, label=True, op=0.7, size=9.5, ulab=None):
    """The THREE keep-out bands shaded across u0..u1 of a Flat view."""
    out = []
    for ka, kb in KEEPOUT:
        out.append(rect(fl.p(u0, kb), (u1 - u0) * fl.s, (kb - ka) * fl.s,
                        fill="#f7d9d5", col="#eec4bd", sw=0.9, op=op))
        if label:
            out.append(txt(fl.p(ulab if ulab is not None else (u0 + u1) / 2,
                                ka + 1.5),
                           'KEEP OUT  %d–%d"' % (ka, kb), size, MECH, "middle", "700"))
    return "".join(out)


def water_drop(fl, side, y0, y1, w=3.2):
    """One drop pipe, in the nook of the angle upright.  side: 0 far, 1 aisle.

    A white halo goes down first: at drawing scale the nook is only 15 mm off
    the steel, so without it the pipe disappears into the upright it sits in.
    """
    u = (D["depth"] + W_CHASE) if side else -W_CHASE
    return (line(fl.p(u, y0), fl.p(u, y1), PAPER, w + 3.0)
            + line(fl.p(u, y0), fl.p(u, y1), WATER, w))


def water_tee(fl, side, y, r=3.2):
    u = (D["depth"] + W_CHASE) if side else -W_CHASE
    return (circ(fl.p(u, y), r + 1.4, fill=PAPER, col="none", w=0)
            + circ(fl.p(u, y), r, fill="#dff1fa", col=WATER, w=1.6))


def water_section(fl, bucket=True, dims=True, bands=True, labels=True):
    """CROSS-SECTION of one row at the FRONT frame, with the confirmed water route.

    u = z across the row (inches, 0 and 32 are the two span faces);  v = height.
    Draws: the bucket on its own holder, the one T, the two drops in the angle
    nooks, three Ts per side, six inlets, and two nipple lines per tier at
    180 mm inboard of the belt edges.
    """
    o = []
    z1 = float(D["depth"])
    o.append(line(fl.p(-LEG50 - 3, 0), fl.p(W_BKT_Z + 7, 0), INK, 2.0))
    if bands:
        o.append(keepout_bands(fl, 0, z1, label=labels, size=7.5, ulab=z1 / 2))
    # the two angle uprights, body entirely OUTBOARD of the span face (D53)
    for zz, sgn in ((0.0, -1), (z1, +1)):
        u0 = zz if sgn > 0 else zz - LEG50
        o.append(rect(fl.p(u0, D["upright"]), LEG50 * fl.s, D["upright"] * fl.s,
                      fill="#cfd5dd", col=STEEL, sw=1.2))
    # tiers: cage, pan, belt, and the TWO nipple lines
    for t in range(3):
        o.append(rect(fl.p(0.7, TOP[t]), (z1 - 1.4) * fl.s, D["cage_h"] * fl.s,
                      fill=CAGE_F, col=CAGE_L, sw=1, op=0.55))
        o.append(line(fl.p(0.9, PAN[t]), fl.p(z1 - 0.9, PAN[t]), PAN_L, 2.2))
        o.append(line(fl.p(BELT_Z0, PAN[t] + 0.6), fl.p(BELT_Z1, PAN[t] + 0.6),
                      BELT_L, 2.6))
        o.append(line(fl.p(z1 / 2, FLOOR[t]), fl.p(z1 / 2, TOP[t]), CAGE_L, 1.0, dash="3 3"))
        for side in (0, 1):
            un = NIP_Z[side]
            ud = (z1 + W_CHASE) if side else -W_CHASE
            ug = z1 if side else 0.0                    # grommet in the cage face
            o.append(water_tee(fl, side, NIPPLE[t]))
            o.append(line(fl.p(ud, NIPPLE[t]), fl.p(un, NIPPLE[t]), WATER, 2.4))
            o.append(circ(fl.p(ug, NIPPLE[t]), 2.0, fill=PAPER, col=MECH, w=1.2))
            o.append(circ(fl.p(un, NIPPLE[t]), 3.2, fill="#dff1fa", col=WATER, w=1.8))
            # the drip, landing on the belt
            o.append(line(fl.p(un, NIPPLE[t] - 1.0), fl.p(un, PAN[t] + 1.1), WATER, 0.8,
                          dash="2 3"))
    # the two drops, in the nooks, and their drain cocks
    for side in (0, 1):
        o.append(water_drop(fl, side, NIPPLE[0] - 2.0,
                            W_XOVER if side == 0 else W_BKT_Y[0] - 1.0))
        ud = (z1 + W_CHASE) if side else -W_CHASE
        o.append(circ(fl.p(ud, NIPPLE[0] - 2.6), 2.2, fill="#f6d8d4", col=MECH, w=1.3))
    if bucket:
        # the holder: it stands on the floor and carries the bucket
        for du in (-3.2, 3.2):
            o.append(line(fl.p(W_BKT_Z + du, 0), fl.p(W_BKT_Z + du, W_BKT_Y[0]),
                          STEEL, 3.0))
        o.append(line(fl.p(W_BKT_Z - 4.4, W_BKT_Y[0]), fl.p(W_BKT_Z + 4.4, W_BKT_Y[0]),
                      STEEL, 3.4))
        o.append(line(fl.p(W_BKT_Z - 3.2, 14), fl.p(W_BKT_Z + 3.2, 14), STEEL, 2.0))
        o.append(rect(fl.p(W_BKT_Z - 5.0, W_BKT_Y[1]), 10.0 * fl.s,
                      (W_BKT_Y[1] - W_BKT_Y[0]) * fl.s, fill="#dff1fa", col=WATER,
                      sw=2.0, r=3))
        if labels:
            o.append(txt(fl.p(W_BKT_Z + 5.6, (W_BKT_Y[0] + W_BKT_Y[1]) / 2 + 1.4),
                         "BUCKET", 11, WATER, "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, (W_BKT_Y[0] + W_BKT_Y[1]) / 2 - 1.6),
                         "on its OWN", 10, WATER, "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, (W_BKT_Y[0] + W_BKT_Y[1]) / 2 - 4.2),
                         "HOLDER", 10, WATER, "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, D["upright"] - 2.6),
                         "TIES  —  elevation", 9.5, STEEL, "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, D["upright"] - 5.0),
                         "and sway ONLY", 9.5, STEEL, "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, 30.0), "the HOLDER carries", 9.5, MECH,
                         "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, 27.4), "the water to the", 9.5, MECH,
                         "start", "700"))
            o.append(txt(fl.p(W_BKT_Z + 5.6, 24.8), "FLOOR", 9.5, MECH, "start", "700"))
        # ties to the upright: RESTRAINT ONLY
        for yy in (D["upright"] - 1, 64.0):
            o.append(line(fl.p(z1 + LEG50, yy), fl.p(W_BKT_Z - 4.5, yy), STEEL12, 1.6,
                          dash="4 3"))
        # one T under the bucket, then two pipes
        o.append(line(fl.p(W_BKT_Z, W_BKT_Y[0]), fl.p(W_BKT_Z, W_XOVER), WATER, 3.2))
        o.append(circ(fl.p(W_BKT_Z, W_XOVER), 3.4, fill=PAPER, col=WATER, w=2.0))
        o.append(line(fl.p(W_BKT_Z, W_XOVER), fl.p(z1 + W_CHASE, W_XOVER), WATER, 3.2))
        o.append(line(fl.p(z1 + W_CHASE, W_XOVER), fl.p(z1 + W_CHASE, W_BKT_Y[0] - 1.0),
                      WATER, 3.2))
        o.append(line(fl.p(W_BKT_Z, W_XOVER), fl.p(-W_CHASE, W_XOVER), WATER, 3.2))
        o.append(circ(fl.p(D["depth"] / 2, W_XOVER), 2.0, fill=MUTED, col=MUTED, w=1))
    if dims:
        dy = 22.0                       # clear of all three bands, inside tier 1
        for ua, ub in ((BELT_Z0, NIP_Z[0]), (NIP_Z[1], BELT_Z1)):
            o.append(dim_h(fl.p(ua, dy)[0], fl.p(ub, dy)[0], fl.p(0, dy)[1],
                           "180", WATER, 9.5))
            o.append(line(fl.p(ua, PAN[0] + 0.6), fl.p(ua, dy), BELT_L, 0.7, dash="2 3"))
            o.append(line(fl.p(ub, dy), fl.p(ub, NIPPLE[0] - 1.0), WATER, 0.7, dash="2 3"))
        for t in range(3):
            o.append(txt(fl.p(-LEG50 - 1.0, NIPPLE[t] + 0.6), '%d"' % NIPPLE[t], 10,
                         WATER, "end", "700"))
    return "".join(o)


def chase_detail(fl, side=1, zin=None, urun=None):
    """ENLARGED PLAN through one angle upright at nipple height -- THE PIPE CHASE.

    u = x along the row (0 = the frame),  v = z across the row.  The angle's
    inside corner holds the drop; the inlet steps down-row past the span leg and
    turns in through a grommet, so nothing crosses the belt or a keep-out band.
    """
    o = []
    z1 = float(D["depth"])
    sg = +1 if side else -1                       # +1 = the aisle-side upright
    zf = z1 if side else 0.0                      # the span face
    zn = NIP_Z[1] if side else NIP_Z[0]           # this cage side's nipple line
    zin = zn if zin is None else zin              # or a cropped view of the run in
    ur = LEG50 * 3.2 if urun is None else urun    # how far down-row the view runs
    # the L, heel AT the span face, both legs pointing AWAY from the belt (D53)
    o.append(poly([fl.p(0, zf), fl.p(LEG50, zf), fl.p(LEG50, zf + sg * TH50),
                   fl.p(TH50, zf + sg * TH50), fl.p(TH50, zf + sg * LEG50),
                   fl.p(0, zf + sg * LEG50)], fill="#cfd5dd", col=STEEL, w=1.6))
    # belt and pan edges, on the belt side of the span face
    bz = BELT_Z1 if side else BELT_Z0
    pz0 = (z1 - D["pan_w"]) / 2
    pz = (z1 - pz0) if side else pz0
    o.append(line(fl.p(-LEG50, zf), fl.p(ur, zf), CAGE_L, 1.1, dash="7 4"))
    o.append(line(fl.p(-LEG50, pz), fl.p(ur, pz), PAN_L, 2.6))
    o.append(line(fl.p(-LEG50, bz), fl.p(ur, bz), BELT_L, 3.2))
    o.append(txt(fl.p(ur, bz - sg * 0.22), "BELT EDGE", 9.5, BELT_L, "end", "700"))
    o.append(txt(fl.p(ur, pz + sg * 0.18), "pan lip", 9, PAN_L, "end", "600"))
    # the drop, sitting in the nook, and its clip
    pc = fl.p(W_CHASE, zf + sg * W_CHASE)
    o.append(circ(pc, mm(10) * fl.s, fill="#dff1fa", col=WATER, w=2.2))
    o.append(circ(pc, mm(10) * fl.s + 3.0, fill="none", col=MUTED, w=1.2))
    # the inlet: T in the nook -> down-row past the span leg -> in through a grommet
    o.append(line(pc, fl.p(W_STEP, zf + sg * W_CHASE), WATER, 2.6))
    o.append(line(fl.p(W_STEP, zf + sg * W_CHASE), fl.p(W_STEP, zin), WATER, 2.6))
    o.append(circ(fl.p(W_STEP, zf), 3.2, fill=PAPER, col=MECH, w=1.6))
    if zin == zn:
        o.append(line(fl.p(W_STEP, zn), fl.p(ur, zn), WATER, 3.0))
        o.append(txt(fl.p(ur, zn - sg * 0.34), "NIPPLE LINE", 9.5, WATER, "end", "700"))
    else:
        o.append(txt(fl.p(W_STEP + 0.25, zin + sg * 0.12), "on in to the NIPPLE LINE",
                     9.5, WATER, "start", "700"))
    return "".join(o)


# ============================================================================
# DRAWING 2 (REV C) -- the whole 22 ft row, drive station and idler
# ============================================================================
def drawing_row():
    """One row, Rev C: 22 ft, three tiers, the drive station at the rear and the
    idler with its take-up shelf at the front."""
    W, H = 1800, 1180
    z0, z1 = 0, D["depth"]
    x0, x1 = 0, D["row_len"]
    xi = -D["front_off"]                 # -8"  idler centre
    xd = x1 + D["rear_off"]              # 278" drive roller = post = drop-chain plane
    iso = Iso(2.45, 210, 330)
    o = [header(W, "2 · ONE ROW  —  22 ft, 3 tiers, driven from the rear",
                "Three 6 ft sets plus one 4 ft half-set.  One belt per tier runs the whole "
                "22 ft on its pan and discharges at the rear, where ONE gearmotor turns all "
                "three tiers through a drop chain.",
                rev=REVC, strap=STRAP_C)]

    g = [iso.p(xi - 6, 0, z0 - 5), iso.p(xd + 6, 0, z0 - 5),
         iso.p(xd + 6, 0, z1 + 5), iso.p(xi - 6, 0, z1 + 5)]
    o.append(poly(g, fill="#eef1f4", col="#e2e6eb", w=1, op=0.9))

    # ---- the row itself, back to front -----------------------------------
    o.append(frame(iso, FRAME_X[0], z0, z1))
    for zz in (z0, z1):
        o.append(longbar(iso, zz, 4, x0, x1))
    o.append(tier_stack(iso, x0, x1, z0, z1, show_manure=True, mesh=False, top_wire=True))
    for fx in FRAME_X[1:]:
        o.append(frame(iso, fx, z0, z1))

    bz0 = z0 + (D["depth"] - D["belt_w"]) / 2
    bz1 = z1 - (D["depth"] - D["belt_w"]) / 2

    # ---- the drive-station posts, line shaft and top member (drawn first,
    #      so the rollers, sprockets and chain sit in FRONT of them) --------
    for zz in (z0, z1):
        o.append(upright(iso, xd, zz, 0, D["post_h"], MECH, 5.4))
    o.append(line(iso.p(xd, LINE_Y_C, z0 - 2), iso.p(xd, LINE_Y_C, z1 + 5), STEEL, 4.2))
    o.append(line(iso.p(xd, GANTRY_Y_C, z0), iso.p(xd, GANTRY_Y_C, z1), MECH, 3.4))

    # ---- the two ends of every belt --------------------------------------
    ZSPR = z1 + 3.0                                 # the drop-chain / sprocket plane
    RSPR = D["spr_od"] / 2 * 2.45                   # 38T plate, to scale
    for t in range(3):
        ytop = PAN[t] + PAN_T                       # pan surface at the REAR
        yfront = PAN_SURF_F[t]                      # pan surface at the FRONT (packed 25 mm)
        # roller first, then the belt over it -- the belt wraps over the TOP
        o.append(roller(iso, xi, IDLE_Y[t], bz0 - 0.5, bz1 + 0.5))
        o.append(roller(iso, xd, ROLL_Y[t], bz0 - 0.5, bz1 + 0.5))
        o.append(slab_xz(iso, yfront, 0.8, xi, x0, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
        o.append(slab_xz(iso, ytop, 0.8, x1, xd, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
        # return strand, riding the 20 x 20 skids one roller diameter under the pan
        o.append(line(iso.p(xi, SKID_Y[t], (bz0 + bz1) / 2),
                      iso.p(xd, SKID_Y[t], (bz0 + bz1) / 2), BELT_L, 1.6, dash="7 5"))
        # the discharge.  TIERS 2 AND 3: hopper across the belt width, then out
        # into the aisle.  TIER 1: nothing -- it falls straight down (R7 / D105).
        hx = xd + 2.0
        if t:
            o.append(quad_xz(iso, ytop - 0.6, hx, hx + 3.2, bz0, bz1,
                             "#e7ded3", MANURE, 1.1))
            o.append(line(iso.p(hx + 1.6, ytop - 0.6, bz1 - 1.0),
                          iso.p(hx + 1.6, D["tray_d"] + 1.5, z1 + 11.0), MANURE, 2.6))
        else:
            for zq in (bz0 + 2, (bz0 + bz1) / 2, bz1 - 2):
                o.append(line(iso.p(xd + 0.6, ytop - 0.8, zq),
                              iso.p(xd + 0.6, D["tray_d"] + 0.4, zq), MANURE, 2.2))

    # ---- the drop chain and its 38T plates, outboard on the post ----------
    for t in range(3):
        o.append(circ(iso.p(xd, ROLL_Y[t], ZSPR), RSPR, fill="#fdf1ef", col=MECH, w=2.0))
    o.append(circ(iso.p(xd, LINE_Y_C, ZSPR), RSPR, fill="#fdf1ef", col=MECH, w=2.0))
    chain_y = [ROLL_Y[0], ROLL_Y[1], ROLL_Y[2], LINE_Y_C]
    for ya, yb2 in zip(chain_y, chain_y[1:]):
        a = iso.p(xd, ya, ZSPR)
        b = iso.p(xd, yb2, ZSPR)
        for dpx in (-RSPR, RSPR):
            o.append(line((a[0] + dpx, a[1]), (b[0] + dpx, b[1]), MECH, 2.2))
    # gearmotor, hung on the post above head height
    gm = iso.p(xd + 3.5, 84.0, z1 + 1.0)
    o.append(rect((gm[0] - 14, gm[1] - 12), 28, 24, fill="#f6d8d4", col=MECH, sw=1.8, r=3))
    # a patch of aisle floor alongside the drive station, and the tray on it
    o.append(quad_xz(iso, 0, x1 - 10, xd + 10, z1 + 4, z1 + 29,
                     "#eef1f4", "#e2e6eb", 1.0, 0.9))
    o.append(quad_xz(iso, 0.4, x1 - 3, x1 - 3 + D["tray_l"], z1 + 6,
                     z1 + 6 + D["tray_w"], "#eef4f8", STEEL, 1.8))
    # ★ TIER 1's OWN tray, under the rear of the row: 1.0 m ACROSS (R7(b) / D112)
    o.append(quad_xz(iso, 0.5, x1 + D["t1_x0"], x1 + D["t1_x1"],
                     (z0 + z1) / 2 - D["t1_tray_l"] / 2,
                     (z0 + z1) / 2 + D["t1_tray_l"] / 2,
                     "#eef4f8", STEEL, 1.8))
    # the idler take-up shelves, welded FLAT off the front post
    for t in range(3):
        sh = iso.p(xi, IDLE_Y[t] - FC_SEAT, z1)
        o.append(line((sh[0] - 9, sh[1]), (sh[0] + 9, sh[1]), STEEL, 4.0))

    # ---- short leaders on the picture ------------------------------------
    o.append(txt((500, 176), "REAR  —  THE DRIVE STATION", 12.5, MECH, "start", "700"))
    for i, s2 in enumerate([
            'post 50 × 50 × 5, floor to 90", one each side — it IS the gantry',
            'drive-roller centres 10.8 / 33.8 / 56.8" — tops FLUSH with the pan',
            'line shaft 82.3"  ·  top member top face 87.3"',
            '428 chain on 38T plates  ·  0.37 kW gearmotor on the post at 84"',
            'TIERS 2–3 discharge: hopper → 100 mm channel → TWO-TIER chute',
            '   → the AISLE TRAY, spout 250 mm above its floor']):
        o.append(txt((500, 198 + i * 18), "·  " + s2, 11, MUTED))
    for i, s2 in enumerate([
            "·  ★ TIER 1: NO CHUTE, NO HOPPER, NO CHANNEL.",
            "   It falls FREE at 305 mm onto ITS OWN tray",
            "   under the rear of the row — 1.0 × 0.6 m,",
            '   x = 2–26", behind a THREE-SIDED SHROUD,',
            "   open rearward only  (R7 / D105)"]):
        o.append(txt((500, 306 + i * 17), s2, 11, MECH, "start", "700"))
    o.append(line((760, 262), iso.p(xd, D["post_h"], z1), MECH, 0.9, dash="3 3"))

    o.append(txt((150, 616), "FRONT  —  THE IDLER AND THE TAKE-UP", 12.5, WATER,
                 "start", "700"))
    for i, s2 in enumerate([
            'idler centre 8" beyond the front cage leg',
            'idler centres 11.8 / 34.8 / 57.8" — 25 mm ABOVE the drive roller,',
            '   because the pan is PACKED UP 25 mm at THIS frame',
            'bearings on a 150 mm shelf of 50 × 50 × 5 welded FLAT',
            'take-up slots ALONG the row, 95 mm centres, 60 mm of travel',
            'the water is all at THIS frame: bucket, two drops, six inlets']):
        o.append(txt((150, 638 + i * 18), "·  " + s2, 11, MUTED))
    o.append(line((196, 604), iso.p(xi, IDLE_Y[0], 16), WATER, 0.9, dash="3 3"))

    o.append(lead(iso.p(xd + 3.6, 6, z1 + 9.0), (846, 742),
                  "TWO TRAYS PER ROW  —  1.2 m AISLE, 1.0 m TIER 1",
                  MANURE, 10.5, "700", "end"))

    # ---- the row make-up, as a straight measuring strip -------------------
    o.append(txt((120, 812), "ROW MAKE-UP  —  a straight measuring strip, not the view above",
                 12, INK, "start", "700"))
    sx, scale, yb = 150, 2.40, 862
    marks = [0, 72, 144, 216, 264]
    o.append(line((sx, yb), (sx + 264 * scale, yb), MUTED, 1.2))
    for m in marks:
        X = sx + m * scale
        o.append(line((X, yb - 8), (X, yb + 8), MUTED, 1))
        o.append(txt((X, yb + 24), f'{m}"', 10.5, MUTED, "middle"))
    for i in range(4):
        a = sx + marks[i] * scale
        b = sx + marks[i + 1] * scale
        lab = '6 ft set  (3 × 24" cells)' if i < 3 else '4 ft half-set  (2 cells)'
        o.append(txt(((a + b) / 2, yb - 16), lab, 10.5, INK if i < 3 else MECH,
                     "middle", "700"))
    o.append(txt((sx + 264 * scale / 2, yb + 48),
                 'row 22 ft (264") leg to leg  ·  5 frames  ·  11 cells per side  ·  '
                 'C = 286" roller centre to centre', 12, INK, "middle", "700"))

    lg, _ = legend(150, 950, [
        (PAN_F, "pan — 1 mm galvanised, on 40 × 40 × 3 cross-bars"),
        (BELT_F, "belt — site-cut HDPE, 770 mm wide, running ON the pan"),
        (CAGE_F, "cage — 12 mm rod and mesh"),
        (MECH, "drive — rollers, 38T plates, 428 drop chain, gearmotor"),
        (MANURE, "hopper and channel (tiers 2–3) · chute · tier 1's free fall"),
        ("#eef4f8", "the TWO catch trays — one in the aisle, one under the rear"),
    ])
    o.append(lg)

    # ---- D53's three checks, on every sheet that shows an upright (D110) --
    o.append(txt((150, 1086), "★ D53 — THE THREE CHECKS ON EVERY UPRIGHT", 11.5, MECH,
                 "start", "700"))
    for i, s3 in enumerate([
            "1 · The face looking at the belt is an OUTSIDE face — never the inside of "
            "the L.    2 · The HEEL points at the belt.",
            "3 · The BEARING LEG reaches into the aisle.  The two uprights of a frame are "
            "MIRROR IMAGES, heels facing each other.",
            "Turn one round and the body moves INBOARD — it eats belt width and puts "
            "the water drop's nook inside the belt zone."]):
        o.append(txt((150, 1106 + i * 16), s3, 10.5, MUTED if i < 2 else MECH,
                     "start", "700" if i == 2 else "400"))

    # ================= right-hand column ==================================
    px, pw = 860, 900
    o.append(panel(px, 100, pw, 290, "Row facts for the welder"))
    rows = [
        ("Frames", '5 per row, at 0 / 72 / 144 / 216 / 264"'),
        ("Uprights", '50 × 50 × 5 angle, cut 78"  ·  drive-station posts cut 90"'),
        ("Pan cross-bars", '40 × 40 × 3, horizontal leg ON TOP, seats 12 / 35 / 58" DEAD LEVEL'),
        ("Pan", "1 mm galvanised, formed in ~6 ft sections, packed up 25 mm at the front"),
        ("Belt run C", f'{C_CTRS:.0f}" roller centre to centre = {C_CTRS*25.4/1000:.3f} m'),
        ("Belt loop", f"{BELT_LOOP_M:.2f} m per tier → cut 15.5 m of site-cut HDPE"),
        ("Front end", 'idler 8" beyond the leg, on a 150 mm welded-flat shelf'),
        ("Rear end", 'drive roller 14" beyond the leg, grooved lagging'),
        ("Drive", "38T 428 plates, one drop chain per station, one gearmotor per two rows"),
        ("Fall", "packed INTO the pan — 25 mm at the front to zero at the rear, ~1:270"),
        ("Water", 'SIX nipple lines — two per tier at 28 / 51 / 74", each 180 mm '
                  'inboard of a belt edge'),
    ]
    yy = 148
    for a, b in rows:
        o.append(txt((px + 22, yy), a, 11.5, INK, "start", "700"))
        o.append(txt((px + 170, yy), b, 11.5, MUTED))
        yy += 21

    # ---- the two ends, in heights ----------------------------------------
    o.append(panel(px, 410, pw, 480, "THE TWO ENDS, IN HEIGHTS  —  looking along the row"))
    ES = 3.5
    for which, ox2 in (("front", 990), ("rear", 1390)):
        fe = Flat(ES, ox2, 820)
        rear = which == "rear"
        htop = D["post_h"] if rear else D["upright"]
        # ground
        o.append(line(fe.p(-6, 0), fe.p(8, 0), INK, 2.0))
        # the vertical member
        o.append(rect(fe.p(-1, htop), 2 * ES, htop * ES, fill="#cfd5dd", col=STEEL, sw=1.4))
        o.append(txt(fe.p(0, htop + 3.8), ('post cut 90"' if rear else 'upright cut 78"'),
                     10, STEEL, "middle", "700"))
        # the THREE keep-out bands
        for ka, kb in KEEPOUT:
            o.append(rect(fe.p(-4, kb), 12 * ES, (kb - ka) * ES,
                          fill="#f7d9d5", col="none", sw=0, op=0.7))
        for t in range(3):
            seat = PAN[t]
            surf = (seat + PAN_T) if rear else PAN_SURF_F[t]
            ctr = ROLL_Y[t] if rear else IDLE_Y[t]
            # pan cross-bar + pan surface
            o.append(rect(fe.p(-3, seat + LEG40), 6 * ES, LEG40 * ES,
                          fill="#b9c1cb", col=STEEL, sw=1.1))
            o.append(line(fe.p(-3.4, surf), fe.p(4.4, surf), PAN_L, 2.2))
            # roller
            o.append(circ(fe.p(0, ctr), D["roller_d"] / 2 * ES, fill="#f2c9c4",
                          col=MECH, w=1.6))
            if not rear:        # the take-up shelf, welded FLAT
                o.append(line(fe.p(-2.6, ctr - FC_SEAT), fe.p(2.6, ctr - FC_SEAT),
                              STEEL, 3.6))
            else:               # 38T plate outboard
                o.append(circ(fe.p(0, ctr), D["spr_od"] / 2 * ES * 0.72, fill="none",
                              col=MECH, w=1.2))
            # cage floor and top
            o.append(line(fe.p(-3, FLOOR[t]), fe.p(4, FLOOR[t]), STEEL12, 1.8))
            o.append(line(fe.p(-3, TOP[t]), fe.p(4, TOP[t]), STEEL12, 1.4))
            for un in (0.9, 2.6):      # TWO nipple lines per tier, one per cage side
                o.append(circ(fe.p(un, NIPPLE[t]), 2.0, fill="#dff1fa", col=WATER, w=1.2))
            # ONE label line per tier, all three numbers together
            lab = ('seat %d"  ·  surface %.2f"  ·  DRIVE %.1f"' % (seat, surf, ctr)
                   if rear else
                   'seat %d"  ·  surface %.1f"  ·  IDLER %.1f"' % (seat, surf, ctr))
            o.append(line(fe.p(4.6, ctr), fe.p(8.4, ctr), MECH, 0.8, dash="3 3"))
            o.append(txt(fe.p(8.8, ctr - 0.6), lab, 9.5, MECH, "start", "700"))
        if rear:
            o.append(circ(fe.p(0, LINE_Y_C), 1.2 * ES, fill="#b9c1cb", col=STEEL, w=1.6))
            o.append(circ(fe.p(0, LINE_Y_C), D["spr_od"] / 2 * ES * 0.72, fill="none",
                          col=MECH, w=1.2))
            o.append(txt(fe.p(4.6, LINE_Y_C - 0.6), 'LINE SHAFT 82.3"', 9.5, STEEL,
                         "start", "700"))
            o.append(rect(fe.p(-1.6, GANTRY_Y_C + LEG50), 3.2 * ES, LEG50 * ES,
                          fill="#b9c1cb", col=STEEL, sw=1.3))
            o.append(txt(fe.p(4.6, GANTRY_Y_C + 1.2), 'top member, top face 87.3"',
                         9.5, STEEL, "start", "700"))
            # the drop chain, down the outboard face
            for dpx in (-3.0, 3.0):
                a = fe.p(0, LINE_Y_C)
                b = fe.p(0, ROLL_Y[0])
                o.append(line((a[0] + dpx, a[1]), (b[0] + dpx, b[1]), MECH, 1.4))
            o.append(txt(fe.p(-4.4, 4), "428 chain", 9.5, MECH, "end", "700"))
        else:
            o.append(line(fe.p(2.8, NIPPLE[2]), fe.p(5.0, NIPPLE[2] - 1.6),
                          WATER, 0.8, dash="3 3"))
            o.append(txt(fe.p(5.4, NIPPLE[2] - 1.2), 'nipple lines 74 / 51 / 28"  ·  '
                         '2 per tier', 9.5, WATER, "start", "700"))
            o.append(txt(fe.p(-4.4, 4), "shelf, welded FLAT", 9.5, STEEL, "end", "700"))
        o.append(txt(fe.p(0, -3.4), ("REAR  —  DRIVE STATION" if rear
                                     else "FRONT  —  IDLER FRAME"),
                     11, INK, "middle", "700"))
    o.append(txt((px + 22, 866), 'Shaded: the THREE KEEP-OUT BANDS, ' + KEEPOUT_TAPE +
                 '.  The pan and its roller live in them — NOTHING ELSE goes in, ever: '
                 'no pipe, no hose, no bracket.', 10.5, MECH, "start", "700"))

    # ---- what the two ends do differently --------------------------------
    o.append(rect((px, 910), pw, 236, fill="#fbfcfd", col=FAINT, sw=1, r=6))
    o.append(txt((px + 20, 936), "WHAT DECIDES EACH END", 12.5, INK, "start", "700"))
    yy = 960
    for a, b in [
        ("The pan is the datum, not the table",
         'Set the cross-bars off a string line at 12 / 35 / 58" top face, lay the pan, '
         'THEN take every bearing height off the pan you have actually fitted. The belt '
         'runs ON the pan and wraps over the TOP of the roller, so the roller top is FLUSH '
         'with the pan surface and the centre sits one radius — 31.5 mm — below it.'),
        ("The 25 mm of front packing is why the two ends differ",
         'The cross-bars are dead level at all five frames; the FALL is packed into the pan, '
         '25 mm at the front tapering to zero at the rear. So the pan surface — and with it '
         'the idler centre — is 25 mm higher at the front than at the rear.'),
        ("The drive end is FIXED; the front end takes up",
         'All the take-up is at the front: slots ALONG the row in the shelf, 95 mm centres, '
         '60 mm of travel, with a spring. HDPE moves ~31 mm per 10 °C house swing, so a '
         'fixed screw will not hold it.'),
        ("★ ISOLATE AND PADLOCK before any hand goes near the row",
         'The isolator is on the rear end face of the half, in sight of all six belts. '
         'Never scoop, clear a chute or touch a tray during a pass (D78).'),
    ]:
        o.append(txt((px + 20, yy), "•  " + a, 11, INK, "start", "700"))
        t, yy = wrap(px + 34, yy + 15, pw - 60, b, 10.5, 14)
        o.append(t)
        yy += 6

    write("manure-belt-REVC-2-row.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 3 -- the whole house: 2 halves x 2 rows
# ============================================================================
def drawing_house():
    """The house plan: one open pen on two RC columns, one central aisle, the door
    at the centre of the front wall, and a floor catch tray per row."""
    W, H = 1940, 1810
    o = [header(W, "3 · THE WHOLE HOUSE  —  4 double rows, 12 belts",
                "One open pen on two RC columns at the equal thirds · ONE 6 ft central "
                "aisle with the door at its centre · TWO floor catch trays per row — one "
                "in the aisle for tiers 2–3 at 1.2 m, one under the rear for tier 1 "
                "at 1.0 m.",
                rev=REVC, strap=STRAP_C)]

    S = 2.55
    fl = Flat(S, 100, 230, flip_y=False)
    PW = D["pen_w"]
    A, AM, RF = D["aisle"], D["aisle_mid"], D["row_foot"]

    # ---- band schedule across the house ---------------------------------
    sched = [("wall", A), ("row", RF), ("mach", A), ("row", RF),
             ("mid", AM), ("row", RF), ("mach", A), ("row", RF), ("wall", A)]
    bands, row_z, z = [], [], 0.0
    for kind, wd in sched:
        bands.append((kind, z, wd))
        if kind == "row":
            row_z.append(z)
        z += wd

    XLEG_F, XLEG_R = 14.0, 14.0 + D["row_len"]         # 14 / 278
    XIDL = XLEG_F - D["front_off"]                     # 6
    XDRV = XLEG_R + D["rear_off"]                      # 292: roller = post = chain plane
    XHOP0, XHOP1 = XLEG_R + 16, XLEG_R + 26            # 294 / 304  discharge hopper
    ZCOL = PW / 2                                      # 171: columns on the house centreline
    COL_X = [D["pen_len"] / 3, D["pen_len"] * 2 / 3]    # 109 / 218  (D85)
    XTRAY = (XHOP0 + XHOP1) / 2 - D["tray_l"] / 2      # tray centred under the chute spout

    # ---- the shell + the duty of each aisle ------------------------------
    o.append(rect(fl.p(0, 0), D["pen_len"] * S, PW * S, fill="#fafbfc", col=INK, sw=2))
    for kind, z0, wd in bands:
        if kind == "row":
            continue
        fillc = {"wall": "#fbfbfc", "mach": "#fdf1ef", "mid": "#f3f8fb"}[kind]
        o.append(rect(fl.p(0, z0), D["pen_len"] * S, wd * S, fill=fillc, col="none", sw=0))

    # ---- the four rows ---------------------------------------------------
    clean_lo = [True, False, True, False]   # which side the chute, tray and bucket go
    for i, zr in enumerate(row_z):
        lo, hi = zr, zr + RF
        zc = zr + RF / 2
        zclean = lo if clean_lo[i] else hi
        zmach = hi if clean_lo[i] else lo
        sg = -1 if clean_lo[i] else +1      # sign from the row INTO the clean aisle

        o.append(rect(fl.p(XLEG_F, lo), D["row_len"] * S, RF * S,
                      fill=CAGE_F, col=CAGE_L, sw=1.4))
        o.append(rect(fl.p(XLEG_F, zr + (RF - D["belt_w"]) / 2),
                      D["row_len"] * S, D["belt_w"] * S,
                      fill=BELT_F, col=BELT_L, sw=0.9, op=0.55))
        o.append(line(fl.p(XLEG_F, zc), fl.p(XLEG_R, zc), CAGE_L, 0.8, dash="6 4"))
        for c in range(1, CELLS_SIDE):
            X = fl.p(XLEG_F + c * D["cell"], lo)[0]
            o.append(line((X, fl.p(0, lo)[1]), (X, fl.p(0, hi)[1]), CAGE_L, 0.4, op=0.5))
        o.append(line(fl.p(XIDL, lo + 1), fl.p(XIDL, hi - 1), MECH, 3))          # idler
        o.append(line(fl.p(XDRV, lo - 1.2), fl.p(XDRV, hi + 1.2), MECH, 5))      # drive roller
        o.append(txt(fl.p((XLEG_F + XLEG_R) / 2, zc + 7.5), f"ROW {i+1}", 12.5,
                     CAGE_L, "middle", "700"))

        # ---- water: a BUCKET at the front frame, TWO drops in the angle nooks,
        # then SIX nipple lines -- two per tier, each 180 mm inboard of a belt
        # edge.  Every horizontal run is at 28 / 51 / 74", so nothing sits in a
        # keep-out band (12-17", 31-40", 54-63").
        zbelt0, zbelt1 = lo + (RF - D["belt_w"]) / 2, hi - (RF - D["belt_w"]) / 2
        for zn in (zbelt0 + mm(NIP_IN_MM), zbelt1 - mm(NIP_IN_MM)):
            o.append(line(fl.p(XLEG_F, zn), fl.p(XLEG_R, zn), WATER, 2.0, dash="7 4"))
        for zd in (lo + 1, hi - 1):                  # the drops, in the angle nooks
            o.append(circ(fl.p(XLEG_F, zd), 3.2, fill="#dff1fa", col=WATER, w=1.6))
            o.append(line(fl.p(XLEG_F, zd), fl.p(XLEG_F + 3, zd), WATER, 1.6))
        bk = fl.p(XLEG_F + 6, zclean + sg * 5)       # the bucket, on its own holder
        o.append(rect((bk[0] - 9, bk[1] - 9), 18, 18, fill="#dff1fa", col=WATER,
                      sw=1.8, r=3))
        o.append(line(fl.p(XLEG_F + 6, zclean + sg * 5), fl.p(XLEG_F, zclean + sg * 1),
                      WATER, 1.6))
        o.append(line(fl.p(XLEG_F + 6, zclean + sg * 5), fl.p(XLEG_F, zmach - sg * 1),
                      WATER, 1.2, dash="4 3"))

        # ---- TIER 1's OWN TRAY, under the REAR of the row (R7 / D105) -------
        # 1.0 m ACROSS the row (R7(b) / D112), 0.6 m along it, x = 2-26" -- clear
        # of the 23" access floor.  Drawn first so the machinery and the chute
        # read above it.
        t1x0, t1x1 = XLEG_R + D["t1_x0"], XLEG_R + D["t1_x1"]
        t1z0, t1z1 = zc - D["t1_tray_l"] / 2, zc + D["t1_tray_l"] / 2
        o.append(rect(fl.p(t1x0, t1z0), (t1x1 - t1x0) * S, D["t1_tray_l"] * S,
                      fill="#eef4f8", col=STEEL, sw=1.8, r=2))
        o.append(vtxt(fl.p((t1x0 + t1x1) / 2 - 4.4, zc), "TIER-1 TRAY", 9.5, STEEL,
                      "middle", "700"))
        o.append(vtxt(fl.p((t1x0 + t1x1) / 2 - 8.2, zc), "1.0 × 0.6 m", 9, MUTED,
                      "middle", "600"))
        # machinery side: the drop-chain plane and its mesh enclosure
        ze = zmach - sg * 6
        o.append(rect(fl.p(XDRV - 3, min(ze, zmach)), 6 * S, 6 * S,
                      fill="#f6d8d4", col=MECH, sw=1.2))
        o.append(circ(fl.p(XDRV, zmach - sg * 3), 5.0, fill="#f2c9c4", col=MECH, w=1.5))

        # ---- CATCH TRAY on the aisle floor, under the one spout (D77) --------
        # drawn BEFORE the hopper and chute so the chute reads as being above it
        OVH = D["t1_ovh_mm"] / 25.4          # 68 mm of tier-1 rim past the frame line
        ztr = (zclean + OVH) if sg > 0 else (zclean - OVH - D["tray_w"])
        o.append(rect(fl.p(XTRAY, ztr), D["tray_l"] * S, D["tray_w"] * S,
                      fill="#eef4f8", col=STEEL, sw=1.8, r=2))
        o.append(rect(fl.p(XTRAY + D["tray_l"] * 2 / 3, ztr + 0.8),
                      D["tray_l"] / 3 * S, (D["tray_w"] - 1.6) * S,
                      fill="#dff1fa", col=WATER, sw=1.0, op=0.85))
        o.append(txt(fl.p(XTRAY + 15, ztr + D["tray_w"] / 2 - 1.8),
                     "AISLE TRAY", 10.5, STEEL, "middle", "700"))
        o.append(txt(fl.p(XTRAY + 15, ztr + D["tray_w"] / 2 + 2.8),
                     "tiers 2–3  ·  1.2 × 0.6 m", 9.5, MUTED, "middle"))
        o.append(txt(fl.p(XTRAY + D["tray_l"] * 5 / 6, ztr + D["tray_w"] / 2 + 0.8),
                     "LOW", 9.5, WATER, "middle", "700"))
        o.append(line(fl.p(XTRAY, ztr - sg * 0.2), fl.p(XTRAY, ztr + D["tray_w"]),
                      STEEL, 3.4))
        # clean side: full-width hopper, 150 mm of cross-fall into a 100 mm channel
        o.append(rect(fl.p(XHOP0, lo + 0.4), (XHOP1 - XHOP0) * S, (RF - 0.8) * S,
                      fill="#e7ded3", col=MANURE, sw=1.2))
        o.append(line(fl.p(XHOP0 + 1, zmach), fl.p(XHOP1 - 1, zclean), MANURE, 1.0,
                      dash="4 3"))
        zch = zclean if sg > 0 else zclean - 7
        o.append(rect(fl.p(XHOP0, zch), (XHOP1 - XHOP0) * S, 7 * S,
                      fill=MANURE, col=INK, sw=1.3, op=0.6))

    # ---- line shafts, propshaft, gearmotors, isolators --------------------
    for k in (0, 2):
        za, zb = row_z[k] + RF, row_z[k + 1]
        # overhead line shafts + the propshaft, all at 85", all one axis
        o.append(line(fl.p(XDRV + 5.5, row_z[k] - 3), fl.p(XDRV + 5.5, row_z[k + 1] + RF + 3),
                      STEEL, 1.6, dash="9 5"))
        o.append(rect(fl.p(XDRV + 2, za + 1), 7 * S, (zb - za - 2) * S,
                      fill="none", col=MECH, sw=1.4, r=2))
        o.append(line(fl.p(XDRV + 5.5, za + 2), fl.p(XDRV + 5.5, zb - 2), MECH, 5.0))
        o.append(lead((fl.p(XDRV + 5.5, (za + zb) / 2)), fl.p(252, (za + zb) / 2),
                      "PROPSHAFT + trough", MECH, 11, "700", "end"))
        # gearmotor pedestal on the post of the row that faces the central aisle
        gz = zb - 6 if k == 0 else za + 6
        gp = fl.p(XDRV + 13, gz)
        o.append(rect((gp[0] - 9, gp[1] - 14), 18, 28, fill="#f6d8d4", col=MECH, sw=1.7, r=2))
        o.append(lead((gp[0] - 9, gp[1]), fl.p(252, za + 4.5),
                      "GEARMOTOR on the post", MECH, 11, "700", "end"))
        # lockable isolator, rear end face, in sight of all six belts of the half
        ip = fl.p(D["pen_len"] - 3, (za + zb) / 2)
        o.append(rect((ip[0] - 6, ip[1] - 12), 12, 24, fill="#ffe9a8", col=INK, sw=1.3, r=2))
        o.append(lead((ip[0] - 6, ip[1]), fl.p(252, zb - 4.5),
                      "LOCKABLE ISOLATOR", INK, 11, "700", "end"))

    # ---- the two RC columns, the control board, the earth rod -------------
    hs = D["col_sq"]
    for cx in COL_X:
        o.append(rect(fl.p(cx - hs / 2, ZCOL - hs / 2), hs * S, hs * S,
                      fill="#c9ced6", col=INK, sw=1.8))
        for t in range(1, 5):
            q = t * hs / 5
            o.append(line(fl.p(cx - hs / 2, ZCOL - hs / 2 + q),
                          fl.p(cx - hs / 2 + q, ZCOL - hs / 2), "#8f97a3", 0.7))
            o.append(line(fl.p(cx + hs / 2 - q, ZCOL + hs / 2),
                          fl.p(cx + hs / 2, ZCOL + hs / 2 - q), "#8f97a3", 0.7))
    # caption for the columns, set in the clear strip between trays 2 and 3
    o.append(txt(fl.p(234, 166), "RC COLUMNS ~2 ft square", 10.5, INK, "start", "700"))
    o.append(txt(fl.p(234, 174), 'equal thirds — 109" / 218" (D85)', 10.5, INK,
                 "start", "700"))
    # the board, on the front-facing flat face of the FIRST column, just inside the door
    cbx = COL_X[0] - hs / 2
    o.append(rect(fl.p(cbx - 3.2, ZCOL - 10), 3.2 * S, 20 * S,
                  fill="#ffe9a8", col=INK, sw=1.6))
    o.append(line(fl.p(cbx - 3.2, ZCOL + 9), fl.p(50, ZCOL + 9.5), INK, 0.9, dash="3 3"))
    o.append(txt(fl.p(6, ZCOL + 16), "CONTROL BOARD — first column, just inside the door",
                 11, INK, "start", "700"))
    o.append(txt(fl.p(6, ZCOL + 23), "25 mm standoffs · chest height · GLANDS DOWN · "
                                     "earth rod ≤50 Ω", 10, MUTED))
    ep = fl.p(COL_X[0] + hs / 2 + 5, ZCOL + 5)
    o.append(line((ep[0], ep[1] - 9), (ep[0], ep[1] + 6), "#2f6b4f", 2.4))
    for k in range(3):
        o.append(line((ep[0] - 7 + k * 2.4, ep[1] + 6 + k * 3.6),
                      (ep[0] + 7 - k * 2.4, ep[1] + 6 + k * 3.6), "#2f6b4f", 1.8))

    # ---- aisle labels ----------------------------------------------------
    for kind, z0, wd in bands:
        if kind == "row":
            continue
        zc = z0 + wd / 2
        if kind == "mach":
            o.append(txt(fl.p(70, zc - 3.0), 'MACHINERY AISLE  33"', 11.5,
                         MECH, "middle", "700"))
            o.append(txt(fl.p(70, zc + 4), 'both drop chains · propshaft over at 85"',
                         10.5, MECH, "middle"))
        elif kind == "mid":
            o.append(txt(fl.p(6, z0 + 12.0), 'CENTRAL AISLE  72.7" (6 ft)  —  33.33 + 6 '
                                            '+ 33.33, ONE shared aisle', 11.5, INK,
                         "start", "700"))
            o.append(txt(fl.p(6, z0 + 20.0), "DOOR AT THE CENTRE OF THE FRONT WALL, on "
                                             "the column plane", 10.5, WATER,
                         "start", "700"))
        else:
            o.append(txt(fl.p(70, zc), 'WALL AISLE  33"  ·  chute + catch tray + '
                         'the water bucket',
                         11.5, MUTED, "middle", "600"))

    # ---- door: CENTRE of the front wall, on the column plane -------------
    dw = 30.0                       # leaf width NOT dimensioned in the doc -- indicative
    dz = ZCOL - dw / 2
    o.append(rect(fl.p(-3, dz), 8, dw * S, fill=WATER, col=WATER, sw=1))
    o.append(path(f"M {f(fl.p(0, dz)[0])} {f(fl.p(0, dz)[1])} "
                  f"a {f(dw*S)} {f(dw*S)} 0 0 1 {f(dw*S)} {f(dw*S)}",
                  fill="none", col=WATER, w=1.0))
    o.append(line(fl.p(0, dz), fl.p(dw, dz), WATER, 1.6, dash="5 4"))
    o.append(txt((fl.p(0, dz)[0] - 12, fl.p(0, ZCOL)[1] - 5), "DOOR", 12.5,
                 WATER, "end", "700"))
    o.append(txt((fl.p(0, dz)[0] - 12, fl.p(0, ZCOL)[1] + 11), "at the CENTRE", 10.5,
                 MUTED, "end"))

    # ---- dimensions ------------------------------------------------------
    o.append(txt(fl.p(D["pen_len"] / 2, -41), 'PEN LENGTH  27 ft 3 in  (327")',
                 13.5, INK, "middle", "700"))
    o.append(dim_h(fl.p(0, 0)[0], fl.p(D["pen_len"], 0)[0], fl.p(0, -30)[1], "", MUTED))
    o.append(dim_h(fl.p(XLEG_F, 0)[0], fl.p(XLEG_R, 0)[0], fl.p(0, -18)[1],
                   'cage run 22 ft (264")', CAGE_L, 11.5))
    o.append(dim_h(fl.p(XIDL, 0)[0], fl.p(XDRV, 0)[0], fl.p(0, -5)[1],
                   'C = 286" roller centres', MECH, 11.5))
    o.append(txt(fl.p(10, PW + 12), 'front 14"', 11, WATER, "middle", "600"))
    o.append(txt(fl.p(230, PW + 12), 'rear 49":  drive roller at 14", then 23" of '
                                     'UNCONTESTED access floor', 11, MECH,
                 "middle", "600"))
    o.append(txt(fl.p(230, PW + 19), "— nothing parked, nothing turns (D79)", 11, MECH,
                 "middle", "600"))
    o.append(txt(fl.p(190, PW + 28), "NO REAR DOOR (D92) — exactly ONE opening, at the "
                                     "front centre", 11, WATER, "middle", "700"))
    o.append(dim_v(fl.p(D["pen_len"] + 5, 0)[0], fl.p(0, 0)[1], fl.p(0, PW)[1], "", INK))
    o.append(vtxt((fl.p(D["pen_len"] + 5, 0)[0] + 30, fl.p(0, PW / 2)[1]),
                  'HOUSE 342"  —  ONE OPEN PEN', 11.5, INK, "middle", "700"))
    # ---- the column pass, dimensioned on the rear column (D87) -----------
    zmid0, zmid1 = row_z[1] + RF, row_z[2]
    xc2 = COL_X[1]
    for zz in (zmid0, ZCOL - hs / 2, ZCOL + hs / 2, zmid1):
        o.append(line(fl.p(xc2 - hs / 2 - 34, zz), fl.p(xc2 - hs / 2 + 2, zz),
                      MUTED, 0.8, dash="3 3"))
    dvx = fl.p(xc2 - hs / 2 - 30, 0)[0]
    for z_a, z_b, lab in ((zmid0, ZCOL - hs / 2, '24.3" pass'),
                          (ZCOL - hs / 2, ZCOL + hs / 2, '24" column'),
                          (ZCOL + hs / 2, zmid1, '24.3" pass')):
        ya, yb = fl.p(0, z_a)[1], fl.p(0, z_b)[1]
        o.append(dim_v(dvx, ya, yb, '', MUTED))
        o.append(txt((dvx - 8, (ya + yb) / 2 + 4), lab, 11, MUTED, "end", "600"))

    # ================= right-hand column ==================================
    px, pw = 1020, 880
    o.append(panel(px, 100, pw, 372, "The whole thing in numbers"))
    rows = [
        ("Rows / tiers", "4 double (2 per half) · 3 tiers"),
        ("Aisles", '33" wall · 33" MACHINERY · 72.7" central, shared'),
        ("Row length", "22 ft — 3 × 6 ft sets + 1 × 4 ft"),
        ("Cells", f'{CELLS_SIDE} per side × 2 × 3 tiers × 4 rows = {CELLS_SIDE*2*3*4}'),
        ("Birds", f"{CAPACITY:,} pullets at 8/cell to 13 weeks"),
        ("Belt modules", "12  (one per tier per row)"),
        ("C, roller centres", f'{C_CTRS:.0f}" = {C_CTRS*25.4/1000:.3f} m'),
        ("Belt loop", f"{BELT_LOOP_M:.2f} m per module → cut 15.5 m"),
        ("Belt material", "1.0 mm HDPE / LLDPE geomembrane, site-cut"),
        ("Rollers", "24 · Ø63 × 3 tube on 3 discs · 48 × UCP204"),
        ("Drive", "2 gearmotors — one per half, 0.37 kW 4-pole DOL, 6 belts each"),
        ("Discharge", f'{D["trays"]} catch trays — TWO per row: 4 × 1.2 × 0.6 m in '
                      f'the aisle, 4 × 1.0 × 0.6 m at tier 1 → 20 L rubbers'),
        ("Hoppers / channels", f'{D["hoppers"]} — tiers 2 and 3 only.  '
                               f'Tier 1 has none (R7)'),
        ("Top tier floor", '63" (5 ft 3 in) — reachable standing'),
        ("Openings", "ONE — the central front door.  NO rear door (D92)"),
    ]
    yy = 148
    for a, b in rows:
        o.append(txt((px + 22, yy), a, 12, INK, "start", "700"))
        o.append(txt((px + 200, yy), b, 12, MUTED))
        yy += 22

    # ---- water routing ---------------------------------------------------
    o.append(rect((px, 494), pw, 156, fill="#f2f9fc", col="#cfe4ee", sw=1, r=6))
    o.append(txt((px + 20, 520), "WATER ROUTING  (drawn schematically on the plan)",
                 12.5, WATER, "start", "700"))
    for i, s2 in enumerate([
        "A BUCKET on its OWN HOLDER at each row's front frame — the holder stands on the "
        "floor and carries the water; the cage angle carries none of it.",
        "ONE T off the bucket, then TWO pipes — one per side. Each DROPS INSIDE THE L of "
        "its angle upright, so it takes no aisle width anywhere.",
        "THREE Ts per side, one per tier: SIX INLETS PER ROW, and TWO nipple lines per "
        "tier — one per cage side, each 180 mm inboard of a belt edge.",
        'Every horizontal run is at 28 / 51 / 74". THREE keep-out bands: 12–17", 31–40", '
        '54–63" — nothing water-related in any of them.',
    ]):
        t2, _ = wrap(px + 20, 546 + i * 26, pw - 44, "·  " + s2, 10.5, 13)
        o.append(t2)

    # ---- one machinery aisle per half ------------------------------------
    o.append(rect((px, 672), pw, 140, fill="#f2f8f4", col="#cfe4d8", sw=1, r=6))
    o.append(txt((px + 20, 698), "ONE MACHINERY AISLE PER HALF, AND WHY THE DISCHARGE "
                                 "TURNS  (R1 / D79)", 12.5, "#2f6b4f", "start", "700"))
    t, _ = wrap(px + 20, 724, pw - 44,
                'Each half gets one dirty aisle and two clean ones. Both of that half\'s drop '
                'chains face into the 33" between-rows aisle and the propshaft trough runs '
                'over it at 85". Row 1\'s chute and aisle tray stand in the wall aisle, row '
                '2\'s in the 72.7" central aisle; every row\'s TIER-1 tray stands under the '
                'rear of the row itself. The 90° turn is set by the LABOURER: to scoop he '
                'must crouch FACING the tray, which needs ~600 mm of knee room beyond it, '
                'and behind the row there is only 584 mm in total. In the aisle he has 22 ft. '
                'It also keeps the crouching man off the sprocket face, which is what '
                'resolves R4.', 11, 16)
    o.append(t)

    # ---- the aisle floor: working room -----------------------------------
    o.append(rect((px, 832), pw, 150, fill="#fbfcfd", col=FAINT, sw=1, r=6))
    o.append(txt((px + 20, 858), "THE AISLE FLOOR — WORKING ROOM  (D79 / D87)",
                 12.5, INK, "start", "700"))
    yy = 884
    for s3 in [
        "The tray is packed up 60 mm at ONE end → 1:20 fall; the liquid gathers in the "
        "LOW third and comes out first.",
        "Scoop from the ENDS — that is where the 600 mm of knee room is, in the aisle "
        "and not behind the row.",
        'A 33" aisle carries 68 mm of tier-1 overhang, the 0.6 m tray and ~170 mm of '
        "standing strip — and he scoops from the tray's ENDS, not from beside it.",
        "Column pass 617 mm: a man with ONE rubber goes past, or two men in single "
        "file. Two ways past every column.",
    ]:
        t, yy = wrap(px + 20, yy, pw - 44, "·  " + s3, 11, 16)
        o.append(t)
        yy += 6

    lg, _ = legend(px + 22, 1012, [
        (CAGE_F, "cage footprint"), (BELT_F, "belt"),
        (MECH, "drive — roller, drop chain, propshaft, gearmotor"),
        (MANURE, "discharge hopper (tiers 2–3) + the TWO-TIER combining chute"),
        ("#eef4f8", "the TWO catch trays per row (light blue = the liquid third)"),
        ("#c9ced6", "reinforced-concrete column"),
        ("#ffe9a8", "control board / lockable isolator"),
        (WATER, "water — bucket, the two drops, six nipple lines, door"),
    ])
    o.append(lg)

    # ---- D53's three checks, on every sheet that shows an upright (D110) --
    o.append(txt((100, 1216), "★ D53 — THE THREE CHECKS ON EVERY UPRIGHT, AND THEY "
                              "DECIDE WHERE THE WATER GOES", 12, MECH, "start", "700"))
    for i, s3 in enumerate([
            "1 · The face looking at the belt is an OUTSIDE face — never the inside of "
            "the L.    2 · The HEEL points at the belt.",
            "3 · The BEARING LEG reaches into the aisle.  At every frame the two uprights "
            "are MIRROR IMAGES, heels facing each other.",
            "Turn one round and the angle body moves INBOARD — it eats belt width, the "
            "bearings face the cages, and the nook that carries the water drop ends up "
            "inside the belt zone."]):
        o.append(txt((100, 1238 + i * 16), s3, 10.5, MUTED if i < 2 else MECH,
                     "start", "700" if i == 2 else "400"))

    # ================= 3-D impression =====================================
    o.append(txt((100, 1330), "3-D impression  —  ONE HALF: two rows, the machinery aisle "
                              "between them, and the open middle", 14, INK, "start", "700"))
    o.append(txt((100, 1352), 'The drive-station posts run to 90" and carry the line shafts '
                              'at 85"; the propshaft crosses the machinery aisle.',
                 11.5, MUTED))
    iso = Iso(1.38, 350, 1510)
    pitch = RF + A
    xp = D["row_len"] + D["rear_off"]
    for i in range(2):
        zoff = i * pitch
        for t in range(3):
            bz0 = zoff + (D["depth"] - D["belt_w"]) / 2
            bz1 = zoff + D["depth"] - (D["depth"] - D["belt_w"]) / 2
            o.append(slab_xz(iso, PAN[t], 0.9, 0, D["row_len"], zoff, zoff + D["pan_w"],
                             PAN_F, PAN_L, 0.7, 0.9))
            o.append(slab_xz(iso, PAN[t] + 0.9, 0.8, 0, D["row_len"], bz0, bz1,
                             BELT_F, BELT_L, 0.7, 0.95))
            o.append(cage_box(iso, 0, D["row_len"], FLOOR[t], TOP[t], zoff, zoff + D["depth"],
                              mesh=False, op=0.18))
            o.append(roller(iso, xp, PAN[t], zoff + 1, zoff + D["depth"] - 1, MECH, 1.0))
        for fx in FRAME_X:
            o.append(upright(iso, fx, zoff, 0, D["upright"], STEEL, 1.8))
            o.append(upright(iso, fx, zoff + D["depth"], 0, D["upright"], STEEL, 1.8))
        for zz in (zoff, zoff + D["depth"]):
            o.append(upright(iso, xp, zz, 0, D["post_h"], MECH, 2.6))
        o.append(line(iso.p(xp, D["line_y"], zoff - 2),
                      iso.p(xp, D["line_y"], zoff + D["depth"] + 2), STEEL, 3.0))
        o.append(line(iso.p(xp, D["post_h"], zoff), iso.p(xp, D["post_h"], zoff + D["depth"]),
                      MECH, 2.2))
    o.append(line(iso.p(xp, D["line_y"], D["depth"] + 2), iso.p(xp, D["line_y"], pitch - 2),
                  MECH, 4.4))
    o.append(lead(iso.p(xp, D["line_y"], (D["depth"] + pitch) / 2), (750, 1400),
                  'PROPSHAFT over the machinery aisle, 85"', MECH, 11.5))
    o.append(lead(iso.p(xp, D["post_h"], D["depth"]), (750, 1452),
                  'post runs to 90" and carries the line shaft', MECH, 11.5))
    # the concrete column standing in the open middle
    czc = pitch + D["depth"] + AM / 2
    cxi, ch = D["row_len"] * 0.42, 100
    o.append(poly([iso.p(cxi - 12, ch, czc - 12), iso.p(cxi + 12, ch, czc - 12),
                   iso.p(cxi + 12, ch, czc + 12), iso.p(cxi - 12, ch, czc + 12)],
                  fill="#c9ced6", col=INK, w=1.0, op=0.9))
    for dx2 in (-1, 1):
        for dz2 in (-1, 1):
            o.append(line(iso.p(cxi + dx2 * 12, 0, czc + dz2 * 12),
                          iso.p(cxi + dx2 * 12, ch, czc + dz2 * 12), "#9aa2ae", 3.2))
    o.append(poly([iso.p(cxi - 12, 0, czc + 12), iso.p(cxi + 12, 0, czc + 12),
                   iso.p(cxi + 12, ch, czc + 12), iso.p(cxi - 12, ch, czc + 12)],
                  fill="#dde1e7", col="#8f97a3", w=1.0, op=0.55))
    bp3 = iso.p(cxi + 12, 46, czc + 12)
    o.append(rect((bp3[0] - 9, bp3[1] - 13), 18, 26, fill="#ffe9a8", col=INK, sw=1.5, r=2))
    o.append(lead(bp3, (750, 1534), "CONTROL BOARD on the column", INK, 11.5))
    o.append(txt((758, 1556), "both halves are visible and reachable from here:", 11, MUTED))
    o.append(txt((758, 1574), "one board, one short cable run, one generator", 11, MUTED))
    o.append(txt((758, 1592), "session.", 11, MUTED))
    o.append(lead(iso.p(cxi - 12, 62, czc - 12), (750, 1650),
                  "RC COLUMN ~2 ft square", "#5c6470", 11.5))
    o.append(txt((758, 1672), "the only thing standing between the two halves —", 11, MUTED))
    o.append(txt((758, 1690), 'one open volume, 342" across.', 11, MUTED))

    # ---- the discharge, end to end ---------------------------------------
    o.append(rect((1180, 1250), 720, 456, fill="#fffbe9", col="#e8d9a0", sw=1, r=6))
    o.append(txt((1200, 1276), "★ THE DISCHARGE, END TO END  (D74–D80, R5, R7)",
                 12.5, "#8a6a00", "start", "700"))
    yy = 1302
    for a, b in [
        ("TIERS 2–3: hopper → channel → chute → AISLE TRAY",
         "Per tier: 45° hopper walls, 150 mm of fall across the 790 mm into a 100 × 100 mm "
         "cross-channel, identical on all 8. One TWO-TIER combining chute per row, "
         "LIQUID-TIGHT, spout 250 mm above the tray."),
        ("★ TIER 1: NO CHUTE, NO HOPPER, NO CHANNEL",
         "It falls FREE over its drive roller at 305 mm — essentially vertical, 3 mm of "
         "carry at 16 mm/s — onto ITS OWN tray under the rear of the row, 1.0 m ACROSS the "
         "row at x = 2–26\", clear of the 23\" access floor. A THREE-SIDED SHROUD, open "
         "rearward only, closes the discharge in, and ISOLATE–LOCK–TRY is the primary "
         "protection at that station."),
        ("The tray — 8 off, TWO per row, ONE DRAWING, TWO LENGTHS",
         "HDPE liner offcut in a 25 × 25 × 3 angle frame, 150 deep, packed up 60 mm at one "
         "end (1:20). AISLE 1.2 × 0.6 m = 108 L, 3× the 35.2 L it takes from tiers 2–3. "
         "TIER 1 1.0 × 0.6 m = 90 L, 5× its 17.6 L run. Section, depth, liner, six clips "
         "and the pack are identical; the length is not. Liquid pools in the LOW third and "
         "is the FIRST bucket out."),
        ("★ 2 L FLUSH per channel, every evening",
         "TWO channels per row — 4 L a row, 16 L/day for the house in 8 channels, carried "
         "in a bucket. It is what stops the channel bridging. GATED: prove one TIER-2 "
         "hopper and channel on the prototype before house material is cut."),
        ("Scoop with the drive ISOLATED and PADLOCKED",
         "Never during a pass (D78)."),
        ("★ THE REAR FLOOR — TWO THINGS TO GET RIGHT",
         "PRE-WELD: the two drive-station post feet at x = 14\" must stay ~1100 mm CLEAR, "
         "foot to foot — the tier-1 tray draws out REARWARD between them with ~50 mm each "
         "side, so NO foot is splayed, cranked or foot-plated OUTBOARD. ON THE PROTOTYPE: "
         "tip a 17.6 kg run over the bare tier-1 roller and chalk the floor — measure "
         "REARWARD from the roller plane at x = 14\" and accept if the patch stops inside "
         "x = 26\". Past that, add the 150 mm apron to the shroud's open rear face — not a "
         "chute, not a bigger tray. See sheet 6 panel G."),
    ]:
        o.append(txt((1200, yy), "•  " + a, 11.5, "#8a6a00", "start", "700"))
        t, yy = wrap(1214, yy + 17, 676, b, 11, 15)
        o.append(t)
        yy += 8

    write("manure-belt-REVC-3-house.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 4 -- fabrication details
# ============================================================================
def drawing_details():
    """Sheet 4 -- REV C fabrication details.  The sheet the welder actually builds from.

    Drawn from design.md s8 + s15 and the Rev C welder brief: angle-iron frame,
    UCP204 bolted to the outstanding leg, site-cut HDPE belt, roller tops flush
    with the pan, pan fall packed in at the front frame.
    """
    W, H = 1740, 5060
    o = [header(W, "4 · FABRICATION DETAILS  —  for the welder",
                "Angle-iron frame · bolted bearings · site-cut HDPE belt.  "
                "Every dimension here is a build dimension, not an impression.",
                rev=REVC, strap=STRAP_C)]

    def leadto(x0, y0, x1, y1, col):
        return line((x0, y0), (x1, y1), col, 0.8, dash="3 2")

    def keylist(x, y, items, w=470, num0=1, size=10.5, gap=17):
        """numbered callout key -- one bold line, optional wrapped note under it."""
        out, yy = [], y
        for i, it in enumerate(items):
            a, b = (it, None) if isinstance(it, str) else it
            out.append(callout((x + 9, yy - 4), num0 + i, 9))
            out.append(txt((x + 26, yy), a, size, INK, "start", "700"))
            if b:
                t, yy = wrap(x + 26, yy + 14, w, b, size - 0.5, 13)
                out.append(t)
                yy += 8
            else:
                yy += gap
        return "".join(out), yy

    # =====================================================================
    # A .  SECTION THROUGH A ROLLER -- the critical width chain
    # =====================================================================
    o.append(panel(40, 80, 830, 560,
                   "A · SECTION THROUGH A ROLLER  —  the critical width chain"))
    S = 12.4
    ax, ay = 152, 342                      # z = 0 (span datum) ; v = 0 (PAN SURFACE)
    fl = Flat(S, ax, ay)
    span = float(D["depth"])               # 32 in = 813 mm, OUTER face to OUTER face
    rf0, rf1 = (span - D["roller_face"]) / 2, span - (span - D["roller_face"]) / 2
    b0, b1 = (span - D["belt_w"]) / 2, span - (span - D["belt_w"]) / 2
    vret = -PAN_T - D["roller_d"]

    o.append(txt((60, 126), "★ ROLLER TOP FLUSH WITH THE PAN SURFACE — D93.  "
                            "The centre sits ONE RADIUS below it.", 11, MECH, "start", "700"))
    t, _ = keylist(60, 150, [
        "Ø63 × 3 mm TUBE on THREE internal discs — crown +1–2 mm, PACKED",
        "BELT on the pan — site-cut HDPE, 770 mm nominal (panel K)",
        "PAN 790 mm outer · 40 mm upturned lips · 1 mm galvanised",
        "50 × 50 × 5 ANGLE upright — HEEL AT THE BELT (panel B)",
        "UCP204 BOLTED to the outstanding leg — never welded (panel C)",
        "38T × 2 on the turned hub; grub-screw collar OUTBOARD (panel C)",
        "RETURN STRAND — 63 mm below the pan seat, on THREE skids (panel H)",
    ])
    o.append(t)

    # uprights -- 50 x 50 x 5 angle, heel AT the belt, body entirely OUTBOARD
    for zz, sgn in ((0.0, -1), (span, +1)):
        u0 = zz if sgn > 0 else zz - LEG50
        o.append(rect(fl.p(u0, 2.6), LEG50 * S, 6.2 * S, fill="#e4e8ed", col=STEEL, sw=1.0))
        o.append(line(fl.p(zz, 2.6), fl.p(zz, -3.6), STEEL, 4.6))     # the span datum face

    # pan -- 790 mm outer, 40 mm upturned lips, belt runs ON it
    o.append(line(fl.p(rf0, 0), fl.p(rf1, 0), PAN_L, 2.8))
    for zz in (rf0, rf1):
        o.append(line(fl.p(zz, 0), fl.p(zz, LEG40), PAN_L, 2.8))

    # drive roller -- top FLUSH with the pan surface (D93)
    o.append(rect(fl.p(rf0, 0.0), D["roller_face"] * S, D["roller_d"] * S,
                  fill="#f2c9c4", col=MECH, sw=1.7, r=2))
    o.append(path("M " + f(fl.p(rf0, 0)[0]) + " " + f(fl.p(rf0, 0)[1])
                  + " Q " + f(fl.p(span / 2, 0.5)[0]) + " " + f(fl.p(span / 2, 0.5)[1])
                  + " " + f(fl.p(rf1, 0)[0]) + " " + f(fl.p(rf1, 0)[1]), col=MECH, w=1.7))

    # belt, carry strand and return strand on three skids
    o.append(line(fl.p(b0, 0.13), fl.p(b1, 0.13), BELT_L, 5))
    o.append(line(fl.p(b0, vret), fl.p(b1, vret), BELT_L, 3, dash="9 5"))
    for zs in (span / 2 - mm(250), span / 2, span / 2 + mm(250)):
        o.append(line(fl.p(zs - LEG20 / 2, vret), fl.p(zs + LEG20 / 2, vret), STEEL, 3.2))
        o.append(line(fl.p(zs + LEG20 / 2, vret), fl.p(zs + LEG20 / 2, vret - LEG20), STEEL, 2.4))

    # shaft, pillow blocks, collar, sprocket sandwich -- all OUTBOARD
    o.append(line(fl.p(-mm(118.5), -D["roller_d"] / 2), fl.p(span + mm(118.5), -D["roller_d"] / 2),
                  STEEL, 3.6))
    for zz, sgn in ((0.0, -1), (span, +1)):
        c = fl.p(zz + sgn * mm(29.5), -D["roller_d"] / 2)
        o.append(rect((c[0] - mm(17.5) * S, c[1] - 2.3 * S), mm(35) * S, 4.6 * S,
                      fill="#cfd5dd", col=STEEL, sw=1.4, r=2))
        o.append(circ(c, mm(20) / 2 * S + 2.0, fill=PAPER, col=STEEL, w=1.4))
    cc = fl.p(-mm(57), -D["roller_d"] / 2)
    o.append(rect((cc[0] - mm(7) * S, cc[1] - 0.8 * S), mm(14) * S, 1.6 * S,
                  fill="#b9c1cb", col=STEEL, sw=1.1, r=1))
    for zp in (-mm(68.5), -mm(93.5)):
        cp = fl.p(zp, -D["roller_d"] / 2)
        o.append(rect((cp[0] - 2.0, cp[1] - D["spr_od"] / 2 * S), 4.0, D["spr_od"] * S,
                      fill="#f2c9c4", col=MECH, sw=1.2))
    o.append(rect(fl.p(-mm(93.5), -D["roller_d"] / 2 + D["hub_flange"] / 2),
                  mm(25) * S, D["hub_flange"] * S, fill="#f6d8d4", col=MECH, sw=1.1, r=1))

    # callouts, keyed to the list above
    for n, p in ((1, fl.p(span * 0.55, -1.24)), (2, fl.p(span * 0.26, 0.95)),
                 (3, fl.p(rf1 - 1.4, 0.95)), (4, fl.p(-LEG50 / 2, 1.85)),
                 (5, fl.p(span + mm(29.5), 1.85)), (6, fl.p(-mm(81), 1.55)),
                 (7, fl.p(span * 0.34, vret - 0.95))):
        o.append(callout(p, n, 9))
    o.append(leadto(fl.p(span * 0.26, 0.95)[0], fl.p(span * 0.26, 0.95)[1] + 9,
                    fl.p(span * 0.26, 0.20)[0], fl.p(span * 0.26, 0.20)[1], MECH))
    o.append(leadto(fl.p(rf1 - 1.4, 0.95)[0], fl.p(rf1 - 1.4, 0.95)[1] + 9,
                    fl.p(rf1, LEG40 * 0.6)[0], fl.p(rf1, LEG40 * 0.6)[1], MECH))
    o.append(leadto(fl.p(-LEG50 / 2, 1.85)[0], fl.p(-LEG50 / 2, 1.85)[1] + 9,
                    fl.p(-LEG50 / 2, 1.1)[0], fl.p(-LEG50 / 2, 1.1)[1], MECH))
    o.append(leadto(fl.p(span + mm(29.5), 1.85)[0], fl.p(span + mm(29.5), 1.85)[1] + 9,
                    fl.p(span + mm(29.5), 0.5)[0], fl.p(span + mm(29.5), 0.5)[1], MECH))
    o.append(leadto(fl.p(-mm(81), 1.55)[0], fl.p(-mm(81), 1.55)[1] + 9,
                    fl.p(-mm(81), 0.5)[0], fl.p(-mm(81), 0.5)[1], MECH))
    o.append(leadto(fl.p(span * 0.34, vret - 0.95)[0], fl.p(span * 0.34, vret - 0.95)[1] - 9,
                    fl.p(span * 0.34, vret - 0.2)[0], fl.p(span * 0.34, vret - 0.2)[1], BELT_L))

    o.append(txt((60, 424), "◀ MACHINERY AISLE — drop chain, 38T × 2, collar OUTBOARD",
                 10, MECH, "start", "700"))
    o.append(txt((630, 404), "CLEAN AISLE — the chute and the catch tray ▶", 10, WATER,
                 "end", "700"))

    # the width chain, as dimensions
    o.append(dim_h(fl.p(rf0, 0)[0], fl.p(rf1, 0)[0], 452, "roller face 790 mm", MECH, 10.5))
    o.append(dim_h(fl.p(b0, 0)[0], fl.p(b1, 0)[0], 478,
                   "belt 770 mm NOMINAL — SITE-CUT, panel K", BELT_L, 10.5))
    o.append(dim_h(fl.p(0, 0)[0], fl.p(span, 0)[0], 506,
                   'CLEAR SPAN  813 mm (32")  outer face to outer face', INK, 11.5))
    o.append(dim_h(fl.p(-mm(118.5), 0)[0], fl.p(0, 0)[0], 532, "118.5", STEEL, 10))
    o.append(txt((60, 560), "Bearings OUTSIDE the frame is the one choice that lets a 770 mm belt "
                            "live in an 813 mm span.", 10.5, MUTED, "start"))
    o.append(txt((60, 577), "Shaft 20 mm NEW bright bar, 1050 mm, all 24 symmetric, 50 mm key.  "
                            "It stands 118.5 mm proud of the cage face —",
                 10.5, MUTED, "start"))
    o.append(txt((60, 594), "IDENTICAL at both ends of every roller; measure both, do not assume.  "
                            "Roller face 790 mm is the widest MOVING part.",
                 10.5, MUTED, "start"))
    o.append(txt((60, 616), "Idler end: the pillow block bolts to a 150 mm FLAT shelf with slots "
                            "along the row, 95 mm centres, 60 mm of travel, M10 push-bolts from "
                            "the aisle.", 10.5, INK, "start", "700"))

    # ---- the zoom that matters: the three gaps at the belt edge ----------
    zx, zy, ZS = 744, 320, 46.0
    fz = Flat(ZS, zx, zy)
    o.append(txt((652, 126), "ZOOM ×4 · the tightest gaps", 10.5, INK, "start", "700"))
    o.append(rect(fz.p(-LEG50, 1.60), LEG50 * ZS, 3.35 * ZS, fill="#e4e8ed", col=STEEL, sw=1.0))
    o.append(line(fz.p(0, 1.60), fz.p(0, -1.75), STEEL, 4.6))
    o.append(rect(fz.p(rf0, 0.0), 1.15 * ZS, D["roller_d"] * ZS,
                  fill="#f2c9c4", col=MECH, sw=1.6))
    o.append(line(fz.p(rf0, 0), fz.p(rf0 + 1.15, 0), PAN_L, 2.8))
    o.append(line(fz.p(rf0, 0), fz.p(rf0, LEG40), PAN_L, 2.8))
    o.append(line(fz.p(b0, 0.09), fz.p(b0 + 0.95, 0.09), BELT_L, 5))
    for v_, a_, b_, lab, col_ in ((1.38, 0.0, rf0, "11.5", MECH),
                                  (0.96, 0.0, b0, "21.5", BELT_L),
                                  (0.54, rf0, b0, "10.0", PAN_L)):
        ya = fz.p(0, v_)[1]
        o.append(line(fz.p(a_, v_), fz.p(b_, v_), col_, 0.9))
        o.append(line((fz.p(a_, v_)[0], ya - 4), (fz.p(a_, v_)[0], ya + 4), col_, 0.9))
        o.append(line((fz.p(b_, v_)[0], ya - 4), (fz.p(b_, v_)[0], ya + 4), col_, 0.9))
        o.append(line(fz.p(b_, v_), (fz.p(b_, v_)[0] + 22, ya), col_, 0.8, dash="2 2"))
        o.append(txt((fz.p(b_, v_)[0] + 26, ya + 4), lab, 10.5, col_, "start", "700"))
    o.append(txt((652, 462), "roller → steel    11.5 mm", 10, MECH, "start", "700"))
    o.append(txt((652, 477), "belt → steel       21.5 mm", 10, BELT_L, "start", "700"))
    o.append(txt((652, 492), "belt → pan lip    10.0 mm", 10, PAN_L, "start", "700"))
    o.append(txt((652, 514), "The pan lip is the WORKING", 9.5, MUTED, "start"))
    o.append(txt((652, 527), "edge guide: it stops drift", 9.5, MUTED, "start"))
    o.append(txt((652, 540), "BEFORE the belt reaches steel.", 9.5, MUTED, "start"))
    o.append(txt((652, 562), "NOTHING that turns may", 10, MECH, "start", "700"))
    o.append(txt((652, 576), "touch the frame.", 10, MECH, "start", "700"))

    # =====================================================================
    # B .  THE ORIENTATION RULE -- heel into the belt
    # =====================================================================
    o.append(panel(900, 80, 800, 560,
                   "B · ★ ORIENTATION RULE  —  HEEL INTO THE BELT  (plan on one upright)"))
    BS = 34.0
    bx, by = 1055, 262
    fb = Flat(BS, bx, by)                  # u = x along the row ; v = z, +v toward the BELT
    o.append(rect(fb.p(-2.4, 2.30), 5.6 * BS, 1.20 * BS, fill="#f6faf5", col=CAGE_L,
                  sw=0.9, op=0.35))
    o.append(txt(fb.p(1.70, 1.50), "BELT  /  CAGE  SIDE", 10.5, CAGE_L, "middle", "700"))
    o.append(rect(fb.p(-2.4, -3.05), 5.6 * BS, 1.0 * BS, fill="#fdf3f2", col=MECH,
                  sw=0.9, op=0.30))
    o.append(txt(fb.p(0.4, -3.6), "MACHINERY AISLE", 10.5, MECH, "middle", "700"))
    # the L, in plan:  span leg along the row, outstanding leg into the aisle
    o.append(poly([fb.p(0, 0), fb.p(LEG50, 0), fb.p(LEG50, -TH50), fb.p(TH50, -TH50),
                   fb.p(TH50, -LEG50), fb.p(0, -LEG50)],
                  fill="#cfd5dd", col=STEEL, w=1.8))
    o.append(line(fb.p(0, 0), fb.p(LEG50, 0), STEEL, 4.6))
    # shaft axis, pillow-block base, 3 mm offcut on the toe
    o.append(line(fb.p(-mm(33.3), 2.15), fb.p(-mm(33.3), -2.95), STEEL, 3.4))
    o.append(rect(fb.p(-mm(33.3) - 0.42, -mm(47)), 0.84 * BS, mm(35) * BS,
                  fill="#e7ebef", col=STEEL, sw=1.3))
    o.append(rect(fb.p(-0.70, -LEG50), 0.70 * BS, mm(3) * BS, fill=MECH, col=MECH, sw=1))
    o.append(dim_h(fb.p(-mm(33.3), 0)[0], fb.p(0, 0)[0], fb.p(0, 0.60)[1], "33.3", STEEL, 9.5))
    for n, p in ((1, fb.p(0.55, 0.42)), (2, fb.p(1.62, 0.42)), (3, fb.p(-0.46, -1.05)),
                 (4, fb.p(0.78, -2.34)), (5, fb.p(-2.05, -1.15)), (6, fb.p(-1.31, 1.55))):
        o.append(callout(p, n, 9))
    o.append(leadto(fb.p(0.55, 0.42)[0], fb.p(0.55, 0.42)[1] + 9,
                    fb.p(0.20, -0.08)[0], fb.p(0.20, -0.08)[1], MECH))
    o.append(leadto(fb.p(-0.46, -1.05)[0] + 9, fb.p(-0.46, -1.05)[1],
                    fb.p(0.02, -1.05)[0], fb.p(0.02, -1.05)[1], MECH))
    o.append(leadto(fb.p(0.78, -2.34)[0], fb.p(0.78, -2.34)[1] - 9,
                    fb.p(0.32, -LEG50 - 0.06)[0], fb.p(0.32, -LEG50 - 0.06)[1], MECH))
    o.append(leadto(fb.p(-2.05, -1.15)[0] + 9, fb.p(-2.05, -1.15)[1],
                    fb.p(-1.73, -1.15)[0], fb.p(-1.73, -1.15)[1], MECH))
    o.append(leadto(fb.p(-1.31, 1.55)[0], fb.p(-1.31, 1.55)[1] + 9,
                    fb.p(-1.31, 0.95)[0], fb.p(-1.31, 0.95)[1], MECH))

    kx = 1200
    t, _ = keylist(kx, 126, [
        ("HEEL — it points AT the belt.",
         "The corner is the innermost point; both legs lie OUTBOARD of it."),
        ("Span leg — its OUTER face IS the span datum,",
         "and the span face IS the cage face. 813 mm, outer to outer."),
        ("Outstanding leg — reaches into the aisle.",
         "Its OUTER face is the bearing seat. This is the face you drill."),
        ("TOE — lay the 3 mm offcut flat here",
         "and butt the pillow-block base against it. That is the setting; "
         "there is nothing to measure."),
        ("UCP204 base, 35 mm wide.",
         "The shaft axis stands 33.3 mm off the leg face — the block's own H."),
        ("Roller / shaft axis.",
         "Set the ROLLER centre to 14\" and let the POST land where it lands. All four blocks "
         "on a drive post bolt to the SAME face."),
    ], w=460)
    o.append(t)

    o.append(txt((kx, 372), "THREE CHECKS — no drawing needed", 11.5, INK, "start", "700"))
    for i, s in enumerate([
            "1.  The face looking at the belt is an OUTSIDE face —",
            "      never the inside of the L.",
            "2.  The HEEL points at the belt.",
            "3.  The BEARING LEG reaches into the aisle."]):
        o.append(txt((kx, 392 + i * 17), s, 10.5, INK, "start", "700"))
    o.append(txt((kx, 480), "Do all three on the FIRST frame, then use it as the pattern.",
                 10, MUTED, "start"))
    o.append(txt((kx, 494), "At every frame the two uprights are MIRROR IMAGES,",
                 10, MUTED, "start"))
    o.append(txt((kx, 508), "heels facing each other.", 10, MUTED, "start"))

    o.append(txt((930, 540), "WHY IT IS WORTH THIS MUCH INK", 11, MECH, "start", "700"))
    t, _ = wrap(930, 558, 740,
                "The span face IS the cage face and the whole angle body lies OUTBOARD of it, so "
                "every millimetre the angle adds, it adds on the AISLE side — where the drive "
                "needs it. Turn the angle round and you take those millimetres out of the belt "
                "instead, and the bearings end up facing the cage.", 10.5, 14)
    o.append(t)

    # =====================================================================
    # B2 .  the four orientations, and why the pads are gone
    # =====================================================================
    o.append(panel(40, 660, 1660, 160,
                   "★ FOUR WAYS TO WELD AN ANGLE.  TWO ARE THE MIRROR PAIR; TWO ARE SCRAP."))
    base = [(0, 0), (LEG50, 0), (LEG50, -TH50), (TH50, -TH50), (TH50, -LEG50), (0, -LEG50)]
    quads = [
        (lambda u, v: (u, v), True, "LEFT upright"),
        (lambda u, v: (-u, v), True, "RIGHT upright — the mirror"),
        (lambda u, v: (-v, u), False, "a leg stands INTO the belt"),
        (lambda u, v: (-u, -v), False, "toe at the belt"),
    ]
    for i, (fn, ok, cap) in enumerate(quads):
        gx, gy, GS = 130 + i * 175, 752, 17.0
        fg = Flat(GS, gx, gy)
        col = CAGE_L if ok else MECH
        o.append(line(fg.p(-2.7, 2.3), fg.p(2.7, 2.3), CAGE_L, 2.4))
        o.append(txt(fg.p(0, 2.45), "belt", 9, CAGE_L, "middle", "600"))
        o.append(poly([fg.p(*fn(u, v)) for (u, v) in base], fill="#cfd5dd", col=STEEL, w=1.5))
        o.append(txt(fg.p(0, -2.75), ("✓" if ok else "✗") + "  " + cap,
                     9.5, col, "middle", "700"))
    o.append(txt((790, 706), "★ AND THIS IS WHY THE BEARING BOLTS AND IS NEVER WELDED",
                 11.5, MECH, "start", "700"))
    t, _ = wrap(790, 726, 890,
                "Chain tension pulls VERTICALLY.  Bolted to the outstanding leg that is plain "
                "shear on two M12 bolts, in the leg's strong direction, and the load path does "
                "not pass through a weld at all.  So EVERY UCP204 BOLTS to the leg, both ends "
                "of every tier.  Do not weld a bearing pad: there is nothing on this frame "
                "that a bearing is welded to.",
                10.5, 14, MECH, "700")
    o.append(t)

    # =====================================================================
    # C .  BEARING MOUNT -- the UCP204 bolts to the outstanding leg
    # =====================================================================
    o.append(panel(40, 840, 1660, 700,
                   "C · ★ BEARING MOUNT  —  THE UCP204 BOLTS STRAIGHT TO THE "
                   "OUTSTANDING LEG.  NOTHING IS WELDED"))

    # ---- C1: elevation ON the bearing face (looking along the row) -------
    o.append(txt((100, 894), "C1 · ELEVATION ON THE BEARING FACE", 11, INK, "start", "700"))
    o.append(txt((100, 909), "looking along the row at the outstanding leg's OUTER face",
                 9.5, MUTED, "start"))
    S1 = 1.80
    f1 = Flat(S1, 230, 1140)               # u = mm across the leg (+ = toward the belt) ; v = mm up
    o.append(rect(f1.p(-50, 100), 50 * S1, 200 * S1, fill="#e4e8ed", col=STEEL, sw=1.2))
    o.append(line(f1.p(0, 100), f1.p(0, -100), STEEL, 4.0))
    o.append(rect(f1.p(-50, 100), 3 * S1, 200 * S1, fill=MECH, col=MECH, sw=1))
    o.append(rect(f1.p(-47, 63.5), 35 * S1, 127 * S1, fill="#e7ebef", col=STEEL, sw=1.5, r=3))
    o.append(circ(f1.p(-29.5, 0), 30 * S1, fill="#cfd5dd", col=STEEL, w=1.5))
    o.append(circ(f1.p(-29.5, 0), 19 * S1, fill=PAPER, col=STEEL, w=1.2))
    o.append(circ(f1.p(-29.5, 0), 10 * S1, fill="#b9c1cb", col=STEEL, w=1.2))
    for vh in (47.5, -47.5):
        o.append(circ(f1.p(-28, vh), 7 * S1, fill=PAPER, col=MECH, w=1.6))
        o.append(line(f1.p(-42, vh), f1.p(-14, vh), MECH, 0.7, dash="4 3"))
    o.append(line(f1.p(-58, 0), f1.p(8, 0), STEEL, 0.8, dash="8 3 2 3"))
    o.append(dim_v(f1.p(-64, 0)[0], f1.p(0, 47.5)[1], f1.p(0, -47.5)[1], "", MECH))
    o.append(txt((f1.p(-64, 0)[0] - 6, f1.p(0, 6)[1]), "95", 11.5, MECH, "end", "700"))
    o.append(txt((f1.p(-64, 0)[0] - 6, f1.p(0, -7)[1]), "47.5 + 47.5", 9, MECH, "end"))
    o.append(dim_h(f1.p(-28, 0)[0], f1.p(0, 0)[0], f1.p(0, -120)[1], "28 from the heel",
                   MECH, 9.5))
    o.append(dim_h(f1.p(-47, 0)[0], f1.p(-12, 0)[0], f1.p(0, -140)[1], "base 35", STEEL, 9.5))
    o.append(dim_h(f1.p(-50, 0)[0], f1.p(0, 0)[0], f1.p(0, -160)[1], "leg 50", STEEL, 9.5))
    o.append(txt(f1.p(0, 108), "HEEL", 9.5, STEEL, "middle", "700"))
    o.append(txt(f1.p(-50, 108), "TOE", 9.5, STEEL, "middle", "700"))
    o.append(leadto(f1.p(-48.5, 60)[0], f1.p(0, 60)[1], 300, 958, MECH))
    o.append(txt((304, 961), "3 mm offcut, laid flat ON THE TOE", 10, MECH, "start", "700"))
    o.append(txt((304, 975), "— butt the base against it.  There is", 9.5, MUTED, "start"))
    o.append(txt((304, 988), "nothing to measure, and it repeats", 9.5, MUTED, "start"))
    o.append(txt((304, 1001), "56 times by a different pair of hands.", 9.5, MUTED, "start"))
    o.append(txt((304, 1026), "2 × Ø14 for M12 × 40 grade 8.8,", 10, MECH, "start", "700"))
    o.append(txt((304, 1040), "through-bolted, nyloc or double-nutted.", 9.5, MUTED, "start"))
    o.append(txt((304, 1053), "NO doubler plate.", 10, MECH, "start", "700"))
    o.append(txt((304, 1078), "★ IF THE 28 mm MARK AND THE 3 mm", 10, MECH, "start", "700"))
    o.append(txt((304, 1092), "OFFCUT DISAGREE, THE OFFCUT WINS.", 10, MECH, "start", "700"))
    t, _ = wrap(304, 1108, 250,
                "Ø14 on an M12 bolt gives 2 mm of play in every direction. That play is there "
                "on purpose, so the block can be set by the offcut and the hole can be a "
                "millimetre out.", 9.5, 12.5)
    o.append(t)
    o.append(txt((304, 1178), "Never accept 40 × 40 where a bearing", 9.5, INK, "start", "700"))
    o.append(txt((304, 1191), "lands: a 35 mm base on a 40 mm leg", 9.5, MUTED, "start"))
    o.append(txt((304, 1204), "leaves 2.5 mm a side BEFORE the fillet.", 9.5, MUTED, "start"))
    o.append(txt((304, 1217), "Yard check: leg width ≥ 46 mm MEASURED.", 9.5, INK,
                 "start", "700"))
    o.append(txt((304, 1240), "Chain tension is plain SHEAR on two", 9.5, MECH, "start", "700"))
    o.append(txt((304, 1253), "M12 bolts, in the leg's strong", 9.5, MECH, "start", "700"))
    o.append(txt((304, 1266), "direction.  No weld in the load path.", 9.5, MECH, "start", "700"))

    # ---- C2: section on the shaft ---------------------------------------
    o.append(txt((600, 894), "C2 · SECTION ON THE SHAFT  —  where the hub sits, and what you "
                             "gauge it from", 11, INK, "start", "700"))
    o.append(txt((600, 909), "outboard to the LEFT · all dimensions in mm",
                 9.5, MUTED, "start"))
    for i, s in enumerate([
            "★ inboard 38T plate sits 16 mm off the TOE — NOT 5 mm",
            "the housing's outboard face sits 3 mm off the toe (the offcut)",
            "the grub-screw collar faces OUTBOARD, always",
            "boss Ø40 × 50 long, bored Ø20 H7, 6 × 6 key FULL LENGTH",
            "sandwich 29 mm = 8 flange + 2 × 5.5 spacers + 2 plates",
            "★ GAUGE THE 19 mm OFF THE HOUSING FACE — never off the toe (D100)"]):
        o.append(txt((600, 932 + i * 15), s, 9.5,
                     MECH if s.startswith("★") else MUTED, "start",
                     "700" if s.startswith("★") else "400"))
    S2 = 2.30
    f2 = Flat(S2, 900, 1100)               # u = mm along the shaft (- = outboard) ; v = mm
    AXV = -33.3                            # shaft axis, 33.3 mm off the leg face
    o.append(line(f2.p(0, 44), f2.p(0, -140), CAGE_L, 3.0, dash="10 4"))
    o.append(txt(f2.p(3, -136), "◀ CAGE FACE = span datum", 9.5, CAGE_L, "start", "700"))
    # the 38T sandwich (broken -- only the near 58 mm of a 160 mm plate is drawn)
    for up in (-66, -95.5):
        o.append(rect(f2.p(up, AXV + 58), 5.5 * S2, 116 * S2, fill="#f2c9c4", col=MECH, sw=1.5))
    o.append(rect(f2.p(-85.5, AXV + 50), 8 * S2, 100 * S2, fill="#f6d8d4", col=MECH, sw=1.4))
    o.append(rect(f2.p(-116, AXV + 20), 50 * S2, 40 * S2, fill="#f6d8d4", col=MECH, sw=1.6))
    for up in (-66, -95.5):
        for sgn in (+1, -1):
            yb = f2.p(0, AXV + sgn * 58)[1]
            o.append(path("M " + f(f2.p(up, 0)[0]) + " " + f(yb) + " l 6 " + f(-sgn * 5)
                          + " l -6 " + f(-sgn * 5), col=MECH, w=1.3))
    # the outstanding leg, in section, and the toe
    o.append(rect(f2.p(-50, 5), 50 * S2, 5 * S2, fill="#cfd5dd", col=STEEL, sw=1.5))
    o.append(line(f2.p(-50, 8), f2.p(-50, -8), STEEL, 2.4))
    o.append(txt(f2.p(-50, 12), "TOE", 9, STEEL, "middle", "700"))
    o.append(txt(f2.p(-24, 21), "outstanding leg, 5 mm", 9, STEEL, "middle", "700"))
    # the shaft
    o.append(rect(f2.p(-118.5, AXV + 10), 158.5 * S2, 20 * S2,
                  fill="#b9c1cb", col=STEEL, sw=1.5))
    o.append(line(f2.p(-126, AXV), f2.p(46, AXV), STEEL, 0.8, dash="8 3 2 3"))
    # roller end, broken
    o.append(rect(f2.p(11.5, AXV + 31.5), 28 * S2, 63 * S2, fill="#f2c9c4", col=MECH, sw=1.6))
    o.append(path("M " + f(f2.p(39.5, AXV + 31.5)[0]) + " " + f(f2.p(0, AXV + 31.5)[1])
                  + " l 9 7 l -9 7 l 9 7", col=MECH, w=1.4))
    o.append(txt(f2.p(26, AXV + 37), "ROLLER", 9.5, MECH, "middle", "700"))
    # housing + collar
    o.append(rect(f2.p(-47, 0), 35 * S2, 64 * S2, fill="#e7ebef", col=STEEL, sw=1.6, r=3))
    o.append(circ(f2.p(-29.5, AXV), 19 * S2, fill=PAPER, col=STEEL, w=1.2))
    o.append(txt(f2.p(-29.5, AXV - 38), "UCP204", 9.5, STEEL, "middle", "700"))
    o.append(rect(f2.p(-54, AXV + 17), 7 * S2, 34 * S2, fill="#8f98a3", col=STEEL, sw=1.3))
    o.append(txt(f2.p(-57, AXV + 24), "collar", 9, STEEL, "end", "700"))
    # dimensions
    o.append(dim_h(f2.p(-66, 0)[0], f2.p(-54, 0)[0], f2.p(0, AXV + 70)[1],
                   "12 — an L-key's short arm", MECH, 9.5))
    o.append(dim_h(f2.p(0, 0)[0], f2.p(11.5, 0)[0], f2.p(0, AXV + 44)[1], "11.5", MECH, 9.5))
    o.append(dim_v(f2.p(-40.5, 0)[0], f2.p(0, 0)[1], f2.p(0, AXV)[1], "33.3", STEEL, 9.5))
    yA = f2.p(0, AXV - 74)[1]
    o.append(dim_h(f2.p(-47, 0)[0], f2.p(-66, 0)[0], yA, "19", MECH, 11.5))
    o.append(dim_h(f2.p(-66, 0)[0], f2.p(-95.5, 0)[0], yA, "29", MECH, 9.5))
    yB = f2.p(0, AXV - 96)[1]
    o.append(dim_h(f2.p(-50, 0)[0], f2.p(-66, 0)[0], yB, "16 off the TOE", STEEL, 9.5))
    o.append(dim_h(f2.p(-66, 0)[0], f2.p(-116, 0)[0], yB, "boss 50", STEEL, 9.5))
    yC = f2.p(0, AXV - 118)[1]
    o.append(dim_h(f2.p(-118.5, 0)[0], f2.p(0, 0)[0], yC,
                   "118.5 shaft end  ·  hub outboard face 116  ·  inboard plate 66  "
                   "(from the cage face)", STEEL, 9.5))
    o.append(txt((600, 1462), "★ 19 mm is the ONE dimension to set with a rule: square off the "
                              "housing's outboard face, shaft in place.",
                 10, MECH, "start", "700"))

    # ---- C3: the rules ---------------------------------------------------
    kx = 1160
    o.append(txt((kx, 894), "★ THE TWO DATUMS — DO NOT MIX THEM", 12, MECH, "start", "700"))
    o.append(txt((kx, 914), "THE TOE SETS THE BEARING.", 11, INK, "start", "700"))
    o.append(txt((kx, 930), "THE HOUSING FACE SETS THE HUB.", 11, INK, "start", "700"))
    t, yy = wrap(kx, 950, 520,
                 "D100: a UCP204's base-to-shaft height is 33.3 mm, and the base seats flat on "
                 "the leg. So the shaft — and every hub, plate and key on it — stands 33.3 mm "
                 "PROUD of the plane that carries the toe datum. There is nothing at the shaft's "
                 "height to lay a rule against. A man told \"16 mm off the toe\" hooks his tape "
                 "on the toe, measures diagonally, and is several millimetres out on the one "
                 "dimension the whole ruling was written to defend.", 10, 13.5)
    o.append(t)
    o.append(txt((kx, yy + 18), "So: gauge 19 mm SQUARE off the pillow-block housing's outboard "
                                "face,", 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 32), "with the shaft in place.  Never off the toe.",
                 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 56), "SETTING JIG — make it, do not measure each one",
                 11, INK, "start", "700"))
    t, yy = wrap(kx, yy + 74, 520,
                 "Saw twelve 19 mm slugs off a 20 mm bar offcut and bore them Ø21 so they slip "
                 "over the shaft. Slide a slug against the housing face, push the hub against the "
                 "slug, tighten, pull the slug out. Twelve identical settings, no tape.", 10, 13.5)
    o.append(t)
    o.append(txt((kx, yy + 20), "★ G1 GATES THE DRIVE-STATION POSTS", 11.5, MECH, "start", "700"))
    t, yy = wrap(kx, yy + 38, 520,
                 "Before a single drive-station post is welded, sit a REAL UCP204, two REAL 38T "
                 "plates, a real 3 mm offcut and a real piece of 50 × 50 × 5 on the bench and "
                 "measure how far the grub-screw collar projects past the housing face. Two "
                 "minutes, no belt needed.", 10, 13.5)
    o.append(t)
    yy += 12
    for a, b, col in [
        ("collar ≤ 8 mm", "build as drawn — inboard plate 16 mm off the toe (19 off the "
         "housing face), hub boss 50 mm, key 50 mm.", CAGE_L),
        ("collar > 8 mm", "inboard plate 22 mm off the toe (25 off the housing face), and the "
         "hub boss AND ALL 24 KEYS shorten to 44 mm.  22 + 44 = 66: the same budget (D100).",
         MECH),
    ]:
        o.append(txt((kx, yy + 14), a, 10.5, col, "start", "700"))
        t, yy = wrap(kx + 96, yy + 14, 430, b, 10, 13)
        o.append(t)
        yy += 6
    o.append(txt((kx, yy + 20), "Free-shaft budget: 16 + 50 = 66 mm of 69.5 — 3.5 mm SPARE.",
                 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 34), "Nothing else may be added outboard of a bearing without "
                                "re-checking that number.", 10, MUTED, "start"))
    o.append(txt((kx, yy + 48), "The bearing cannot move instead: with a 12 mm root fillet a "
                                "35 mm base can only", 10, MUTED, "start"))
    o.append(txt((kx, yy + 61), "span 3–38 mm off the toe.  There is no inboard room at all.",
                 10, MUTED, "start"))
    o.append(txt((kx, yy + 81), "Sprocket overhang 33.5 mm as built — ≤ 35 mm at the drop-chain "
                                "stations,", 10, MUTED, "start"))
    o.append(txt((kx, yy + 94), "25 mm everywhere else.  Buy the L-KEY, not a ball-end driver: "
                                "12 mm takes", 10, MUTED, "start"))
    o.append(txt((kx, yy + 107), "an L-key's short arm and will not take a ball end.",
                 10, MUTED, "start"))
    o.append(txt((kx, yy + 129), "SEAL-WELD ALL ROUND, no skip welds — the inner corner of an L "
                                 "is a wash-water", 10, INK, "start", "700"))
    o.append(txt((kx, yy + 142), "path.  Ø6 mm DRAIN HOLE at the foot of every upright and every "
                                 "post: 64 holes,", 10, INK, "start", "700"))
    o.append(txt((kx, yy + 155), "one drill bit, five minutes.  Zinc-rich primer everywhere.",
                 10, INK, "start", "700"))
    o.append(txt((kx, yy + 177), "56 UCP204 (48 roller + 8 line shaft) · 112 × M12 × 40 · "
                                 "4 × M12 × 60", 10, MECH, "start", "700"))
    o.append(txt((kx, yy + 190), "0 welded bearing pads · 0 tensioner brackets.",
                 10, MECH, "start", "700"))

    # =====================================================================
    # D .  ELEVATIONS AND THE ROLLER-CENTRE FIELD RULE  (D93)
    # =====================================================================
    o.append(panel(40, 1560, 1660, 620,
                   "D · ★ ELEVATIONS AND THE ROLLER-CENTRE FIELD RULE  —  D93.  "
                   "EVERY ONE OF THE 96 M12 HOLES IS SET OFF THIS"))
    SE = 4.20

    # ---- D1: the elevation schedule -------------------------------------
    o.append(txt((100, 1614), "D1 · ELEVATION SCHEDULE — one cage frame, 5 per row at "
                              "0 / 72 / 144 / 216 / 264\"", 11, INK, "start", "700"))
    o.append(txt((100, 1629), "★ 12 / 35 / 58\" are the TOP FACE of the pan cross-bar — "
                              "the PAN SEAT.  They are NOT a centreline.",
                 9.5, MECH, "start", "700"))
    fe = Flat(SE, 120, 2130)
    o.append(line(fe.p(-4, 0), fe.p(40, 0), INK, 2.2))
    o.append(txt(fe.p(-4, -2.6), "floor", 9.5, MUTED, "start"))
    for zz in (0, D["depth"]):
        o.append(rect(fe.p(zz - LEG50 / 2, D["upright"]), LEG50 * SE, D["upright"] * SE,
                      fill="#cfd5dd", col=STEEL, sw=1.2))
    # the THREE keep-out bands, shaded
    for ka, kb in KEEPOUT:
        o.append(rect(fe.p(0, kb), D["depth"] * SE, (kb - ka) * SE,
                      fill="#f7d9d5", col="none", sw=0, op=0.75))
    # cages
    for t_ in range(3):
        o.append(rect(fe.p(0.7, TOP[t_]), (D["depth"] - 1.4) * SE, D["cage_h"] * SE,
                      fill=CAGE_F, col=CAGE_L, sw=1, op=0.55))
        o.append(txt(fe.p(D["depth"] / 2, FLOOR[t_] + 5.6), 'tier %d  14"' % (t_ + 1),
                     9.5, CAGE_L, "middle", "600"))
        for un in NIP_Z:        # TWO nipple lines per tier, one per cage side
            o.append(circ(fe.p(un, NIPPLE[t_]), 2.4, fill="#dff1fa", col=WATER, w=1.3))
    rows = [
        (4.0, "bottom longitudinal brace   4\"   12 mm rod", STEEL12, 0),
        (PAN[0], "★ PAN SEAT 1   12\"   TOP FACE of 40 × 40 × 3", STEEL, 1),
        (FLOOR[0], "cage floor 1   17\"   12 mm rod", STEEL12, 0),
        (PAN[1], "★ PAN SEAT 2   35\"   TOP FACE of 40 × 40 × 3", STEEL, 1),
        (FLOOR[1], "cage floor 2   40\"   12 mm rod", STEEL12, 0),
        (PAN[2], "★ PAN SEAT 3   58\"   TOP FACE of 40 × 40 × 3", STEEL, 1),
        (FLOOR[2], "cage floor 3   63\"   12 mm rod", STEEL12, 0),
        (77.0, "top tie   77\"   ·   upright CUT LENGTH 78\"", STEEL12, 0),
    ]
    for h, lab, col, isbar in rows:
        if isbar:
            o.append(rect(fe.p(0, h), D["depth"] * SE, LEG40 * SE,
                          fill="#b9c1cb", col=STEEL, sw=1.1))
            o.append(line(fe.p(0, h), fe.p(D["depth"], h), STEEL, 3.0))
            o.append(line(fe.p(0.9, h + PAN_T), fe.p(D["depth"] - 0.9, h + PAN_T), PAN_L, 1.8))
        else:
            o.append(line(fe.p(0, h), fe.p(D["depth"], h), col, 2.0))
        o.append(line(fe.p(D["depth"], h), fe.p(D["depth"] + 3, h), FAINT, 0.8, dash="3 3"))
        o.append(txt(fe.p(D["depth"] + 4, h - 1.0), lab, 9.5,
                     MECH if isbar else MUTED, "start", "700" if isbar else "400"))
    gx = fe.p(-2.6, 0)[0]
    ga, gb = fe.p(0, TOP[0])[1], fe.p(0, FLOOR[1])[1]
    o.append(line((gx, ga), (gx, gb), MECH, 0.9))
    for yv in (ga, gb):
        o.append(line((gx - 4, yv), (gx + 4, yv), MECH, 0.9))
    o.append(txt((gx - 6, (ga + gb) / 2 + 4), 'gap 9"', 9.5, MECH, "end", "700"))
    o.append(txt((100, 2148), "Set every pan cross-bar off a STRING LINE, not by eye.  "
                              "A wavy pan makes the belt pick a side and stay there.",
                 10, INK, "start", "700"))

    # ---- D2: the drive-station post, with the CORRECTED roller centres ---
    o.append(txt((690, 1614), "D2 · DRIVE-STATION POST — 14\" behind the rear cage leg",
                 11, INK, "start", "700"))
    o.append(txt((690, 1629), "cut 90\" · carries 3 roller blocks, the line-shaft block, the "
                              "gantry top member and all 12 sprockets",
                 9.5, MUTED, "start"))
    fp = Flat(SE, 720, 2130)
    o.append(line(fp.p(-4, 0), fp.p(30, 0), INK, 2.2))
    o.append(rect(fp.p(-LEG50 / 2, D["post_h"]), LEG50 * SE, D["post_h"] * SE,
                  fill="#cfd5dd", col=STEEL, sw=1.4))
    o.append(txt(fp.p(0, D["post_h"] + 2.2), 'post cut 90"', 9.5, STEEL, "middle", "700"))
    for t_ in range(3):
        ph = PAN[t_] + PAN_T
        o.append(line(fp.p(-1.2, ph), fp.p(8.4, ph), PAN_L, 2.2))
        o.append(circ(fp.p(0, ROLL_Y[t_]), D["roller_d"] / 2 * SE, fill="#f2c9c4",
                      col=MECH, w=1.6))
        o.append(line(fp.p(-3.4, ROLL_Y[t_]), fp.p(3.4, ROLL_Y[t_]), MECH, 0.8, dash="6 3"))
        o.append(leadto(fp.p(3.4, ROLL_Y[t_])[0], fp.p(0, ROLL_Y[t_])[1],
                        fp.p(8.8, ROLL_Y[t_] + 1.1)[0], fp.p(0, ROLL_Y[t_] + 1.1)[1], MECH))
        o.append(txt(fp.p(9.2, ROLL_Y[t_] + 1.5), '%.1f"  ROLLER CENTRE' % ROLL_Y[t_],
                     10, MECH, "start", "700"))
    o.append(txt(fp.p(9.2, PAN[2] + PAN_T + 4.4), 'pan surface 58.04" = seat + 1 mm pan',
                 9.5, PAN_L, "start", "700"))
    o.append(leadto(fp.p(8.4, PAN[2] + PAN_T)[0], fp.p(0, PAN[2] + PAN_T)[1],
                    fp.p(9.0, PAN[2] + PAN_T + 4.0)[0], fp.p(0, PAN[2] + PAN_T + 4.0)[1],
                    PAN_L))
    o.append(txt(fp.p(9.2, ROLL_Y[2] - 2.1), 'centre = pan surface − 31.5 mm (ONE RADIUS)',
                 9.5, MUTED, "start"))
    o.append(circ(fp.p(0, LINE_Y_C), 1.1 * SE, fill="#b9c1cb", col=STEEL, w=1.6))
    o.append(txt(fp.p(2.6, LINE_Y_C + 0.6), 'LINE SHAFT  %.1f"' % LINE_Y_C, 9.5, STEEL,
                 "start", "700"))
    o.append(txt(fp.p(2.6, LINE_Y_C - 2.4), '= 25.5" above tier 3 AS BUILT', 8.5, MUTED,
                 "start"))
    o.append(rect(fp.p(-LEG50 / 2 - 1.2, GANTRY_Y_C), (LEG50 + 2.4) * SE, LEG50 * SE,
                  fill="#b9c1cb", col=STEEL, sw=1.3))
    o.append(txt(fp.p(2.6, GANTRY_Y_C + 0.4), 'gantry top member, top face %.1f"' % GANTRY_Y_C,
                 9.5, STEEL, "start", "700"))
    dxp = fp.p(-3.2, 0)[0]
    o.append(dim_v(dxp, fp.p(0, 0)[1], fp.p(0, ROLL_Y[0])[1], "", MECH))
    o.append(txt((dxp - 6, fp.p(0, ROLL_Y[0] / 2)[1]), "10.8", 9.5, MECH, "end", "700"))
    for t_ in (0, 1):
        o.append(dim_v(dxp, fp.p(0, ROLL_Y[t_])[1], fp.p(0, ROLL_Y[t_ + 1])[1], "", MECH))
        o.append(txt((dxp - 6, fp.p(0, (ROLL_Y[t_] + ROLL_Y[t_ + 1]) / 2)[1]),
                     '23"', 9.5, MECH, "end", "700"))
    o.append(dim_v(dxp, fp.p(0, ROLL_Y[2])[1], fp.p(0, LINE_Y_C)[1], "", STEEL))
    o.append(txt((dxp - 6, fp.p(0, (ROLL_Y[2] + LINE_Y_C) / 2)[1]), '25.5"', 9.5, STEEL,
                 "end", "700"))
    o.append(txt((690, 2148), "★ The 23\" tier pitch moves WITH the rollers, so the 130L loops "
                              "are safe either way.  The 25.5\" does NOT — re-measure it.",
                 10, MECH, "start", "700"))

    # ---- D3: the field rule ---------------------------------------------
    kx = 1190
    o.append(txt((kx, 1614), "★ DO NOT SET A ROLLER OFF ANY TABLE IN ANY DOCUMENT",
                 12, MECH, "start", "700"))
    steps = [
        ("FIT THE PAN FIRST.", "Cross-bars off a string line, dead level, at 12 / 35 / 58\" "
         "top face. Then form and lay the pan."),
        ("SET THE TOP OF EVERY ROLLER FLUSH WITH THE PAN SURFACE.",
         "Take the bearing height from the pan you have actually fitted — not from a number. "
         "The as-built pan surface is the only honest datum: 10.8\" is itself derived from a "
         "1 mm pan on a nominal 12\" seat, and the pan is site-formed in ~6 ft sections."),
        ("THEN SET THE LINE SHAFT 25.5\" ABOVE TIER 3's AS-BUILT CENTRE,",
         "and the gantry top member 5\" above the line shaft."),
    ]
    yy = 1636
    for i, (a, b) in enumerate(steps):
        o.append(callout((kx + 9, yy - 4), i + 1, 9))
        o.append(txt((kx + 26, yy), a, 10.5, INK, "start", "700"))
        t, yy = wrap(kx + 26, yy + 14, 470, b, 10, 13)
        o.append(t)
        yy += 10
    o.append(txt((kx, yy + 10), "WHY THE CENTRE SITS ONE RADIUS BELOW THE PAN", 11, MECH,
                 "start", "700"))
    t, yy = wrap(kx, yy + 28, 490,
                 "The belt runs ON the pan and wraps over the TOP of the roller, so the roller "
                 "top is FLUSH with the pan surface and the centre sits ONE RADIUS — 31.5 mm, "
                 "1.24\" — below it.  Ruling R3 says the same thing from the other side: the "
                 "return strand runs 63 mm below the pan and the skid top face 63 mm below the "
                 "pan seat, and 63 mm is ONE ROLLER DIAMETER.  Two derivations, one answer.",
                 10, 13)
    o.append(t)
    o.append(txt((kx, yy + 18), "★ A HOLE DRILLED OFF A TABLE IS A HOLE IN SCRAP STEEL.",
                 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 32), "48 roller pillow blocks · 96 M12 holes · every one set off "
                                "this height.", 10, MUTED, "start"))
    o.append(txt((kx, yy + 54), "★ CONSEQUENCE TO BUILD, NOT TO NOTE", 10.5, MECH,
                 "start", "700"))
    t, yy = wrap(kx, yy + 70, 490,
                 "At these centres the lowest sprocket's bottom edge sits nearer 7.7\" than "
                 "10.4\" — inside the zone where a man crouches to scoop.  R4's closed-bottom "
                 "drop-chain enclosure, its sloped lower corner and its separate hinged tier-1 "
                 "panel all matter here.  Build them exactly as ruling R4 says.", 10, 13)
    o.append(t)

    # =====================================================================
    # E .  THE PAN DOES NOT FALL 1-2 DEGREES  (D94)
    # =====================================================================
    o.append(panel(40, 2200, 1660, 270,
                   "E · ★ THE PAN DOES NOT FALL 1–2°  —  D94.  CROSS-BARS DEAD LEVEL; "
                   "THE FALL IS PACKED INTO THE PAN"))
    SL = 3.30                                   # px per inch along the row
    fla = Flat(SL, 120, 2380)
    o.append(line(fla.p(-14, 0), fla.p(292, 0), INK, 2.0))
    for i, xf in enumerate(FRAME_X):
        o.append(line(fla.p(xf, 0), fla.p(xf, 30), STEEL, 3.4))
        o.append(txt(fla.p(xf, -3.4), '%d"' % xf, 9, MUTED, "middle"))
    o.append(line(fla.p(-8, 0), fla.p(-8, 24), STEEL, 2.2))
    o.append(line(fla.p(286 - 8, 0), fla.p(286 - 8, 24), STEEL, 2.2))
    # the cross-bars: DEAD LEVEL
    o.append(line(fla.p(-2, 21), fla.p(268, 21), STEEL, 3.4))
    o.append(txt(fla.p(134, 23.2), "PAN CROSS-BAR TOP FACES — DEAD LEVEL ON A STRING LINE, "
                                   "ALL FIVE FRAMES.  THIS IS THE TRACKING DATUM.",
                 10, INK, "middle", "700"))
    # the pan: packed 25 mm at the FRONT, tapering to zero at the REAR
    EXAG = 3.4                                  # 25 mm shown as 3.4 in so it is visible at all
    o.append(poly([fla.p(-2, 21), fla.p(-2, 21 + EXAG), fla.p(268, 21)],
                  fill=PAN_F, col=PAN_L, w=1.8))
    o.append(line(fla.p(-2, 21 + EXAG), fla.p(268, 21), PAN_L, 2.6))
    o.append(txt(fla.p(4, 22.4), "25 mm of packing", 10, PAN_L, "start", "700"))
    o.append(txt(fla.p(262, 21.8), "0 mm", 10, PAN_L, "end", "700"))
    o.append(txt(fla.p(134, 16.2), "PAN, packed up 25 mm at the FRONT frame, tapering to ZERO "
                                   "at the rear — about 1:270 (0.21°)", 10, PAN_L,
                 "middle", "700"))
    o.append(txt(fla.p(134, 13.6), "vertical scale of the taper exaggerated — 25 mm over 264\" "
                                   "is not visible at any drawing scale", 9, MUTED, "middle"))
    o.append(txt(fla.p(-8, 27.0), "FRONT / door end", 9.5, MUTED, "middle", "700"))
    o.append(txt(fla.p(272, 27.0), "REAR / discharge", 9.5, MUTED, "middle", "700"))
    o.append(dim_h(fla.p(0, 0)[0], fla.p(264, 0)[0], fla.p(0, -6.4)[1],
                   'row 22 ft = 264"  ·  C (roller centre to centre) = 286" = 7.264 m',
                   MUTED, 10))
    kx = 1190
    o.append(txt((kx, 2238), "WHY, AND WHAT TO PROVE", 11, MECH, "start", "700"))
    t, yy = wrap(kx, 2256, 490,
                 "1° over the 264\" row is 117 mm of drop; 2° is 235 mm.  The dropping gap is "
                 "9\" with about 5\" of usable headroom in it — a 1° fall would eat the ENTIRE "
                 "gap.  And the pan seats are fixed at 12 / 35 / 58\" at all five frames, which "
                 "is dead level.  So the fall cannot come from the steel at all.", 10, 13)
    o.append(t)
    t, yy = wrap(kx, yy + 10, 490,
                 "Which one gives way is not a compromise, it is decided by what fails.  "
                 "Cross-bar level is the TRACKING datum and carries a 1 mm tolerance.  Pan fall "
                 "only moves free liquid, and the pan is 1 mm galvanised in ~6 ft sections that "
                 "follows a taper without complaint.  So the fall moves OFF the steel and ONTO "
                 "the packing.", 10, 13)
    o.append(t)
    o.append(txt((kx, yy + 16), "★ PROVE IT ON THE PROTOTYPE: pour 2 L of water on the pan at "
                                "the front and watch it", 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 30), "reach the rear.  If it stalls, increase the front packing in "
                                "10 mm steps.  Record the", 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 44), "figure that works and use it on all twelve.",
                 10.5, MECH, "start", "700"))
    o.append(txt((kx, yy + 68), "At 1:270 the back-drive force on a loaded belt is about 0.6 N "
                                "against 132 N of", 10, MUTED, "start"))
    o.append(txt((kx, yy + 81), "sliding friction (D28), so a loaded belt cannot run itself "
                                "backwards and nothing", 10, MUTED, "start"))
    o.append(txt((kx, yy + 94), "is fitted to hold it.", 10, MUTED, "start"))

    # =====================================================================
    # F .  THE DRIVE ROLLER -- tube on THREE discs, grooved lagging
    # =====================================================================
    o.append(panel(40, 2490, 830, 560,
                   "F · DRIVE ROLLER  —  ALL 24 IDENTICAL.  Ø63 × 3 TUBE ON THREE "
                   "INTERNAL DISCS"))
    SR = 0.62                                   # px per mm along the shaft
    fr = Flat(SR, 455, 2650)
    o.append(txt((100, 2524), "F1 · ELEVATION ON THE ROLLER — shaft 20 mm NEW bright bar, "
                              "1050 mm, symmetric", 11, INK, "start", "700"))
    o.append(txt((100, 2539), "the mid-span disc is NOT optional — see the note below",
                 9.5, MECH, "start", "700"))
    o.append(rect(fr.p(-525, 10), 1050 * SR, 20 * SR, fill="#b9c1cb", col=STEEL, sw=1.3))
    o.append(rect(fr.p(-395, 31.5), 790 * SR, 63 * SR, fill="#f2c9c4", col=MECH, sw=1.7))
    for ud in (-392, 0, 392):
        o.append(rect(fr.p(ud - 1.5, 28.5), 3 * SR, 57 * SR, fill="#d98c80", col=MECH, sw=1.4))
    for uh in (-18, 0, 18):
        o.append(circ(fr.p(uh, 31.5), 2.4, fill=PAPER, col=MECH, w=1.2))
    o.append(leadto(fr.p(20, 31.5)[0], fr.p(0, 31.5)[1], 556, 2600, MECH))
    o.append(txt((560, 2596), "mid-span disc welded to the SHAFT, then plug-", 9.5, MECH,
                 "start", "700"))
    o.append(txt((560, 2609), "welded to the tube through 3 × Ø8 shell holes", 9.5, MUTED,
                 "start"))
    o.append(leadto(fr.p(-392, 31.5)[0], fr.p(0, 34)[1], 240, 2600, MECH))
    o.append(txt((100, 2596), "3 discs, Ø57 × 3 plate,", 9.5, MECH, "start", "700"))
    o.append(txt((100, 2609), "bored Ø20 — 72 off", 9.5, MUTED, "start"))
    # crown packer + grooved lagging
    o.append(rect(fr.p(-100, 41), 200 * SR, 6 * SR, fill="#fbd8a0", col="#c08a2e", sw=1.1))
    o.append(rect(fr.p(-395, 47), 790 * SR, 9 * SR, fill="#4a4f55", col=INK, sw=1.0))
    o.append(leadto(fr.p(-70, 47)[0], fr.p(0, 47)[1], 424, 2562, "#c08a2e"))
    o.append(txt((430, 2545), "CROWN — PACK IT: a 200 mm strip of 0.5 mm shim",
                 9.5, "#c08a2e", "start", "700"))
    o.append(txt((430, 2558), "centred on the roller, then the full-width rubber",
                 9.5, "#c08a2e", "start", "700"))
    o.append(txt((430, 2571), "over it → a smooth +1 mm rise at the centre",
                 9.5, "#c08a2e", "start", "700"))
    o.append(dim_h(fr.p(-395, 0)[0], fr.p(395, 0)[0], 2714, "roller FACE 790 mm", MECH, 10.5))
    o.append(dim_h(fr.p(-525, 0)[0], fr.p(525, 0)[0], 2740,
                   "shaft 1050 mm — all 24 symmetric, 50 mm key each end", STEEL, 10.5))
    o.append(dim_h(fr.p(-525, 0)[0], fr.p(-395, 0)[0], 2766, "118.5 proud", STEEL, 9.5))
    o.append(dim_h(fr.p(395, 0)[0], fr.p(525, 0)[0], 2766, "118.5 proud", STEEL, 9.5))

    # ---- F2: the lagging, with properly clipped 45 deg grooves ----------
    o.append(txt((100, 2802), "F2 · THE LAGGING — groove pattern (enlarged)", 10.5, INK,
                 "start", "700"))
    gx0, gy0, gW, gHh = 104, 2816, 160, 92
    o.append(rect((gx0, gy0), gW, gHh, fill="#4a4f55", col=INK, sw=1.2))
    cc0, cc1, step = gy0 - (gx0 + gW), gy0 + gHh - gx0, 34.0
    c = cc0
    while c <= cc1:                         # 45 deg lines y - x = c, clipped to the box
        xa, ya = gx0, gx0 + c
        if ya < gy0:
            ya, xa = gy0, gy0 - c
        xb, yb = gx0 + gW, gx0 + gW + c
        if yb > gy0 + gHh:
            yb, xb = gy0 + gHh, gy0 + gHh - c
        if xb - xa > 2:
            o.append(line((xa, ya), (xb, yb), "#9aa2ab", 11.0, cap="butt"))
        c += step
    o.append(txt((gx0 + gW / 2, gy0 + gHh + 13), "direction of travel →", 9, MUTED,
                 "middle", "600"))
    o.append(txt((100, 2924), "8–10 mm rubber, GROOVED:", 9.5, MECH, "start", "700"))
    o.append(txt((100, 2937), "10 × 5 mm grooves at 45°,", 9.5, MECH, "start", "700"))
    o.append(txt((100, 2950), "cut on site from the same", 9.5, MUTED, "start"))
    o.append(txt((100, 2963), "conveyor-belt offcut as the", 9.5, MUTED, "start"))
    o.append(txt((100, 2976), "scraper.  Wrap ~790 × 210.", 9.5, MUTED, "start"))
    o.append(txt((100, 2999), "Idler: same wrap, PLAIN.", 9.5, INK, "start", "700"))
    o.append(txt((100, 3012), "Crown BOTH rollers.", 9.5, INK, "start", "700"))
    o.append(txt((100, 3031), "Roller Ø 63 — DO NOT INCREASE.", 9.5, MECH, "start", "700"))

    nx = 372
    o.append(txt((nx, 2802), "★ WHY THE MID-SPAN DISC IS NOT OPTIONAL", 11, MECH,
                 "start", "700"))
    t, yy = wrap(nx, 2820, 470,
                 "A powered drive needs about 250 N of SLACK-SIDE TENSION for the lagged roller "
                 "to grip — that is a specified parameter now, not \"negligible\".  Under it a "
                 "bare 20 mm shaft deflects 3.18 mm at mid-span, which unloads the crown and "
                 "produces exactly the tracking failure the crown exists to prevent.  The tube "
                 "on three discs deflects 0.10 mm.", 10, 13)
    o.append(t)
    o.append(txt((nx, yy + 14), "THREE INTERNAL DISCS, not two end discs: that is what holds",
                 10, MECH, "start", "700"))
    o.append(txt((nx, yy + 27), "the crown under a motor.", 10, MECH, "start", "700"))
    o.append(txt((nx, yy + 50), "★ WHY THE LAGGING MUST BE GROOVED", 11, MECH, "start", "700"))
    t, yy = wrap(nx, yy + 68, 470,
                 "Smooth rubber at μ ≈ 0.25 cannot deliver breakaway at any sane tension.  That "
                 "is not a margin argument — it does not work.  The grooves channel liquid out "
                 "of the interface, and free liquid is the whole problem here.", 10, 13)
    o.append(t)
    o.append(txt((nx, yy + 16), "DIAGNOSTIC WORTH MEMORISING", 10.5, INK, "start", "700"))
    t, yy = wrap(nx, yy + 32, 470,
                 "If a drive roller slips on a normal morning run, the lagging is GLAZED.  Clean "
                 "it and cut fresh grooves.  Do NOT tighten the tensioner first — tightening "
                 "removes the fuse and promotes \"the roller slips\" into \"the belt tears\".",
                 10, 13)
    o.append(t)

    # =====================================================================
    # G .  SPROCKET HUB, PLATES AND CHAIN
    # =====================================================================
    o.append(panel(900, 2490, 800, 560,
                   "G · SPROCKET HUB, PLATES AND CHAIN  —  16 IDENTICAL HUBS (D96)"))
    o.append(txt((930, 2524), "G1 · HUB — HALF-SECTION ON THE AXIS", 11, INK, "start", "700"))
    o.append(txt((930, 2539), "turn 16 from Ø60 bright bar: one setup, one drawing, one part "
                              "number", 9.5, MUTED, "start"))
    SH = 1.58
    fh = Flat(SH, 1000, 2724)                  # u = mm along the axis ; v = mm radius
    o.append(line(fh.p(-26, 0), fh.p(68, 0), STEEL, 0.9, dash="9 3 2 3"))
    o.append(rect(fh.p(-22, 10), 96 * SH, 10 * SH, fill="#b9c1cb", col=STEEL, sw=1.3))
    o.append(rect(fh.p(0, 16), 50 * SH, 6 * SH, fill="#8f98a3", col=STEEL, sw=1.1))
    o.append(rect(fh.p(0, 20), 50 * SH, 10 * SH, fill="#f6d8d4", col=MECH, sw=1.6))
    o.append(rect(fh.p(5, 50), 5.5 * SH, 30 * SH, fill="#e9eaec", col=MECH, sw=1.1))
    o.append(rect(fh.p(10.5, 50), 8 * SH, 30 * SH, fill="#f6d8d4", col=MECH, sw=1.4))
    o.append(rect(fh.p(18.5, 50), 5.5 * SH, 30 * SH, fill="#e9eaec", col=MECH, sw=1.1))
    for up in (0.0, 24.0):
        o.append(rect(fh.p(up, 80), 5 * SH, 60 * SH, fill="#f2c9c4", col=MECH, sw=1.6))
    o.append(line(fh.p(0, 66), fh.p(29, 66), INK, 2.4))
    o.append(dim_h(fh.p(0, 0)[0], fh.p(50, 0)[0], fh.p(0, -14)[1],
                   "boss 50 — AND THE BOSS IS THE KEY", MECH, 10))
    o.append(dim_h(fh.p(0, 0)[0], fh.p(29, 0)[0], fh.p(0, -32)[1], "sandwich 29", MECH, 9.5))
    o.append(dim_v(fh.p(58, 0)[0], fh.p(0, 20)[1], fh.p(0, 0)[1], "R20 → Ø40", MECH, 9.5))
    o.append(dim_v(fh.p(-18, 0)[0], fh.p(0, 10)[1], fh.p(0, 0)[1], "", STEEL))
    o.append(txt((fh.p(-18, 0)[0] - 5, fh.p(0, 4)[1]), "Ø20 H7", 9, STEEL, "end", "700"))
    for n, p in ((1, fh.p(2.5, 92)), (2, fh.p(14.5, 60)), (3, fh.p(6.5, 40)),
                 (4, fh.p(40, 26)), (5, fh.p(25, 12)), (6, fh.p(14.5, 72))):
        o.append(callout(p, n, 9))
    o.append(txt((930, 2560), "half-section: the lower half is identical", 9, MUTED, "start"))
    t, _ = keylist(930, 2790, [
        "38T × 2, one plate each side, 5 mm — never delete the spare row",
        "integral flange, OD ~100 × 8 mm",
        "spacers 5.5 mm, one each side of the flange",
        "boss OD 40 × 50 mm long",
        "bore Ø20 H7 with a 6 × 6 keyway, FULL LENGTH",
        "M8 through the sandwich, 4 per hub",
    ], size=9.5)
    o.append(t)

    nx = 1290
    o.append(txt((nx, 2524), "★ ALL 16 HUBS ARE THE SAME PART", 11.5, MECH, "start", "700"))
    t, yy = wrap(nx, 2542, 390,
                 "12 on the roller shafts, 3 per row, and 4 on the LINE SHAFTS — the line shaft "
                 "is 20 mm, exactly like a roller shaft.  Identical hubs are what makes every "
                 "chain in the house coplanar, and they delete a second part number.  The "
                 "gearbox output sprocket is the ONE exception: bore and keyway turned to fit "
                 "whatever box you actually buy.", 10, 13)
    o.append(t)
    t, yy = wrap(nx, yy + 12, 390,
                 "Each hub has TWO tooth rows and only FIVE of the six per row are used.  DO NOT "
                 "DELETE THE SPARE PLATE — the spare is the reason the hubs are identical, and "
                 "the unused row ends up at TIER 1, at the bottom of the daisy chain (D99), "
                 "which is exactly where the single-tier fallback needs it.", 10, 13, INK, "700")
    o.append(t)
    yy += 18
    o.append(txt((nx, yy), "CHAIN — 428, AND NEVER MIXED", 11.5, MECH, "start", "700"))
    yy += 18
    for a, b in [("Chain", "428 MOTORCYCLE chain on 428 plates, 38T"),
                 ("Tier to tier", '23" centres = exactly 130 pitches = one 130L loop'),
                 ("Line → tier 3", '25.5" centres = exactly 140 pitches = one 140L'),
                 ("Tensioner", "★ SPRING type, one per loop — MANDATORY.  14 off"),
                 ("Loops", "8 × 130L + 4 × 140L + 2 gearbox loops, cut"),
                 ("Never", "★ mix 428 with 08B — roller Ø 7.77 vs 8.51 mm")]:
        o.append(txt((nx, yy), a, 9.5, INK, "start", "700"))
        o.append(txt((nx + 96, yy), b, 9.5, MECH if b.startswith("★") else MUTED, "start",
                     "700" if b.startswith("★") else "400"))
        yy += 15
    t, yy = wrap(nx, yy + 10, 390,
                 "Every vendor will tell you 428 and 08B are the same, because the pitch and the "
                 "inner width match.  The ROLLER DIAMETER does not, and the tooth gap is cut to "
                 "the roller.  They are not the same.", 10, 13)
    o.append(t)
    t, yy = wrap(nx, yy + 10, 390,
                 "The spring tensioner is mandatory, not a nicety: a stock loop has NO slack "
                 "adjustment in it at all — there is no half-link to take out.  It is also the "
                 "safer part, because a spring tensioner cannot be over-tightened onto the "
                 "bearing, which is exactly what a rigid adjuster invites somebody to do.",
                 10, 13)
    o.append(t)
    o.append(txt((nx, yy + 16), "NEVER OIL THE CHAINS.  Oil plus manure and feed dust",
                 10, MECH, "start", "700"))
    o.append(txt((nx, yy + 29), "is a grinding paste.  Brush them dry.  One chain per row",
                 10, MUTED, "start"))
    o.append(txt((nx, yy + 42), "per year is a consumable — do not nurse a stretched one.",
                 10, MUTED, "start"))

    # =====================================================================
    # H .  SCRAPER AND RETURN-STRAND SKIDS
    # =====================================================================
    o.append(panel(40, 3070, 830, 720,
                   "H · SCRAPER, AND THE RETURN-STRAND SKIDS  —  ruling R3, a NEW part"))

    # ---- H1: the scraper, sectioned at the drive roller ------------------
    o.append(txt((100, 3104), "H1 · SCRAPER, AT THE DRIVE ROLLER", 11, INK, "start", "700"))
    o.append(txt((100, 3119), "8–10 mm RUBBER conveyor belt.  NEVER metal — a steel edge scores "
                              "the belt and eventually cuts it", 9.5, MECH, "start", "700"))
    SC = 1.55
    fsc = Flat(SC, 250, 3270)                  # u, v in mm about the drive-roller centre
    o.append(circ(fsc.p(0, 0), 31.5 * SC, fill="#f2c9c4", col=MECH, w=1.8))
    o.append(circ(fsc.p(0, 0), 10 * SC, fill="#b9c1cb", col=STEEL, w=1.2))
    o.append(line(fsc.p(-120, 31.5), fsc.p(-34, 31.5), PAN_L, 2.6))
    o.append(path("M " + f(fsc.p(-120, 34)[0]) + " " + f(fsc.p(0, 34)[1])
                  + " L " + f(fsc.p(0, 34)[0]) + " " + f(fsc.p(0, 34)[1])
                  + " A " + f(34 * SC) + " " + f(34 * SC) + " 0 0 1 "
                  + f(fsc.p(0, -34)[0]) + " " + f(fsc.p(0, -34)[1])
                  + " L " + f(fsc.p(-120, -34)[0]) + " " + f(fsc.p(0, -34)[1]),
                  col=BELT_L, w=4.2))
    o.append(txt((100, 3166), "pan ends here — the blade bears on the ROLLER,", 9.5, PAN_L,
                 "start", "700"))
    o.append(txt((100, 3179), "where the belt is backed by steel.  Never on an", 9.5, MUTED,
                 "start"))
    o.append(txt((100, 3192), "unsupported span.", 9.5, MUTED, "start"))
    o.append(txt((100, 3211), "belt in, LOADED →", 9.5, BELT_L, "start", "700"))
    o.append(txt((100, 3350), "← return strand, clean", 9.5, MUTED, "start"))
    o.append(line(fsc.p(-120, -63), fsc.p(-20, -63), STEEL, 3.0))
    o.append(txt((100, 3390), "skid, 63 mm below the pan seat", 9, STEEL, "start", "600"))
    # the blade, clamped between two flat bars, trailing ~35 deg
    ca, sa = math.cos(math.radians(35.0)), math.sin(math.radians(35.0))
    tipu, tipv = 38.0 * ca + 6, -38.0 * sa - 2
    o.append(line(fsc.p(tipu, tipv), fsc.p(tipu + 78 * ca, tipv - 78 * sa), MECH, 6.0))
    o.append(line(fsc.p(tipu + 18 * ca, tipv - 18 * sa),
                  fsc.p(tipu + 78 * ca, tipv - 78 * sa), STEEL, 3.4))
    o.append(circ(fsc.p(tipu + 84 * ca, tipv - 84 * sa), 4.6, fill=PAPER, col=STEEL, w=1.4))
    o.append(leadto(fsc.p(tipu + 6 * ca, tipv - 6 * sa)[0],
                    fsc.p(0, tipv - 6 * sa)[1], 424, 3216, MECH))
    o.append(txt((430, 3212), "only 15–20 mm PROJECTING —", 9.5, MECH, "start", "700"))
    o.append(txt((430, 3225), "that is how blade stiffness is set", 9.5, MUTED, "start"))
    o.append(leadto(fsc.p(tipu + 60 * ca, tipv - 60 * sa)[0],
                    fsc.p(0, tipv - 60 * sa)[1], 424, 3266, STEEL))
    o.append(txt((430, 3262), "clamped between two FLAT BARS", 9.5, STEEL, "start", "700"))
    o.append(txt((430, 3275), "HINGED — gravity or a light spring", 9.5, STEEL, "start", "700"))
    o.append(txt((430, 3288), "trailing ~30–45°, so it PEELS", 9.5, STEEL, "start", "700"))
    o.append(txt((430, 3312), "More pressure is not cleaner — it just", 9.5, MUTED, "start"))
    o.append(txt((430, 3325), "wears the belt.  The blade is the", 9.5, MUTED, "start"))
    o.append(txt((430, 3338), "consumable and must always be SOFTER", 9.5, MUTED, "start"))
    o.append(txt((430, 3351), "than the belt.  Make it quick to swap.", 9.5, MUTED, "start"))
    o.append(txt((100, 3424), "★ Cut the blades AFTER the belt, to the AS-BUILT belt width "
                              "(nominally 770 × 60 mm).", 10, MECH, "start", "700"))
    o.append(txt((100, 3438), "FULL WIDTH IN ONE PIECE, no butt joints — a joint leaves a "
                              "permanent un-scraped stripe.", 10, MECH, "start", "700"))
    o.append(txt((100, 3452), "12 blades + 12 grooved lagging wraps come out of ONE piece of "
                              "8–10 mm rubber conveyor belt,", 10, MUTED, "start"))
    o.append(txt((100, 3466), "at least 800 mm wide × 4 m — the 770 mm must run ACROSS the piece "
                              "in one go.", 10, MUTED, "start"))

    # ---- H2: the skid, hung off a pan cross-bar --------------------------
    o.append(txt((100, 3500), "H2 · RETURN-STRAND SKID — hung off a pan cross-bar",
                 11, INK, "start", "700"))
    SK = 1.90
    fsk = Flat(SK, 180, 3670)                  # u, v in mm
    o.append(rect(fsk.p(-30, 40), 60 * SK, 3 * SK, fill="#b9c1cb", col=STEEL, sw=1.4))
    o.append(rect(fsk.p(-30, 40), 3 * SK, 40 * SK, fill="#b9c1cb", col=STEEL, sw=1.4))
    o.append(line(fsk.p(-34, 40), fsk.p(34, 40), STEEL, 2.6))
    o.append(line(fsk.p(-34, 41), fsk.p(34, 41), PAN_L, 2.0))
    o.append(txt((250, 3588), "PAN SEAT — top face of the", 9.5, STEEL, "start", "700"))
    o.append(txt((250, 3601), "40 × 40 × 3 cross-bar", 9.5, STEEL, "start", "700"))
    o.append(rect(fsk.p(-2, 38), 4 * SK, 61 * SK, fill="#e7ebef", col=STEEL, sw=1.3))
    o.append(txt((250, 3634), "25 × 3 flat strap, 180 off", 9.5, STEEL, "start", "700"))
    o.append(rect(fsk.p(-10, -23), 20 * SK, 3 * SK, fill="#b9c1cb", col=STEEL, sw=1.5))
    o.append(rect(fsk.p(-10, -23), 3 * SK, 20 * SK, fill="#b9c1cb", col=STEEL, sw=1.5))
    o.append(line(fsk.p(-16, -23), fsk.p(16, -23), BELT_L, 3.2, dash="8 4"))
    o.append(txt((250, 3708), "20 × 20 × 3 galvanised angle,", 9.5, STEEL, "start", "700"))
    o.append(txt((250, 3721), "HORIZONTAL LEG UP", 9.5, STEEL, "start", "700"))
    o.append(txt((250, 3734), "the return strand slides on the 20 mm flat", 9, BELT_L, "start"))
    o.append(dim_v(fsk.p(-24, 0)[0], fsk.p(0, 40)[1], fsk.p(0, -23)[1], "", MECH))
    o.append(txt((fsk.p(-24, 0)[0] - 6, fsk.p(0, 12)[1]), "63", 11, MECH, "end", "700"))
    o.append(txt((fsk.p(-24, 0)[0] - 6, fsk.p(0, 2)[1]), "EXACTLY", 8.5, MECH, "end", "700"))

    nx = 470
    o.append(txt((nx, 3500), "THE SKID, IN NUMBERS", 11, INK, "start", "700"))
    yy = 3520
    for a, b in [("Member", "20 × 20 × 3 galvanised angle, leg UP"),
                 ("Runs / module", "3 — centreline and ±250 mm"),
                 ("Length", "★ ~7.3 m (D97), NOT 7.42 m"),
                 ("", "= one 6 m length + a 1.3 m piece,"),
                 ("", "butt-welded OVER a cross-bar"),
                 ("Fixing", "off all 5 pan cross-bars"),
                 ("Datum", "★ top face EXACTLY 63 mm below"),
                 ("", "the pan seat"),
                 ("Quantity", "36 runs · 45 lengths · 180 straps")]:
        o.append(txt((nx, yy), a, 9.5, INK, "start", "700"))
        o.append(txt((nx + 90, yy), b, 9.5, MECH if b.startswith("★") else MUTED, "start",
                     "700" if b.startswith("★") else "400"))
        yy += 15
    t, yy = wrap(nx, yy + 10, 380,
                 "Why an ANGLE and not a flat bar: a flat bar laid flat is far too floppy over "
                 "1830 mm, and a flat bar on edge presents a 3 mm edge to the belt — a knife.",
                 9.5, 12.5)
    o.append(t)
    t, yy = wrap(nx, yy + 8, 380,
                 "Why THREE runs and not two: at ±200 mm the belt edge cantilevers 185 mm and "
                 "droops ~20 mm, which eats the entire remaining clearance.  Three gives 135 mm "
                 "and ~5.8 mm.", 9.5, 12.5)
    o.append(t)
    t, yy = wrap(nx, yy + 8, 380,
                 "★ Do NOT put bearing strips on the cage roof instead.  It puts the belt in "
                 "contact with something directly over the birds, and tier 1 has no cage below "
                 "it anyway.", 9.5, 12.5, MECH, "700")
    o.append(t)

    # =====================================================================
    # J .  THE BELT -- site-cut HDPE geomembrane
    # =====================================================================
    o.append(panel(900, 3070, 800, 720,
                   "J · THE BELT  —  SITE-CUT HDPE GEOMEMBRANE.  THE PP ORDER HAS LAPSED"))
    o.append(txt((930, 3104), "★ NOBODY ORDERS A 770 mm BELT ANY MORE  (G5 gates the cut)",
                 11.5, MECH, "start", "700"))
    t, _ = keylist(930, 3126, [
        ("BUILD THE FRAMES FIRST.",
         "The ROLLER is now the thing that has to be right before the belt exists. Make one "
         "roller pair, build the trial frame, measure, and only then commit the other 22."),
        ("MEASURE THE CLEAR SPAN AT ALL FIVE FRAMES; TAKE THE SMALLEST.", None),
        ("SUBTRACT 43 mm.  ROUND DOWN TO THE NEAREST 5 mm.",
         "Cut to that with a HOT KNIFE — a soldering iron with a flattened tip, which melts and "
         "seals as it cuts. A site-cut homogeneous sheet has no factory edge to preserve: "
         "fraying needs fibres and there are none."),
    ], w=700, gap=24)
    o.append(t)
    o.append(txt((930, 3258), "Buying or cutting the belt before the frames exist is the one "
                              "mistake in this build that cannot be corrected.",
                 10, MECH, "start", "700"))

    o.append(txt((930, 3282), "WHAT TO BUY, AND THE TRAP", 11, INK, "start", "700"))
    yy = 3302
    for a, b in [("Material", "★ SMOOTH, UNREINFORCED HDPE or LLDPE geomembrane"),
                 ("Thickness", "1.0 mm recommended · 0.75 acceptable · ★ REJECT 0.5 mm"),
                 ("Carbon black", "2–3%"),
                 ("Surface", "★ SMOOTH — NEVER TEXTURED.  Manure keys into texture and the"),
                 ("", "scraper cannot clear it.  Buying textured writes off the purchase"),
                 ("Where", "a geosynthetics / construction supplier — NOT an agro-dealer"),
                 ("Storage", "ROLLED, never folded.  Heat, not sunlight, is the enemy")]:
        o.append(txt((930, yy), a, 9.5, INK, "start", "700"))
        o.append(txt((1018, yy), b, 9.5, MECH if b.startswith("★") else MUTED, "start",
                     "700" if b.startswith("★") else "400"))
        yy += 15
    t, _ = wrap(930, 3420, 700,
                "★ THE TRAP HAS A NAME.  Most of what is sold in Nigeria as \"fish pond liner\" "
                "is WOVEN PLASTIC TAPE with a coating on both sides — one maker calls it "
                "\"reinforced tarpaulin (genuine HDPE)\".  It is cheaper, so it looks like the "
                "bargain, and every cut edge soaks up urine and rots.  Ask for GEOMEMBRANE, "
                "UNREINFORCED.  Two counter tests, thirty seconds each: cut a corner off — solid "
                "black all the way through like a thick bin bag is right, a criss-cross weave "
                "inside is wrong, walk away.  And drop a piece in water: real geomembrane FLOATS, "
                "PVC sinks.", 9.5, 12.5, MECH, "700")
    o.append(t)

    # the lap joint
    o.append(txt((930, 3520), "J2 · THE JOINT — 40 mm LAP, HOT AIR, AND A CLAMP",
                 11, INK, "start", "700"))
    jy = 3556
    o.append(rect((1000, jy - 24), 290, 9, fill="#e7ebef", col=STEEL, sw=1.3))
    o.append(rect((1000, jy + 12), 290, 9, fill="#e7ebef", col=STEEL, sw=1.3))
    o.append(line((1000, jy - 4), (1170, jy - 4), BELT_L, 7))
    o.append(line((1130, jy + 3), (1300, jy + 3), BELT_L, 7))
    o.append(rect((1130, jy - 8), 40, 15, fill="#f6d8d4", col=MECH, sw=1.4))
    o.append(dim_h(1130, 1170, jy + 40, "40 mm lap", MECH, 9.5))
    o.append(txt((1150, jy - 32), "one CONTINUOUS seam", 9.5, MECH, "middle", "700"))
    o.append(txt((1310, jy - 18), "two STRAIGHT BARS, clamped while", 9.5, STEEL,
                 "start", "700"))
    o.append(txt((1310, jy - 5), "welding AND while cooling —", 9.5, STEEL, "start", "700"))
    o.append(txt((1310, jy + 8), "HDPE CURLS", 9.5, MECH, "start", "700"))
    o.append(txt((1310, jy + 26), "40 mm lap.  Do NOT widen it to the", 9.5, MUTED, "start"))
    o.append(txt((1310, jy + 39), "trade's usual 100 mm — a longer", 9.5, MUTED, "start"))
    o.append(txt((1310, jy + 52), "stiff zone lifts off the roller.", 9.5, MUTED, "start"))
    o.append(line((1080, jy + 58), (1030, jy + 58), MECH, 2.2))
    o.append(poly([(1030, jy + 58), (1038, jy + 54), (1038, jy + 62)], fill=MECH, col=MECH, w=1))
    o.append(txt((1086, jy + 61), "travel: the upper sheet's free edge faces it,", 9.5, MECH,
                 "start", "700"))
    o.append(txt((1086, jy + 74), "so the scraper rides UP onto the lap", 9.5, MECH,
                 "start", "700"))
    o.append(txt((930, jy + 100), "★ WELD AT 250–300 °C — the HDPE setting.  A hire shop will "
                                  "default to 180–230 °C; set it yourself.  ★ HDPE ONLY: it "
                                  "will not", 10, MECH, "start", "700"))
    o.append(txt((930, jy + 114), "weld to polypropylene or PVC, so practise on HDPE offcuts.  "
                                  "One continuous seam across the full width: spot welds leave "
                                  "liquid paths and every gap starts a peel.",
                 10, MECH, "start", "700"))
    o.append(txt((930, jy + 132), "CUTTING PLAN (D95): each loop is 15.5 m × the site-measured "
                                  "width, 13 loops — 12 plus one spare.  On the common 8 m stock "
                                  "roll,", 10, INK, "start", "700"))
    o.append(txt((930, jy + 146), "cut ACROSS it: 8.00 + 7.58 m = TWO strips, TWO welds per loop, "
                                  "26 for the house, ~22 m of roll ≈ 176 m².", 10, MUTED,
                 "start"))
    o.append(txt((930, jy + 160), "★ Do NOT plan to cut 15.5 m strips LENGTHWISE off an 8 m roll "
                                  "— 31 m of roll for 13 belts, ~37% waste, about ₦390,000 "
                                  "thrown away.", 10, MECH, "start", "700"))
    o.append(txt((930, jy + 174), "★ ASK BEFORE ORDERING: at ~1.55 m or ~2.31 m roll width the "
                                  "strips run ALONG the roll and it is ONE weld per loop.  It is "
                                  "a phone call.", 10, MECH, "start", "700"))
    o.append(txt((930, jy + 192), "Prove the joint on offcuts first: pull it (the sheet should "
                                  "tear before the weld), wrap it round a 63 mm pipe 20 times "
                                  "each way, pool", 10, MUTED, "start"))
    o.append(txt((930, jy + 206), "water on it for an hour.  Mark every finished lap with two "
                                  "dots of paint on the pan lip so it can be found for the "
                                  "weekly check.", 10, MUTED, "start"))
    o.append(txt((930, jy + 220), "Keep every offcut — HDPE welds to HDPE indefinitely, and the "
                                  "catch-tray liners come out of the same offcuts.", 10, MUTED,
                 "start"))

    # =====================================================================
    # K .  WATER LINE ROUTING -- the CONFIRMED route, and the THREE keep-out bands
    # =====================================================================
    o.append(panel(40, 3810, 1660, 500,
                   "K · WATER LINE ROUTING  —  BUCKET, ONE T, TWO PIPES, SIX INLETS.  "
                   "THERE ARE THREE KEEP-OUT BANDS, NOT TWO"))
    SW = 4.4
    fw = Flat(SW, 160, 4286)                   # u = z inches ; v = height above floor
    o.append(water_section(fw))
    o.append(txt(fw.p(D["depth"] / 2, -3.4), "ONE ROW, AT THE FRONT FRAME  ·  "
                 "6 INLETS  ·  3 tiers × 2 sides", 9.5, WATER, "middle", "700"))

    kx = 620
    o.append(txt((kx, 3864), "★ THE RULE", 11.5, MECH, "start", "700"))
    t, yy = wrap(kx, 3882, 460,
                 "Nothing may enter a keep-out band except the BELT, the PAN and the "
                 "CROSS-BAR that carries the pan.  No pipe, no fitting, no valve, no hose "
                 "loop, no clip, no hanger.  Anything in one of those bands is dragged by "
                 "the belt on every pass — and the belt is now driven by a motor that will "
                 "not notice.", 10, 13)
    o.append(t)
    o.append(txt((kx, yy + 16), "★ THE TAPE CHECK — ONE HEIGHT RULE AND THREE BANDS",
                 11, MECH, "start", "700"))
    yy += 34
    o.append(txt((kx, yy), '28 / 51 / 74"', 10.5, WATER, "start", "700"))
    o.append(txt((kx + 86, yy), "every HORIZONTAL run of water, and nothing else",
                 10, WATER, "start", "700"))
    o.append(txt((kx + 86, yy + 14), "— the nipple-line heights, 3\" under each cage roof",
                 10, MUTED, "start"))
    yy += 32
    for ka, kb in KEEPOUT:
        o.append(rect((kx, yy - 10), 80, 14, fill="#f7d9d5", col="#eec4bd", sw=0.9, r=2))
        o.append(txt((kx + 40, yy), '%d–%d"' % (ka, kb), 10, MECH, "middle", "700"))
        o.append(txt((kx + 86, yy), "NOTHING water-related, at any height, anywhere",
                     10, MECH, "start", "700"))
        yy += 17
    t, yy = wrap(kx, yy + 8, 460,
                 "THREE bands, not two.  12–17\" is tier 1's own belt zone and it is a "
                 "keep-out band exactly like the two dropping gaps above it.  28 / 51 / 74 "
                 "are all 3\" under their cage roofs (roofs at 31 / 54 / 77\"), i.e. inside "
                 "the cage volume — and every band starts exactly where a roof is.  A "
                 "plumber who has never read the design document can check all four numbers "
                 "with a tape.", 10, 13)
    o.append(t)
    o.append(txt((kx, yy + 16), "★ WATER AND DRIVE SHARE NO STATION", 11, MECH,
                 "start", "700"))
    t, yy = wrap(kx, yy + 34, 460,
                 "All the water is at the FRONT frame.  All the drive — both drop chains, "
                 "the line shafts and the cross-aisle propshaft — is 278\" away at the "
                 "REAR.  And because both drops sit inside the nook of an angle upright, "
                 "the pipework takes no aisle width on either side of the row, so neither "
                 "aisle has to be reserved for it.", 10, 13)
    o.append(t)

    ux = 1140
    o.append(txt((ux, 3864), "HOW THE WATER RUNS  —  SIX INLETS, TWO PER TIER",
                 11.5, INK, "start", "700"))
    t, yy = wrap(ux, 3882, 540,
                 "A BUCKET on its OWN HOLDER — the holder stands on the floor and carries "
                 "the water; it is tied to the frame for ELEVATION ONLY, and the cage angle "
                 "carries none of it.  ONE T at the bucket splits into TWO pipes, one per "
                 "side of the row.  Each pipe drops INSIDE THE L of its angle upright, 15 mm "
                 "off both legs.  THREE Ts per side, one per tier, feed SIX inlets — and "
                 "each tier gets TWO nipple lines, one per cage side.", 10, 13)
    o.append(t)
    yy += 10
    for s, col, w_ in [
            ("THE ANGLE'S INSIDE CORNER IS THE PIPE CHASE.", MECH, "700"),
            ("The nook opens AWAY from the belt (D53: heel into the belt), so the pipe stays "
             "inside the steel's own outline — nothing in an", MUTED, "400"),
            ("aisle, nothing in a band, nothing near a belt or a roller.  Clip it to the "
             "legs; never clip on the belt side of the angle.", MUTED, "400"),
            ("EACH INLET STEPS ~75 mm DOWN-ROW before it turns in.", MECH, "700"),
            ("That is how it passes the angle's SPAN LEG instead of going through it — "
             "★ THE SPAN LEG IS NOT DRILLED, at any", MUTED, "400"),
            ("frame, for any pipe: its outer face is the cage face and the roller-face "
             "datum (D53).  In through ONE grommet or", MUTED, "400"),
            ("short sleeve in the cage mesh, then a tee into that cage side's nipple line, "
             "which carries on both ways.", MUTED, "400"),
            ("AND THE CHASE ONLY WORKS AT A CAGE FRAME — x = 0.", MECH, "700"),
            ("At a cage frame the nook is clear floor to top.  At the IDLER POST (x = −8\") "
             "and the DRIVE-STATION POST (x = 14\")", MUTED, "400"),
            ("the same nook carries the BEARING-BOLT NUTS.  So both drops stay on the cage "
             "frame — never tidied onto a post.", MUTED, "400"),
            ("BOTH NIPPLE LINES SIT 180 mm INBOARD OF A BELT EDGE.", MECH, "700"),
            ("That is the proof the route is safe: every drip lands on the belt, and the "
             "belt is cleared twice a day.", MUTED, "400"),
            ("Hang the nipple line UNDER the cage roof — never lay it ON TOP.", MECH, "700"),
            ("A line resting on a cage roof is sitting in the band above it.  That is the "
             "one mistake to watch for.", MUTED, "400"),
            ("RIGID PIPE throughout.  NEVER a flexible loop.", MECH, "700"),
            ("A hose sags, and below it is a cage floor with a belt under that.  Tie back "
             "every flexible tail; no free loops below cage-floor level.", MUTED, "400"),
            ("A DRAIN COCK at the foot of each drop — it is the low point.", MECH, "700"),
            ("It empties the drop and lets you flush after medication.", MUTED, "400"),
            ("FLUSH OUTLET AT THE REAR, piped over the end of the belt.", MECH, "700"),
            ("A flush is several litres — far more than the pan and belt can carry.  Never "
             "flush into the middle of the run.", MUTED, "400")]:
        o.append(txt((ux, yy), s, 10, col, "start", w_))
        yy += 14
    o.append(txt((ux, yy + 12), "Routine nipple DRIP onto the belt is fine and expected.  "
                                "The manure is wet by design, the belt is", 10, MUTED,
                 "start"))
    o.append(txt((ux, yy + 26), "liquid-tight, and it is cleared twice a day.", 10, MUTED,
                 "start"))

    # L .  TOLERANCES, THE FIVE THINGS, AND THE GATED ITEMS
    # =====================================================================
    o.append(panel(40, 4330, 1660, 675,
                   "L · THE TOLERANCES, THE FIVE THINGS THAT DECIDE WHETHER THIS WORKS, "
                   "AND THE GATED ITEMS"))

    o.append(txt((80, 4384), "THE FIVE THINGS THAT DECIDE WHETHER THIS WORKS",
                 11.5, INK, "start", "700"))
    yy = 4404
    for i, (a, b) in enumerate([
            ("End rollers parallel and square",
             "Within 1 mm, at both ends of every tier. This is the number one cause of a belt "
             "that will not track."),
            ("Crown the rollers",
             "1–2 mm larger at the centre. This is what makes the belt self-centre; a perfectly "
             "straight roller will not."),
            ("Pan bars off a string line",
             "Inconsistent heights make the pan wavy and the belt picks a side and stays there."),
            ("Fall to the rear — by PACKING, not by tilting the steel",
             "25 mm at the front frame, tapering to zero. Panel E."),
            ("Paint or galvanise everything, sealed bearings",
             "The rust on the existing stands is what seizes rollers, and a seized roller means "
             "dragging the belt, which destroys it.")]):
        o.append(circ((92, yy - 4), 10, fill=MECH, col=MECH, w=1))
        o.append(txt((92, yy), str(i + 1), 10.5, PAPER, "middle", "700"))
        o.append(txt((110, yy), a, 10.5, INK, "start", "700"))
        t, yy = wrap(110, yy + 14, 430, b, 9.5, 12.5)
        o.append(t)
        yy += 8

    o.append(txt((640, 4384), "THE TOLERANCES — AND WHY THEY ARE THIS TIGHT",
                 11.5, INK, "start", "700"))
    o.append(txt((640, 4404), "A MOTOR RUNS THE DRIFT ALL THE WAY TO THE PAN LIP WITHOUT "
                              "PAUSING, unwatched, every run.", 10, MECH, "start", "700"))
    yy = 4444
    o.append(txt((640, yy), "", 10))
    for a, b, c in [("Roller axes parallel", "~2 mm", "★ 1 mm over the 790 mm face"),
                    ("Square to the run", "—", "★ within 2 mm"),
                    ("Outboard shaft projections", "—",
                     "★ IDENTICAL both ends — 118.5 mm. Measure both"),
                    ("Sprocket faces coplanar", "—", "★ within 1 mm across a station"),
                    ("Pan cross-bar heights", "string line",
                     "string line — and it still matters most")]:
        o.append(txt((640, yy), a, 10, INK, "start", "700"))
        o.append(txt((820, yy), b, 10, MUTED, "start"))
        o.append(txt((884, yy), c, 10, MECH if c.startswith("★") else MUTED, "start",
                     "700" if c.startswith("★") else "400"))
        yy += 15
    t, yy = wrap(640, yy + 12, 560,
                 "Where the 1 mm comes from: 10 mm of belt-to-lip clearance divided by 7.264 m "
                 "of run.  That is the whole derivation, and it is why 1 mm is a limit and "
                 "not a target.", 10, 13)
    o.append(t)
    o.append(txt((640, yy + 18), "★ TRACKING WITNESS MARKS — the cheapest item in the whole "
                                 "build", 11, MECH, "start", "700"))
    t, yy = wrap(640, yy + 36, 560,
                 "Paint a vertical WHITE STRIPE on the pan lip at BOTH ends of ALL TWELVE "
                 "modules, lined up with the centred belt edge, and mark the set position of "
                 "every tensioner nut.  A 5 mm drift then shows from the aisle, from a standing "
                 "position, in one second.  Walk the row after every run — thirty seconds.  It "
                 "is the only thing in the whole design that catches mistracking: the torque "
                 "limiter cannot see it.", 10, 13, MECH, "700")
    o.append(t)

    o.append(txt((1250, 4384), "★ GATED — NOTHING IS CUT OR ORDERED UNTIL THESE PASS",
                 11.5, MECH, "start", "700"))
    yy = 4408
    for n, s in [("1", "UCP204 + 38T bench check, before ANY metal is"),
                 ("", "welded at a drive station."),
                 ("2", "One TIER-2 hopper and its 100 mm channel taken"),
                 ("", "through a LOADED run, before any chute or guard"),
                 ("", "metal is cut.  (Tier 1 has no hopper — R7 / D105.)"),
                 ("3", "The prototype pull test, before anything is ordered."),
                 ("4", "The 2 L flush proved on that same hopper —"),
                 ("", "TWO channel mouths per row, 4 L a row, 8 channels,"),
                 ("", "16 L/day for the house."),
                 ("5", "★ TIER 1's SPLATTER, CHALKED.  Run tier 1 bare,"),
                 ("", "tip a full 17.6 kg load over its roller and mark the"),
                 ("", "floor where it actually lands — nobody has measured"),
                 ("", "a free discharge at 305 mm.  MEASURE REARWARD FROM"),
                 ("", "THE ROLLER PLANE AT x = 14\":  ACCEPT if the patch"),
                 ("", "stops inside x = 26\", i.e. within ±305 mm.  Throws"),
                 ("", "past → a 150 mm APRON on the shroud's open rear"),
                 ("", "face — NOT a chute and NOT a bigger tray.  It gates"),
                 ("", "THE FOUR APRONS AND FOLDING THE FOUR SHROUDS: the"),
                 ("", "trays are 1.0 × 0.6 m on geometry and are not gated."),
                 ("", "Chalk the across-row spread too, and write it down."),
                 ("6", "★ PRE-WELD, AT THE REAR FLOOR: the two drive-"),
                 ("", "station post feet at x = 14\" stay ~1100 mm CLEAR,"),
                 ("", "foot to foot.  The tier-1 tray draws out REARWARD"),
                 ("", "between them with ~50 mm each side, so NO foot is"),
                 ("", "splayed, cranked or foot-plated OUTBOARD for an"),
                 ("", "easier fit-up.  Check it before the post is set.")]:
        if n:
            o.append(txt((1250, yy), n, 13, MECH, "start", "700"))
        o.append(txt((1268, yy), s, 10, INK, "start", "700"))
        yy += 17
    t, yy = wrap(1250, yy + 14, 420,
                 "One 450 mm emergency handle hangs on a nail by the switchboard, on a removable "
                 "two-bolt coupling at the gearbox output, for the day the generator will not "
                 "start.  It is a TOOL, not part of the machine.", 10, 13)
    o.append(t)
    t, yy = wrap(1250, yy + 10, 420,
                 "ISOLATE AND PADLOCK before any hand goes near a belt, a chute or a tray.  "
                 "The isolator is on the rear end face of each half, in sight of all six of "
                 "its belts.", 10, 13, MECH, "700")
    o.append(t)
    o.append(txt((1250, yy + 26), "Source: reference/design.md §8 + §15 · decisions.md",
                 9.5, MUTED, "start"))
    o.append(txt((1250, yy + 39), "D1–D113 · and the Rev C WELDER BRIEF.  Where this",
                 9.5, MUTED, "start"))
    o.append(txt((1250, yy + 52), "sheet and the brief disagree, THE BRIEF WINS.",
                 9.5, INK, "start", "700"))

    write("manure-belt-REVC-4-details.svg", W, H, "".join(o))

















# ============================================================================
# DRAWING 5 -- FRONT END: the water supply and the idler, kept apart
# ============================================================================
def valve_flat(fl, u, v, s=4.3, col=MECH):
    """Ball valve: body + lever, in a Flat view."""
    c = fl.p(u, v)
    return "".join([
        poly([(c[0] - s, c[1]), (c[0], c[1] - s * 0.72), (c[0] + s, c[1]),
              (c[0], c[1] + s * 0.72)], fill="#f6d8d4", col=col, w=1.4),
        line(c, (c[0] + s * 2.1, c[1] - s * 1.1), col, 2.3),
        circ((c[0] + s * 2.1, c[1] - s * 1.1), 2.0, fill=col, col=col, w=1),
    ])


def keepout_box(iso, x0, x1, y0, y1, z0, z1, mode="fill"):
    """The dropping gap drawn as a volume nothing may be put into.

    Called twice: mode="fill" before the belt goes in, mode="edge" after, so the
    belt reads as being *inside* the band rather than hidden behind it.
    """
    F, C = "#f7d9d5", "#c9756a"
    faces = [
        [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)],   # top
        [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],   # near
        [(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)],   # right end
    ]
    out = []
    for i, fc in enumerate(faces):
        pts = [iso.p(*q) for q in fc]
        if mode == "fill":
            out.append(poly(pts, fill=F, col="none", w=0, op=0.55 - i * 0.08))
        else:
            out.append(poly(pts, fill="none", col=C, w=1.2, dash="6 4"))
    return "".join(out)


def lead(p, tp, s, col=INK, size=11, weight="700", anchor="start"):
    """Dashed leader from a point on the picture to a label."""
    dx = 6 if anchor == "start" else -6
    return (line(p, tp, col, 0.9, dash="3 3")
            + txt((tp[0] + dx, tp[1] + 4), s, size, col, anchor, weight))


# ============================================================================
# DRAWING 5 (REV C) -- FRONT END: the idler shelf, the tensioner, the pan
#   packing, and the WATER ROUTE as confirmed.
#   D55 (shelf replaces the bracket) - the water: bucket on its own holder, one
#   T, two pipes, each dropping inside the L of its angle upright, three Ts per
#   side, six inlets, two nipple lines per tier 180 mm inboard of the belt
#   edges - D93 (roller top FLUSH with the pan, centres ~10.8/33.8/56.8) -
#   D94 (cross-bars dead level, pan PACKED UP 25 mm AT THIS END).
# ============================================================================
FC_WALL = -14.0                     # front wall face -- the 14" front allocation
FC_IDLER = -float(D["front_off"])   # -8" : idler centre AND the idler-station post
FC_SHELF = mm(150)                  # 150 mm of 50 x 50 x 5, welded FLAT (D55)
FC_SLOT = mm(60)                    # 60 mm of take-up travel, slots ALONG the row
FC_BOLT = mm(95)                    # the two bolt holes, 95 mm centres
FC_SHAFT = mm(130)                  # shaft end past the roller face, into the aisle
FC_PACK = mm(25)                    # D94: pan packed up 25 mm AT THIS FRAME
FC_SEAT = mm(33)                    # UCP204 base face to shaft centre
FC_NEED = mm(50)                    # HDPE thermal minimum (D59)
FC_BLK = float(D["depth"]) + 1.5    # UCP204 body centre, outboard on the shelf
REVC5 = "REV C  |  2026-09-18"       # this sheet, re-issued

# ★ D93's field rule MEETS D94's packing, and nobody has written the answer down:
# the pan SURFACE at this frame is one packing thickness high, so the IDLER centre
# is 25 mm ABOVE the drive roller's 10.8 / 33.8 / 56.8.
PAN_SURF_F = [p + FC_PACK + PAN_T for p in PAN]                 # 13.0 / 36.0 / 59.0
IDLE_Y = [s - D["roller_d"] / 2 for s in PAN_SURF_F]            # ~11.8 / 34.8 / 57.8


def slotbolt(p, ln, col=STEEL):
    """A take-up slot drawn along the row: a capsule with a bolt in it."""
    return "".join([
        f'<rect x="{f(p[0] - ln / 2)}" y="{f(p[1] - 3.0)}" width="{f(ln)}" '
        f'height="6.0" rx="3" fill="#e7eaee" stroke="{col}" stroke-width="1.2"/>',
        circ((p[0] - ln / 2 + 3.2, p[1]), 2.5, fill=MECH, col=MECH, w=0.8),
    ])


def shroud(p, w=15, h=13):
    """Fixed, non-rotating shaft-end shroud (D65) -- a capped box, hatched."""
    return "".join([
        rect((p[0] - w / 2, p[1] - h / 2), w, h, fill="#ecedf0", col=MUTED, sw=1.3, r=2),
        line((p[0] - w / 2 + 2, p[1] + h / 2 - 2), (p[0] + w / 2 - 2, p[1] - h / 2 + 2),
             MUTED, 0.8),
        line((p[0] - w / 2 + 2, p[1] - h / 2 + 2), (p[0] + w / 2 - 2, p[1] + h / 2 - 2),
             MUTED, 0.8),
    ])


def drawing_frontend_c():
    W, H = 1760, 2210
    o = [header(W, "5 · FRONT END  —  the idler shelf, the tensioner and the WATER ROUTE",
                "The door/water end.  Only ~6\" to the wall.  A bucket on its own holder, "
                "ONE T, TWO pipes — each one dropping inside the L of its angle upright — "
                "THREE Ts per side, SIX inlets, SIX nipple lines.",
                rev=REVC5, strap=STRAP_C)]
    z0, z1 = 0.0, float(D["depth"])
    pz0, pz1 = (z1 - D["pan_w"]) / 2, z1 - (z1 - D["pan_w"]) / 2
    bz0, bz1 = (z1 - D["belt_w"]) / 2, z1 - (z1 - D["belt_w"]) / 2
    zdiv = z1 / 2
    zsh = pz1 + FC_SHAFT                        # shaft end, 130 mm past the roller face
    xr = 62                                     # how far down the row the flat views run
    T = 1                                       # the tier drawn in detail
    yseat, yf, yt, yn = PAN[T], FLOOR[T], TOP[T], NIPPLE[T]
    ysurf, yroll = PAN_SURF_F[T], IDLE_Y[T]
    yshelf = yroll - FC_SEAT
    ygap0 = TOP[T - 1]

    # ========================================================================
    # A -- ISOMETRIC, ONE TIER (three tiers at once is unreadable)
    # ========================================================================
    o.append(panel(40, 80, 915, 740,
                   "A · ONE TIER AT THE FRONT END, IN 3-D   (tier 2 shown — tiers 1 and 3 "
                   "repeat it exactly.  The shelf is drawn to scale in panel C)"))
    xa, xb = -16.0, 10.0
    iso = Iso(9.5, 509, 779)
    o.append(keepout_box(iso, xa + 1, xb, ygap0 + 1.0, yf, z0, z1, "fill"))

    # ---- the frame: far cage leg, the DEAD LEVEL cross-bar, the packing ----
    o.append(line(iso.p(0, ygap0 - 2, z0), iso.p(0, yt + 3, z0), STEEL, 6.0))
    o.append(crossbar(iso, 0, yseat, z0, z1, STEEL, 4.4))
    for zz in (pz0 + 2.0, zdiv, pz1 - 2.0):        # packing shims on a level bar
        a, b = iso.p(0, yseat, zz), iso.p(0, ysurf, zz)
        o.append(line(a, b, MECH, 3.4))

    # ---- pan (packed up), belt on it, manure ----
    o.append(slab_xz(iso, ysurf, 1.0, FC_IDLER, xb, pz0, pz1, PAN_F, PAN_L, 1.0, 0.95))
    o.append(slab_xz(iso, ysurf + 0.55, 0.8, FC_IDLER, xb, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
    o.append(manure_on_belt(iso, ysurf + 1.6, 2, xb - 2, bz0, bz1, 5))

    # ---- the idler: TOP FLUSH WITH THE PAN SURFACE (D93) ----
    o.append(roller(iso, FC_IDLER, yroll, bz0 - 0.7, bz1 + 0.7))
    o.append(line(iso.p(FC_IDLER, yroll, pz0), iso.p(FC_IDLER, yroll, pz1), MECH, 2.0, op=0.5))
    # shaft ends, both aisles, 130 mm out, with FIXED shrouds
    for zz, sg in ((pz0, -1), (pz1, +1)):
        o.append(line(iso.p(FC_IDLER, yroll, zz), iso.p(FC_IDLER, yroll, zz + sg * FC_SHAFT),
                      STEEL, 3.4))
        o.append(shroud(iso.p(FC_IDLER, yroll, zz + sg * (FC_SHAFT - 0.8))))

    # ---- the idler-station POST and its horizontal SHELF (D55) ----
    for zz in (z0, z1):
        o.append(line(iso.p(FC_IDLER, ygap0 - 2, zz), iso.p(FC_IDLER, yt + 3, zz), STEEL, 5.2))
    sx0, sx1 = FC_IDLER - FC_SHELF / 2, FC_IDLER + FC_SHELF / 2
    o.append(slab_xz(iso, yshelf, 0.55, sx0, sx1, z1, z1 + mm(50), "#dfe4ea", STEEL, 1.4, 1.0))
    for xx in (FC_IDLER - FC_BOLT / 2, FC_IDLER + FC_BOLT / 2):
        o.append(slotbolt(iso.p(xx, yshelf, z1 + mm(25)), FC_SLOT * 7.3 * C30))
    pb = iso.p(FC_IDLER, yshelf, FC_BLK)
    o.append(rect((pb[0] - 10, pb[1] - 15), 20, 15, fill="#eef1f4", col=STEEL, sw=1.5, r=2))
    o.append(circ((pb[0], pb[1] - 7), 3.0, fill=PAPER, col=STEEL, w=1.3))
    # push-bolt: axis ALONG the row, head at the wall end, turned from the AISLE
    lg = iso.p(sx0 - 0.4, yshelf, FC_BLK)
    o.append(line(lg, (lg[0], lg[1] - 13), MECH, 3.2))
    o.append(line((lg[0], lg[1] - 8), (pb[0] - 10, lg[1] - 8), MECH, 2.4))
    o.append(circ((lg[0] - 4, lg[1] - 8), 3.2, fill="#f6d8d4", col=MECH, w=1.5))
    o.append(spring((lg[0] - 1, lg[1] - 8), (pb[0] - 11, lg[1] - 8), 5, 2.4, MECH, 1.1))

    o.append(keepout_box(iso, xa + 1, xb, ygap0 + 1.0, yf, z0, z1, "edge"))
    o.append(line(iso.p(0, ygap0 - 2, z1), iso.p(0, yt + 3, z1), STEEL, 6.0))
    o.append(txt(iso.p(xb, ygap0 + 4.8, z1), "KEEP OUT", 11.5, MECH, "middle", "700"))

    # ---- the cage above, and the water ----
    o.append(cage_box(iso, 0, xb, yf, yt, z0, z1, mesh=True, op=0.20))
    o.append(quad_xz(iso, yf, 0, xb, z0, z1, "#eef3ee", CAGE_L, 0.8, 0.5))
    for a, b in (((0, yf, zdiv), (0, yt, zdiv)), ((0, yt, zdiv), (xb, yt, zdiv)),
                 ((xb, yf, zdiv), (xb, yt, zdiv))):
        o.append(line(iso.p(*a), iso.p(*b), CAGE_L, 1.1, op=0.6))
    # THE ROUTE: drop INSIDE THE L of the upright -> T -> step past the span
    # leg -> in through a grommet -> the tier's TWO nipple lines
    zch = z1 + W_CHASE                       # the drop, in the angle's nook
    o.append(line(iso.p(0, ygap0 - 1, zch), iso.p(0, yt + 10, zch), WATER, 4.6))
    tp = iso.p(0, yn, zch)
    o.append(circ(tp, 4.0, fill="#dff1fa", col=WATER, w=2.0))
    o.append(line(iso.p(0, yn, zch), iso.p(W_STEP, yn, zch), WATER, 3.0))
    o.append(line(iso.p(W_STEP, yn, zch), iso.p(W_STEP, yn, NIP_Z[1]), WATER, 3.0))
    o.append(line(iso.p(W_STEP, yn, NIP_Z[1]), iso.p(xb, yn, NIP_Z[1]), WATER, 3.4))
    o.append(circ(iso.p(W_STEP, yn, z1), 2.8, fill=PAPER, col=MECH, w=1.6))
    # the far cage side's own nipple line, and its inlet off the far drop
    o.append(line(iso.p(0, yn, NIP_Z[0]), iso.p(xb, yn, NIP_Z[0]), WATER, 2.2, dash="6 4"))
    o.append(line(iso.p(W_STEP, yn, -W_CHASE), iso.p(W_STEP, yn, NIP_Z[0]), WATER, 1.6,
                  dash="4 3"))
    o.append(line(iso.p(0, ygap0 - 1, -W_CHASE), iso.p(0, yt + 10, -W_CHASE), WATER, 2.2,
                  dash="6 4"))
    o.append(txt(iso.p(0, yt + 11.4, zch), "up to the BUCKET", 10.5, WATER, "middle", "700"))

    # ---- what the two aisles carry, now that the pipe never leaves the steel ----
    o.append(txt((62, 786), "The drop is INSIDE the angle's own outline on BOTH sides, so "
                            "NEITHER aisle loses floor to pipework.", 11.5, WATER,
                 "start", "700"))
    o.append(txt((62, 804), "MACHINERY AISLE  —  the FAR side here.  Drop chains and the "
                            "cross-aisle propshaft, ALL AT THE REAR.", 11.5, MECH,
                 "start", "700"))

    # ---- labels down the right-hand side ----
    LX = 676
    _ly = [168]

    def note(anchor_pt, head, body, hcol=WATER, hot=None):
        y = _ly[0]
        out = [lead(anchor_pt, (LX, y), head, hcol)]
        for k, ln in enumerate(body):
            out.append(txt((LX + 6, y + 16 + k * 15), ln, 11,
                           MECH if (hot is not None and k >= hot) else MUTED,
                           "start", "700" if (hot is not None and k >= hot) else "400"))
        _ly[0] = y + 16 + len(body) * 15 + 8
        return "".join(out)

    o.append(note(iso.p(0, yt + 8.4, zch), "THE DROP  —  INSIDE THE L OF THE UPRIGHT",
                  ["the angle's inside corner IS the pipe",
                   "chase: pipe centre 15 mm off both legs,",
                   "so it never leaves the steel's own",
                   "outline. ONE PER SIDE — panel E."], hot=3))
    o.append(note(tp, "T  —  ONE PER TIER, THREE PER SIDE",
                  ['in the nook at 28 / 51 / 74", so SIX',
                   "inlets per row: 3 tiers × 2 sides."]))
    o.append(note(iso.p(W_STEP, yn, z1), "GROMMET  —  through the cage face",
                  ["the inlet steps ~75 mm DOWN-ROW first,",
                   "to clear the angle's span leg, then",
                   "turns in. RIGID PIPE, never a hose."], hot=2))
    o.append(note(iso.p(xb - 2, yn, NIP_Z[1]), "NIPPLE LINE  —  TWO PER TIER",
                  ["one per cage side, each 180 mm inboard",
                   "of its belt edge, so every drip lands",
                   "on the belt.  Panel E dimensions it."]))
    o.append(note(pb, "UCP204 ON A FLAT SHELF", 
                  ["150 mm of 50 x 50 x 5 welded FLAT off",
                   "the idler post, ONE EACH SIDE; shelf top",
                   "face 33 mm below the roller centre. NOT",
                   "on the vertical leg: the shelf IS the mount."], hcol=STEEL))
    o.append(note(iso.p(FC_IDLER - FC_BOLT / 2, yshelf, z1 + mm(25)),
                  "TAKE-UP SLOTS, ALONG THE ROW",
                  ["cut in the shelf itself, 95 mm centres,",
                   '60 mm travel (HDPE needs >=50 mm).',
                   "M10 + lock nuts, TURNED FROM THE AISLE.",
                   "Prefer a SPRING take-up.  ~250 N slack."],
                  hcol=MECH, hot=2))
    o.append(note(iso.p(FC_IDLER, yroll, (bz0 + bz1) / 2), "IDLER  —  TOP FLUSH WITH THE PAN",
                  ["so the centre sits ONE RADIUS",
                   "(31.5 mm) below the pan surface.",
                   'Ø63 x 3 tube, grooved lagging.'], hcol=MECH))
    o.append(note(iso.p(FC_IDLER, yroll, pz1 + FC_SHAFT - 0.8), "SHAFT END  —  130 mm OUT",
                  ["into BOTH aisles, and tier 1's is at shin",
                   "height. Under Rev C it ROTATES whenever",
                   "the row runs: FIXED shroud, 48 off."],
                  hcol=STEEL, hot=2))
    o.append(note(iso.p(0, (yseat + ysurf) / 2, zdiv), "PACKING  —  25 mm AT THIS FRAME",
                  ["tapering to zero at the rear (~1:270).",
                   "The cross-bar itself is DEAD LEVEL at",
                   "all five frames — tracking wins."], hcol=MECH, hot=1))

    # ========================================================================
    # B -- SIDE ELEVATION, from the clean aisle.  All three tiers.
    # ========================================================================
    o.append(panel(975, 80, 765, 740,
                   "B · SIDE ELEVATION from the CLEAN aisle  —  heights, the 14\" front "
                   "allocation, and the packing"))
    fl = Flat(6.05, 1120, 745)
    XR = 58.0

    # floor, front wall, spanner-swing strip
    o.append(line(fl.p(FC_WALL - 2, 0), fl.p(XR, 0), FAINT, 1.8))
    o.append(rect(fl.p(FC_WALL, 94), (FC_IDLER - FC_WALL) * fl.s, 94 * fl.s,
                  fill="#fbf3f2", col="none", sw=0, op=0.9))
    o.append(line(fl.p(FC_WALL, 0), fl.p(FC_WALL, 94), MUTED, 3.2))
    for i in range(18):
        a = fl.p(FC_WALL, 2 + i * 5.2)
        o.append(line((a[0] - 7, a[1] + 6), a, FAINT, 1.0))
    wl = fl.p(FC_WALL - 2.4, 50)
    o.append(txt(wl, "FRONT WALL", 11, MUTED, "middle", "600")
             .replace("<text ", f'<text transform="rotate(-90 {f(wl[0])} {f(wl[1])})" '))
    for k, ln in enumerate(["spanner", "swing", "KEEP", "CLEAR"]):
        o.append(txt(fl.p((FC_WALL + FC_IDLER) / 2, 71 - k * 3.1), ln, 9,
                     MECH, "middle", "700"))

    # the THREE keep-out bands: 12-17 (tier 1's own belt zone), 31-40, 54-63
    for tt in (1, 2):
        ka, kb = TOP[tt - 1], FLOOR[tt]
        o.append(rect(fl.p(FC_IDLER - 3, kb), (XR - FC_IDLER + 3) * fl.s, (kb - ka) * fl.s,
                      fill="#f7d9d5", col="#eec4bd", sw=0.9, op=0.7))
        o.append(txt(fl.p(30, kb - 1.7),
                     f'KEEP OUT  —  dropping gap  {ka}–{kb}"', 9.5,
                     MECH, "middle", "700"))
    kb, ka = FLOOR[0], PAN[0]
    o.append(rect(fl.p(FC_IDLER - 3, kb), (XR - FC_IDLER + 3) * fl.s, (kb - ka) * fl.s,
                  fill="#f7d9d5", col="#eec4bd", sw=0.9, op=0.7))
    o.append(txt(fl.p(30, kb - 1.7), 'KEEP OUT  —  bottom belt zone  12–17"', 9.5,
                 MECH, "middle", "700"))

    # posts: idler-station post at -8, front cage leg at 0
    o.append(line(fl.p(FC_IDLER, 0), fl.p(FC_IDLER, 78), STEEL, 5.0))
    o.append(txt(fl.p(FC_IDLER, 80.4), 'idler post  78"', 10, STEEL, "middle", "700"))
    o.append(line(fl.p(0, 0), fl.p(0, 78), STEEL, 5.5))
    o.append(txt(fl.p(3.4, 83.6), 'front cage leg  78"', 10, STEEL, "start", "700"))

    # per tier: level cross-bar, packing, pan, belt, return strand, roller, shelf
    for tt in range(3):
        yq, ys, yrl = PAN[tt], PAN_SURF_F[tt], IDLE_Y[tt]
        o.append(rect(fl.p(0, TOP[tt]), XR * fl.s, D["cage_h"] * fl.s,
                      fill=CAGE_F, col=CAGE_L, sw=1.1, op=0.45))
        # the cross-bar, DEAD LEVEL, seen end-on at each frame it passes
        o.append(line(fl.p(FC_IDLER - 2, yq), fl.p(XR, yq), STEEL, 1.4, dash="9 5"))
        o.append(rect((fl.p(0, yq)[0] - 6, fl.p(0, yq)[1]), 12, 0.63 * fl.s,
                      fill="#dfe4ea", col=STEEL, sw=1.3))
        # packing: 25 mm at THIS frame, exaggerated only by being drawn at all
        o.append(rect((fl.p(0, ys)[0] - 7, fl.p(0, ys)[1]), 14, FC_PACK * fl.s,
                      fill="#f6d8d4", col=MECH, sw=1.4))
        # pan + belt, carry strand
        o.append(line(fl.p(FC_IDLER, ys), fl.p(XR, ys - 0.35), PAN_L, 3.6))
        o.append(line(fl.p(FC_IDLER, ys + 0.62), fl.p(XR, ys + 0.27), BELT_L, 2.6))
        # roller: TOP FLUSH with the pan surface
        rc = fl.p(FC_IDLER, yrl)
        rr = D["roller_d"] / 2 * fl.s
        o.append(circ(rc, rr, fill="#f2c9c4", col=MECH, w=1.8))
        o.append(path(f'M {f(rc[0])} {f(rc[1] - rr)} A {f(rr)} {f(rr)} 0 0 0 '
                      f'{f(rc[0])} {f(rc[1] + rr)}', col=BELT_L, w=3.0))
        # return strand on the R3 skids, one roller diameter below the pan seat
        o.append(line(fl.p(FC_IDLER, yrl - D["roller_d"] / 2), fl.p(XR, SKID_Y[tt]),
                      BELT_L, 2.2))
        for xk in (10, 26, 42):
            sk = fl.p(xk, SKID_Y[tt])
            o.append(rect((sk[0] - 4, sk[1]), 8, 0.79 * fl.s, fill="#dfe4ea",
                          col=STEEL12, sw=1.0))
        # the shelf and its take-up, seen from the aisle
        sh = fl.p(FC_IDLER, yrl - FC_SEAT)
        o.append(rect((sh[0] - FC_SHELF / 2 * fl.s, sh[1]), FC_SHELF * fl.s, 0.4 * fl.s,
                      fill="#dfe4ea", col=STEEL, sw=1.6))
        o.append(rect((rc[0] - 9, sh[1] - 15), 18, 15, fill="none", col=STEEL, sw=1.2, r=2))
        bx = sh[0] - FC_SHELF / 2 * fl.s
        o.append(line((bx, sh[1]), (bx, sh[1] - 12), MECH, 2.6))
        o.append(spring((bx + 1, sh[1] - 7), (rc[0] - 10, sh[1] - 7), 5, 2.4, MECH, 1.2))
        o.append(circ((bx - 4, sh[1] - 7), 3.0, fill="#f6d8d4", col=MECH, w=1.4))
        # water: the nipple line, INSIDE the cage under its roof, the whole 22 ft
        o.append(line(fl.p(W_STEP, NIPPLE[tt]), fl.p(XR, NIPPLE[tt]), WATER, 3.0))
        o.append(circ(fl.p(1.0, NIPPLE[tt]), 3.2, fill="#dff1fa", col=WATER, w=1.6))
        o.append(line(fl.p(1.0, NIPPLE[tt]), fl.p(W_STEP, NIPPLE[tt]), WATER, 2.2))
        # the three numbers, out on the right
        o.append(txt(fl.p(XR + 1.2, NIPPLE[tt] + 1.0), f'{NIPPLE[tt]}"  water',
                     11, WATER, "start", "700"))
        o.append(txt(fl.p(XR + 1.2, yq + 2.3), f'{PAN[tt]}"  pan seat  —  LEVEL',
                     10.5, STEEL, "start", "700"))
        o.append(line(fl.p(XR, yq), fl.p(XR + 1.0, yq + 2.0), STEEL, 0.9, dash="3 3"))
        o.append(txt(fl.p(XR + 1.2, yrl - 3.6), f'{yrl:.1f}"  idler centre',
                     10.5, MECH, "start", "700"))
        o.append(line(fl.p(XR, yrl), fl.p(XR + 1.0, yrl - 3.3), MECH, 0.9, dash="3 3"))

    # the drop in the nook, its drain cock, and the run up to the bucket
    BX = 12.0
    o.append(line(fl.p(1.5, NIPPLE[0] - 2.4), fl.p(1.5, W_XOVER), WATER, 4.2))
    o.append(circ(fl.p(1.5, NIPPLE[0] - 3.0), 2.6, fill="#f6d8d4", col=MECH, w=1.4))
    o.append(txt(fl.p(3.8, NIPPLE[0] - 3.4), "drain cock  —  the foot of the drop", 9.5,
                 MECH, "start", "700"))
    o.append(txt(fl.p(3.8, 68.0), "THE DROP  —  in the nook of this upright", 10,
                 WATER, "start", "700"))
    o.append(line(fl.p(1.5, W_XOVER), fl.p(BX, W_XOVER), WATER, 4.2))
    o.append(valve_flat(fl, BX - 2.2, W_XOVER, 3.6))
    o.append(txt(fl.p(BX + 2.6, 95.0), "TO THE BUCKET ON ITS OWN HOLDER", 10.5,
                 WATER, "start", "700"))
    o.append(txt(fl.p(BX + 2.6, 92.4), 'everything above the 77" top tie: the '
                 "bucket, its ONE T and", 10, MUTED, "start"))
    o.append(txt(fl.p(BX + 2.6, 89.8), "the run across to the far upright.  "
                 "Drawn in panel E1.", 10, MUTED, "start"))
    o.append(line(fl.p(BX + 1.6, 88.6), fl.p(BX, W_XOVER + 0.6), WATER, 0.9, dash="3 3"))

    o.append(lead(fl.p(0.8, PAN[1] + FC_PACK / 2), fl.p(20, 46.5),
                  "PACKING 25 mm at THIS frame", MECH, 10.5))
    o.append(txt(fl.p(20, 44.4), "→ tapering to ZERO at the rear frame, 264\" away "
                                 "(~1:270).", 10, MUTED, "start"))
    o.append(txt(fl.p(20, 42.3), "The CROSS-BAR is dead level.  Shown exaggerated.",
                 10, MUTED, "start"))

    # the 14" allocation, dimensioned once
    yd = fl.p(0, 0)[1] + 20
    o.append(dim_h(fl.p(FC_WALL, 0)[0], fl.p(FC_IDLER, 0)[0], yd, '6"', MECH))
    o.append(dim_h(fl.p(FC_IDLER, 0)[0], fl.p(0, 0)[0], yd, '8"', MECH))
    o.append(dim_h(fl.p(FC_WALL, 0)[0], fl.p(0, 0)[0], yd + 30, 'FRONT 14"', MECH, 11))
    o.append(dim_h(fl.p(0, 0)[0], fl.p(BX, 0)[0], yd + 30, 'holder', WATER))
    o.append(txt((992, 812), "The front 14\" is ALL BELT  —  nothing stands where a spanner "
                             "must swing.  The bucket holder stands BEHIND the front leg.",
                 11, MECH, "start", "700"))

    # ========================================================================
    # C -- PLAN AT ONE TIER: the shelf, its slots, the shaft ends, the T
    # ========================================================================
    o.append(panel(40, 840, 915, 625,
                   "C · PLAN AT ONE TIER  —  the idler shelf and its take-up, and how the "
                   "water gets in without crossing the belt"))
    pl = Flat(11.4, 244, 1383)
    PXR = 56.0
    zsl0, zsl1 = z1, z1 + mm(50)          # the shelf, outboard of the near post
    zsr0, zsr1 = z0 - mm(50), z0

    # pan / belt / cage in plan
    o.append(rect(pl.p(FC_IDLER, pz1), (PXR - FC_IDLER) * pl.s, D["pan_w"] * pl.s,
                  fill=PAN_F, col=PAN_L, sw=1.2, op=0.75))
    o.append(rect(pl.p(FC_IDLER, bz1), (PXR - FC_IDLER) * pl.s, D["belt_w"] * pl.s,
                  fill=BELT_F, col=BELT_L, sw=1.2, op=0.45))
    for zz in (z0, z1):
        o.append(line(pl.p(0, zz), pl.p(PXR, zz), CAGE_L, 2.4))
    o.append(line(pl.p(0, zdiv), pl.p(PXR, zdiv), CAGE_L, 1.4, dash="6 4"))
    o.append(txt(pl.p(PXR - 0.6, zdiv + 0.9), "wire divider", 10, CAGE_L, "end", "600"))
    o.append(txt(pl.p(1.6, z1 - 1.6), "cage face / mesh", 10, CAGE_L, "start", "600"))

    # front wall
    o.append(line(pl.p(FC_WALL, z0 - 5.5), pl.p(FC_WALL, z1 + 6.5), MUTED, 3.0))
    for i in range(11):
        a = pl.p(FC_WALL, z0 - 5.0 + i * 4.3)
        o.append(line((a[0] - 7, a[1] - 6), a, FAINT, 1.0))
    wp = pl.p(FC_WALL - 1.0, zdiv)
    o.append(txt(wp, "FRONT WALL", 10.5, MUTED, "middle", "600")
             .replace("<text ", f'<text transform="rotate(-90 {f(wp[0])} {f(wp[1])})" '))

    # the angle uprights, drawn as Ls -- HEEL INTO THE BELT, both legs away (D53)
    def ell(u, v, su, sv):
        a = pl.p(u, v)
        return poly([a, (a[0] + su * LEG50 * pl.s, a[1]),
                     (a[0] + su * LEG50 * pl.s, a[1] + sv * TH50 * pl.s),
                     (a[0] + su * TH50 * pl.s, a[1] + sv * TH50 * pl.s),
                     (a[0] + su * TH50 * pl.s, a[1] + sv * LEG50 * pl.s),
                     (a[0], a[1] + sv * LEG50 * pl.s)],
                    fill="#cfd5dd", col=STEEL, w=1.5)

    for u in (0.0, FC_IDLER):
        # HEEL AT THE CAGE FACE, body entirely OUTBOARD -- D53.  The inside of
        # the L therefore opens AWAY from the belt: that nook is the pipe chase.
        o.append(ell(u, z1, +1, +1))          # near post
        o.append(ell(u, z0, +1, -1))          # far post, mirrored
    o.append(txt(pl.p(1.6, 27.6), "front cage leg  —  ANGLE, heel into the belt (D53)",
                 10, STEEL, "start", "700"))
    for i3, s3 in enumerate([
            "★ D53's THREE CHECKS, on EVERY upright:",
            "1 · the belt-side face is an OUTSIDE face, never the inside of the L",
            "2 · the HEEL points at the belt.   3 · the BEARING LEG reaches into the aisle.",
            "Turn one round and this pipe chase ends up INSIDE the belt zone."]):
        o.append(txt(pl.p(1.6, 22.6 - i3 * 1.7), s3, 9,
                     MECH, "start", "700" if i3 in (0, 3) else "400"))
    o.append(txt(pl.p(1.6, 4.2), "idler-station post at −8\", one each side  —  "
                                 "78\", it carries all three shelves",
                 10, STEEL, "start", "700"))

    # the SHELVES: 150 mm of 50 x 50 x 5 welded flat, slots ALONG the row
    for zsa, zsb, sgn in ((zsl0, zsl1, -1),):
        o.append(rect(pl.p(FC_IDLER - FC_SHELF / 2, max(zsa, zsb)),
                      FC_SHELF * pl.s, mm(50) * pl.s,
                      fill="#dfe4ea", col=STEEL, sw=1.8))
        zc = (zsa + zsb) / 2
        for uu in (FC_IDLER - FC_BOLT / 2, FC_IDLER + FC_BOLT / 2):
            o.append(slotbolt(pl.p(uu, zc), FC_SLOT * pl.s))
        # UCP204 base footprint
        o.append(rect(pl.p(FC_IDLER - FC_BOLT / 2 - 0.9, zc + 0.75),
                      (FC_BOLT + 1.8) * pl.s, 1.5 * pl.s,
                      fill="none", col=STEEL, sw=1.2, r=2, op=0.9))
        # push-bolt lug at the WALL end, bolt axis along the row, spring take-up
        lgp = pl.p(FC_IDLER - FC_SHELF / 2 - 0.35, zc)
        o.append(line((lgp[0], lgp[1] - 11), (lgp[0], lgp[1] + 11), MECH, 3.2))
        o.append(line((lgp[0] - 10, lgp[1]), (lgp[0], lgp[1]), MECH, 2.6))
        o.append(circ((lgp[0] - 13, lgp[1]), 3.4, fill="#f6d8d4", col=MECH, w=1.6))
        o.append(spring((lgp[0] + 1, lgp[1]),
                        (pl.p(FC_IDLER - FC_BOLT / 2 - 0.9, zc)[0], lgp[1]), 5, 3.0, MECH, 1.3))
        o.append(path(f'M {f(lgp[0] - 22)} {f(lgp[1] - 11)} A 13 13 0 0 '
                      f'{1 if sgn > 0 else 0} {f(lgp[0] - 22)} {f(lgp[1] + 11)}',
                      col=MECH, w=1.2))

    # the roller, its shafts and the FIXED shrouds
    o.append(line(pl.p(FC_IDLER, pz0), pl.p(FC_IDLER, pz1), MECH, 9.0))
    for zz, sg in ((pz0, -1), (pz1, +1)):
        o.append(line(pl.p(FC_IDLER, zz), pl.p(FC_IDLER, zz + sg * FC_SHAFT), STEEL, 3.4))
        o.append(shroud(pl.p(FC_IDLER, zz + sg * (FC_SHAFT - 0.9)), 17, 15))
    o.append(txt(pl.p(FC_IDLER + 1.4, (pz0 + pz1) / 2), "IDLER", 10.5, MECH, "start", "700"))

    # the water: the drop in each angle nook, then the inlet in through a grommet
    for side in (1, 0):
        sg = +1 if side else -1
        zf = z1 if side else z0
        zch = zf + sg * W_CHASE
        zn = NIP_Z[1] if side else NIP_Z[0]
        o.append(circ(pl.p(W_CHASE, zch), 5.2, fill="#dff1fa", col=WATER, w=2.6))
        o.append(line(pl.p(W_CHASE, zch), pl.p(W_STEP, zch), WATER, 3.0))
        o.append(line(pl.p(W_STEP, zch), pl.p(W_STEP, zn), WATER, 3.0))
        o.append(line(pl.p(W_STEP, zn), pl.p(PXR, zn), WATER, 4.0))
        o.append(circ(pl.p(W_STEP, zf), 3.4, fill=PAPER, col=MECH, w=1.7))
        o.append(txt(pl.p(38.0, zn + sg * 1.3), "NIPPLE LINE  —  all 22 ft", 10.5,
                     WATER, "middle", "700"))
    o.append(txt(pl.p(W_STEP + 1.2, z1 + 1.0), "grommet", 9.5, MECH, "start", "600"))
    o.append(lead(pl.p(W_CHASE, z1 + W_CHASE), pl.p(9.0, 39.6),
                  "The drop sits INSIDE the angle's own outline.", WATER, 10.5))
    o.append(txt(pl.p(9.4, 38.2), "It takes no aisle width, it is nowhere near the belt, "
                 "and the inlet steps ~75 mm", 10, MUTED, "start"))
    o.append(txt(pl.p(9.4, 36.8), "DOWN-ROW before turning in, so it passes the span leg "
                 "instead of through it.", 10, MUTED, "start"))
    o.append(txt(pl.p(9.4, 35.4), "Both nipple lines sit 180 mm INBOARD OF A BELT EDGE, so "
                 "every drip lands on the belt.", 10, WATER, "start", "700"))

    # dimensions
    o.append(dim_h(pl.p(FC_IDLER - FC_BOLT / 2, 0)[0], pl.p(FC_IDLER + FC_BOLT / 2, 0)[0],
                   pl.p(0, 38.4)[1], "95 mm bolt centres", STEEL, 10))
    o.append(dim_h(pl.p(FC_IDLER - FC_SHELF / 2, 0)[0], pl.p(FC_IDLER + FC_SHELF / 2, 0)[0],
                   pl.p(0, 41.0)[1], "150 mm shelf  ·  60 mm travel", STEEL, 10))
    o.append(dim_h(pl.p(FC_WALL, 0)[0], pl.p(FC_IDLER, 0)[0], pl.p(0, 42.4)[1], '6"', MECH))
    o.append(dim_h(pl.p(FC_IDLER, 0)[0], pl.p(0, 0)[0], pl.p(0, 42.4)[1], '8"', MECH))
    for ua, ub in ((BELT_Z1, NIP_Z[1]), (BELT_Z0, NIP_Z[0])):
        o.append(dim_v(pl.p(50.0, ua)[0], pl.p(0, ua)[1], pl.p(0, ub)[1],
                       "180 mm", WATER, 10))
        o.append(line(pl.p(46.0, ua), pl.p(51.0, ua), BELT_L, 0.9, dash="3 3"))
    o.append(dim_v(pl.p(FC_IDLER + 2.6, 0)[0], pl.p(0, pz0)[1],
                   pl.p(0, pz0 - FC_SHAFT)[1], "130 mm of shaft, into the aisle",
                   STEEL, 10))
    o.append(txt(pl.p(13.0, z0 - 2.4), "the machinery-aisle post carries an "
                 "IDENTICAL shelf, bearing and push-bolt  —  mirror image",
                 10, STEEL, "start", "600"))

    o.append(txt(pl.p(PXR - 0.4, z0 - 5.2),
                 "MACHINERY AISLE  —  drop chains and the cross-aisle propshaft, "
                 "ALL 278\" AWAY AT THE REAR.", 11.5, MECH, "end", "700"))

    # ========================================================================
    # D -- what this end IS, the field rules, and the parts
    # ========================================================================
    o.append(panel(975, 840, 765, 625,
                   "D · WHAT THIS END IS, AND WHAT TO BUY PER ROW"))
    dx = 996
    yy = 894
    o.append(txt((dx, yy), "THE IDLER, THE TAKE-UP AND THE WATER — NOTHING ELSE",
                 12, MECH, "start", "700"))
    yy += 20
    for a, b in [
        ("The water drops INSIDE THE L of the upright",
         "One bucket, ONE T, TWO pipes — one per side of the row. Each pipe drops in the "
         "inside corner of its angle upright, 15 mm off both legs, so it stays inside the "
         "steel's own outline: no aisle width lost, nothing in a keep-out band, nothing "
         "near a belt or a roller."),
        ("THREE Ts per side — SIX inlets per row",
         "One T per tier per side at 28 / 51 / 74\". Each inlet steps ~75 mm down-row to "
         "clear the angle's span leg, then turns in through a grommet to that cage side's "
         "own nipple line: SIX nipple lines per row, TWO per tier."),
        ("The bucket stands on its OWN holder",
         "The holder's legs take the weight to the floor; the ties to the upright set its "
         "elevation and stop it swaying. THE CAGE ANGLE CARRIES NO WATER LOAD. It stands "
         "behind the front leg, clear of the front 14\"."),
        ("The bearings sit on a SHELF (D55)",
         "At the idler end the bearings are NOT on the vertical leg. They sit on 150 mm of "
         "50 × 50 × 5 welded FLAT, slots cut along the row IN THE SHELF, 95 mm "
         "centres, 60 mm travel."),
        ("Idler centres ~11.8 / 34.8 / 57.8\" (D93 + D94)",
         "Roller tops sit FLUSH with the pan surface, so the centre is one radius below "
         "it — and at THIS frame the pan surface is one 25 mm packing higher than at "
         "the rear, so these centres are 25 mm above the drive roller's."),
        ("Cross-bars dead level; the FALL IS PACKED (D94)",
         "Cross-bars dead level at all five frames; the pan is packed up 25 mm HERE, at the "
         "front, tapering to zero at the rear — about 1:270."),
        ("NO OPERATOR STATION AT THIS END",
         "Nobody works here. The discharge and the drive are both at the rear; this end is "
         "the idler, the take-up, and the water branch."),
    ]:
        o.append(txt((dx, yy), "▪  " + a, 11.5, INK, "start", "700"))
        t, yy = wrap(dx + 14, yy + 15, 362, b, 10.6, 13.5)
        o.append(t)
        yy += 6

    # ---- the packing strip: the whole 264" at a glance ----
    o.append(txt((dx, yy + 10), "THE PACKING, OVER THE WHOLE 264 INCHES", 12, MECH,
                 "start", "700"))
    sy = yy + 26
    sx0, sx1 = dx + 6, dx + 340
    o.append(poly([(sx0, sy + 24), (sx1, sy + 24), (sx0, sy + 6)],
                  fill="#f6d8d4", col=MECH, w=1.4))
    o.append(line((sx0, sy + 6), (sx1, sy + 24), PAN_L, 2.4))
    o.append(line((sx0, sy + 24), (sx1, sy + 24), STEEL, 2.8))
    o.append(txt((sx0 + 4, sy + 2), "25 mm", 10, MECH, "start", "700"))
    o.append(txt((sx1 - 4, sy + 2), "zero", 10, MECH, "end", "700"))
    o.append(txt((sx0, sy + 38), "FRONT", 10, MECH, "start", "700"))
    o.append(txt((sx0 + 172, sy + 38), "cross-bars DEAD LEVEL  ·  pan falls ~1:270",
                 10, STEEL, "middle", "700"))
    o.append(txt((sx1, sy + 38), "REAR", 10, MECH, "end", "700"))

    # ---- the two field rules, and the thing that is NOT a clash ----
    ex = 1372
    o.append(txt((ex, 894), "TWO FIELD RULES  —  DO NOT SET EITHER OFF A TABLE",
                 12, MECH, "start", "700"))
    t, yv = wrap(ex, 914, 340,
                 "1 · FIT THE PAN FIRST. Then set the TOP of every roller FLUSH with "
                 "the pan surface and take the bearing height from that (D93).", 10.8, 14,
                 INK, "600")
    o.append(t)
    t, yv = wrap(ex, yv + 8, 340,
                 "2 · POUR 2 L of water on the pan at THIS end and watch it reach the "
                 "rear. If it stalls, add front packing in 10 mm steps, record the figure "
                 "that works and use it on all twelve (D94).", 10.8, 14, INK, "600")
    o.append(t)
    t, yv = wrap(ex, yv + 10, 340,
                 "★ CONSEQUENCE FOR THIS SHEET, and it is not written down anywhere "
                 "yet: the pan surface at the FRONT frame is one packing thickness high, so "
                 "the IDLER centre is ~11.8 / 34.8 / 57.8\" — 25 mm ABOVE the drive "
                 "roller's 10.8 / 33.8 / 56.8\". Weld the idler shelves AFTER the pan is "
                 "in and packed.", 10.8, 14, MECH, "700")
    o.append(t)

    o.append(txt((ex, yv + 14), "TWO THINGS TO READ BEFORE YOU WELD", 12, INK,
                 "start", "700"))
    t, yv = wrap(ex, yv + 32, 340,
                 "NOT a clash: the idler's 130 mm shaft end reaches z = 36.7\" and the drop "
                 "stands at z = 32.6\", so they overlap IN PLAN — but the shaft end is at "
                 "x = −8\" and the drop is at x = 0, EIGHT INCHES apart along the row. "
                 "Water lives on the cage frame; the shaft lives on the idler post.",
                 10.8, 14)
    o.append(t)
    t, yv = wrap(ex, yv + 8, 340,
                 "SHAFTS ARE 1050 mm: D36 and D65 close the shin-height watch-out with 48 "
                 "fixed shrouds and keep all 24 shafts symmetric. This sheet is drawn at "
                 "1050 — do not shorten them.", 10.8, 14)
    o.append(t)

    o.append(txt((ex, yv + 16), "PER ROW, AT THIS END", 12, INK, "start", "700"))
    yv += 34
    for i, ln in enumerate([
        "6|idler tensioning shelves — 150 mm of 50 × 50 × 5",
        "6|UCP204 on them, collar OUTBOARD · 12 slots, 95 mm ctrs",
        "6|M10 push-bolts + lock nuts, spring take-up preferred",
        "6|FIXED shaft-end shrouds (12 per row all told) · 3 nose guards",
        "2|idler-station posts, 78\", at −8\"",
        "1|bucket + holder + 2 ties · 1 T · 1 ball valve",
        "2|drop pipes, ONE PER SIDE, in the nook of the angle,",
        " |each with a DRAIN COCK at its foot",
        "6|tees — 3 per drop, at 28 / 51 / 74\"",
        "6|inlets + 6 mesh grommets  (3 tiers × 2 sides)",
        "6|nipple lines, ~22 ft each, 180 mm inboard of the belt edge",
        "15|packing shims, 25 mm at this frame, tapering aft",
    ]):
        n, lab = ln.split("|")
        o.append(txt((ex, yv + i * 15.5), n, 10.8, WATER, "start", "700"))
        o.append(txt((ex + 24, yv + i * 15.5), lab, 10.8, MUTED))
    yv += 12 * 15.5 + 8

    # ========================================================================
    # E -- THE WATER, PROVED: the section across the row and the pipe chase
    # ========================================================================
    o.append(panel(40, 1480, 1700, 660,
                   "E · THE WATER, PROVED  —  the section across the row, and the "
                   "ENLARGED detail of the pipe chase.  This is the panel the plumber "
                   "works from"))
    ws = Flat(5.2, 196, 2086)
    o.append(txt((70, 1548), "E1 · SECTION ACROSS THE ROW at the front frame",
                 11.5, INK, "start", "700"))
    o.append(water_section(ws))
    o.append(txt(ws.p(D["depth"] / 2, -2.8), "6 INLETS PER ROW  —  3 tiers × 2 sides",
                 10, WATER, "middle", "700"))
    # E2: enlarged plan, CROPPED to the upright, so the chase reads at size
    zc0, zc1 = 28.6, float(D["depth"]) + LEG50 + 0.8
    zt = float(D["depth"]) + LEG50
    cs = Flat(62.0, 680, 1640 + zc1 * 62.0)
    o.append(txt((470, 1548), "E2 · ENLARGED  —  THE PIPE CHASE.  Plan through the "
                              "aisle-side upright, cut at 51\"", 11.5, INK, "start", "700"))
    o.append(chase_detail(cs, side=1, zin=zc0 + 0.3, urun=4.4))
    o.append(txt(cs.p(-1.95, zc1 - 0.06), "THE INSIDE OF THE L", 11.5, WATER,
                 "start", "700"))
    o.append(txt(cs.p(-1.95, zc1 - 0.32), "IS THE PIPE CHASE", 11.5, WATER,
                 "start", "700"))
    o.append(txt(cs.p(2.25, zt - 0.06), "50 × 50 × 5 upright  (D53)", 9.5, STEEL,
                 "start", "600"))
    o.append(txt(cs.p(2.25, zc1 - 0.06), "AISLE  —  no water reaches it", 9.5, MECH,
                 "start", "700"))
    o.append(dim_v(cs.p(-0.75, zt)[0], cs.p(0, D["depth"])[1], cs.p(0, zt)[1],
                   "50", STEEL, 9.5))
    o.append(dim_h(cs.p(0, zt)[0], cs.p(W_STEP, zt)[0], cs.p(0, zc0 + 0.45)[1],
                   "~75 mm down-row", MECH, 9.5))
    o.append(txt(cs.p(2.25, zt - 1.10), "15 mm off BOTH legs", 9.5, WATER,
                 "start", "700"))
    o.append(line(cs.p(2.20, zt - 1.14), cs.p(W_CHASE + 0.24, zt - 1.30), WATER,
                  0.8, dash="3 2"))
    o.append(txt(cs.p(-1.95, D["depth"] - 0.30), 'span face  —  z = 32", the cage face',
                 9.5, CAGE_L, "start", "600"))
    t, _ = wrap(560, 2062, 430,
                "IN PLAN the inlet crosses the belt edge, and the nipple line stands over "
                "the belt.  That is DELIBERATE: both are 15–16\" ABOVE it, inside the cage "
                "volume, and every drip is meant to land on the belt.  What must never "
                "cross is a KEEP-OUT BAND, and nothing here does.", 10.5, 14, INK, "600")
    o.append(t)

    # ---- the rules, as a plumber checks them ------------------------------
    ux2 = 1010
    o.append(txt((ux2, 1548), "★ THE TAPE CHECK  —  ONE HEIGHT RULE AND THREE BANDS",
                 12, MECH, "start", "700"))
    o.append(txt((ux2, 1574), '28 / 51 / 74"', 11.5, WATER, "start", "700"))
    o.append(txt((ux2 + 104, 1574), "every HORIZONTAL run of water, and nothing else",
                 11, WATER, "start", "700"))
    o.append(txt((ux2 + 104, 1590), "— the nipple-line heights, 3\" under each cage roof",
                 10.5, MUTED, "start"))
    yy2 = 1612
    for ka, kb in KEEPOUT:
        o.append(rect((ux2, yy2 - 10), 96, 14, fill="#f7d9d5", col="#eec4bd", sw=0.9, r=2))
        o.append(txt((ux2 + 48, yy2), '%d–%d"' % (ka, kb), 10.5, MECH, "middle", "700"))
        o.append(txt((ux2 + 104, yy2), "KEEP OUT — nothing water-related, at any height",
                     10.5, MECH, "start", "700"))
        yy2 += 19
    t, yy2 = wrap(ux2, yy2 + 10, 690,
                  "THREE bands, not two: 12–17\" is tier 1's own belt zone and it is a "
                  "keep-out band exactly like the two dropping gaps above it. Nothing "
                  "water-related goes in any of them — no pipe, no fitting, no valve, no "
                  "clip, no hanger.", 11, 15, INK, "600")
    o.append(t)
    o.append(txt((ux2, yy2 + 20), "WHY THIS ROUTE IS SAFE WITHOUT A RULE TO REMEMBER",
                 12, INK, "start", "700"))
    yy2 += 38
    for s4 in [
        "The only VERTICAL water is the two drops, and both are inside the nook of an "
        "angle upright — inside the steel's own outline.",
        "The only HORIZONTAL water below the stack top is at 28 / 51 / 74\", inside a cage "
        "volume, with a roof over it.",
        "Above the 77\" top tie there is no cage, no belt and no gap, so the bucket, its T "
        "and the run across to the far upright all live up there.",
        "Both nipple lines sit 180 mm inboard of a belt edge, so a drip cannot miss the "
        "belt — and the belt clears it twice a day.",
        "Water and drive share no station: all the water is at the FRONT frame, all the "
        "drive is 278\" away at the REAR.  And because both drops sit in the nook of an "
        "angle, the pipework takes no aisle width on either side of the row — so neither "
        "aisle has to be reserved for it.",
    ]:
        t, yy2 = wrap(ux2, yy2, 690, "·  " + s4, 11, 15)
        o.append(t)
        yy2 += 5

    o.append(txt((ux2, yy2 + 22), "★ WHERE THE CHASE DOES NOT WORK  —  PUT BOTH DROPS "
                                  "ON THE CAGE FRAME, x = 0", 12, MECH, "start", "700"))
    t, yy2 = wrap(ux2, yy2 + 42, 690,
                  "At a CAGE FRAME the nook is clear floor to top and the drop goes "
                  "straight down it.  It is not clear everywhere: at the IDLER POST "
                  "(x = −8\") and at the DRIVE-STATION POST (x = 14\") the same nook "
                  "carries the BEARING-BOLT NUTS — a UCP204 bolts through the outstanding "
                  "leg and its nuts stand in the corner.  So a drop on either post has "
                  "nowhere to sit.  BOTH DROPS ARE AT THE CAGE FRAME, x = 0, and nobody "
                  "may later \"tidy\" one onto a post to shorten a run.", 11, 15, MECH,
                  "600")
    o.append(t)
    o.append(txt((ux2, yy2 + 22), "★ AND THE SPAN LEG IS NEVER DRILLED", 12, MECH,
                  "start", "700"))
    t, yy2 = wrap(ux2, yy2 + 42, 690,
                  "That is the whole reason the inlet steps ~75 mm DOWN-ROW before it "
                  "turns in (dimensioned on E2): the pipe cannot pass through the angle's "
                  "SPAN leg, whose outer face is the cage face and one of the module's "
                  "roller-face datums (D53).  It goes PAST the leg, then in through a "
                  "grommet in the mesh.  No hole in a span leg, at any frame, for any "
                  "pipe.", 11, 15, MECH, "600")
    o.append(t)

    kx = dx
    for col, lab in ((WATER, "water"), (MECH, "belt mechanism"),
                     (STEEL, "angle frame, bearings, shaft"),
                     ("#f7d9d5", "keep-out band")):
        o.append(rect((kx, 2160), 20, 10, fill=col, col=INK, sw=0.8, r=2))
        o.append(txt((kx + 26, 2169), lab, 10.8, MUTED))
        kx += 34 + len(lab) * 5.3

    write("manure-belt-REVC-5-frontend.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 6 -- DRIVE END: the drive station, the gearmotor, the limiter,
#              the drop chain, the propshaft and the discharge  (Rev C)
# ============================================================================
DE_X = float(D["post_x"])            # 14" behind the rear cage leg
DE_H = float(D["post_h"])            # post runs to 90"
DE_LINE = float(D["line_y"])         # line-shaft axis, 85"
SPR_R = D["spr_od"] / 2              # 38T 428 plate, ~160 mm OD -> 3.15" radius
HUB_Z = 2.74                         # 69.5 mm of free shaft outboard of the bearing

# ---- R7(b) / D112: the machinery-side clearance, off this sheet's own geometry
SPR_Z_MM = (D["depth"] / 2 + HUB_Z) * 25.4        # sprocket / hub plane, from row centre
SKIRT_Z_MM = SPR_Z_MM + D["skirt_out_mm"]         # the 250 mm bottom skirt's line
T1_RIM_MM = D["t1_tray_l"] * 25.4 / 2             # tier 1's tray rim, from row centre
T1_SKIRT_MM = SKIRT_Z_MM - T1_RIM_MM              # the rim stops this far inboard of it
ARM = D["arm"]                       # 450 mm reaction arm = 17.72"
XSCR0, XSCR1 = DE_X + 1, DE_X + 4    # scraper bar, 15-18"
XHOP0, XHOP1 = DE_X + 2, DE_X + 12   # discharge hopper, 16-26"
XCLR = 49.0                          # rear space allocation


def arrow(a, b, col=INK, w=2.0, hs=5.0):
    """Line with an arrowhead at b."""
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    p1 = (b[0] - hs * math.cos(ang - 0.45), b[1] - hs * math.sin(ang - 0.45))
    p2 = (b[0] - hs * math.cos(ang + 0.45), b[1] - hs * math.sin(ang + 0.45))
    return line(a, b, col, w) + poly([b, p1, p2], fill=col, col=col, w=0.6)


def spring(a, b, n=6, amp=3.0, col=MECH, w=1.4):
    """Zig-zag between two points -- chain tensioner / rubber-block symbol."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    px, py = -dy / L, dx / L
    pts = [a]
    for i in range(1, n):
        t = i / n
        sgn = 1 if i % 2 else -1
        pts.append((a[0] + dx * t + px * amp * sgn, a[1] + dy * t + py * amp * sgn))
    pts.append(b)
    return "".join(line(pts[i], pts[i + 1], col, w) for i in range(len(pts) - 1))


def drawing_driveend():
    W, H = 1780, 2470
    o = [header(W, "6 · DRIVE END  —  drive station, gearmotor, torque limiter, "
                   "drop chain, propshaft, discharge",
                "The rear 49\" after ruling R1.  One half is drawn; the other half is a "
                "MIRROR.  Nothing on this sheet has a precedent in the reference photos.",
                rev=REVC, strap=STRAP_C)]

    # ========================================================================
    # A -- ISOMETRIC, ONE TIER AT THE DRIVE END
    # ========================================================================
    o.append(panel(40, 80, 880, 800,
                   "A · ONE TIER AT THE DRIVE STATION, IN 3-D   (tier 2 shown — tiers 1 "
                   "and 3 repeat it.  Three tiers at once is unreadable)"))
    T = 1
    yp, yf, yt = PAN[T], FLOOR[T], TOP[T]          # 35 / 40 / 54
    ygap0 = TOP[T - 1]                             # 31
    yr = ROLL_Y[T]                                 # 33.8  (D93)
    z0, z1 = 0.0, float(D["depth"])                # z0 = CHUTE side (far), z1 = MACHINERY
    pz0, pz1 = (z1 - D["pan_w"]) / 2, z1 - (z1 - D["pan_w"]) / 2
    bz0, bz1 = (z1 - D["belt_w"]) / 2, z1 - (z1 - D["belt_w"]) / 2
    ZH = z1 + HUB_Z                                # hub / sprocket plane
    xa = -10.0
    S3 = 8.5
    iso = Iso(S3, 412, 720)

    o.append(keepout_box(iso, xa, 1.0, ygap0 + 1.0, yf, z0, z1, "fill"))
    o.append(line(iso.p(0, ygap0 - 1, z0), iso.p(0, yt + 3, z0), STEEL, 6.0))
    o.append(crossbar(iso, 0, yp, z0, z1, STEEL, 4.4))
    o.append(line(iso.p(DE_X, 28, z0), iso.p(DE_X, 61, z0), MECH, 4.0, dash="7 4"))
    # pan, belt, manure
    o.append(slab_xz(iso, yp, 1.0, xa, XSCR0, pz0, pz1, PAN_F, PAN_L, 1.0, 0.95))
    o.append(slab_xz(iso, yp + 1.0, 0.9, xa, DE_X, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
    o.append(manure_on_belt(iso, yp + 2.0, xa + 2, DE_X - 3, bz0, bz1, 5))
    # ---- the discharge hopper, as a trough ----
    hy0, hy1 = yp - 1.8, yp - 4.8
    o.append(poly([iso.p(XHOP0, hy0, pz1), iso.p(XHOP1, hy0, pz1),
                   iso.p(XHOP1, hy1, pz1), iso.p(XHOP0, hy1, pz1)],
                  fill="#e7ded3", col=MANURE, w=1.4, op=0.55))
    o.append(poly([iso.p(XHOP1, hy0, pz0), iso.p(XHOP1, hy0, pz1),
                   iso.p(XHOP1, hy1, pz1), iso.p(XHOP1, hy1, pz0)],
                  fill="#d8cdbe", col=MANURE, w=1.4, op=0.55))
    o.append(quad_xz(iso, hy1, XHOP0, XHOP1, pz0, pz1, "#cfc4b4", MANURE, 1.2, 0.5))
    o.append(quad_xz(iso, hy0, XHOP0, XHOP1, pz0, pz1, "none", MANURE, 1.5, 1.0))
    xm = (XHOP0 + XHOP1) / 2
    o.append(arrow(iso.p(xm, hy1 + 0.35, pz1 - 2), iso.p(xm, hy1 + 0.35, pz0 + 1.5),
                   MANURE, 2.4, 6.0))
    # drive roller and its shaft
    o.append(roller(iso, DE_X, yr, bz0 - 0.6, bz1 + 0.6))
    for zz, sg in ((z0, -1), (z1, +1)):
        o.append(line(iso.p(DE_X, yr, zz), iso.p(DE_X, yr, zz + sg * (HUB_Z + 1.4)),
                      STEEL, 3.4))
    # scraper bar + rubber blade, hinged off the pan end
    o.append(line(iso.p(XSCR0 + 1.4, yp + 1.9, pz0), iso.p(XSCR0 + 1.4, yp + 1.9, pz1),
                  MECH, 3.6))
    o.append(poly([iso.p(XSCR0 + 1.4, yp + 1.9, pz0), iso.p(XSCR0 + 1.4, yp + 1.9, pz1),
                   iso.p(DE_X + 0.4, yp + 1.2, pz1), iso.p(DE_X + 0.4, yp + 1.2, pz0)],
                  fill="#3a3f46", col=INK, w=0.9, op=0.6))
    o.append(keepout_box(iso, xa, 1.0, ygap0 + 1.0, yf, z0, z1, "edge"))
    # near (machinery-side) cage leg, the post, the bearing, the hub, the chain
    o.append(line(iso.p(0, ygap0 - 1, z1), iso.p(0, yt + 3, z1), STEEL, 6.0))
    o.append(line(iso.p(DE_X, 28, z1), iso.p(DE_X, 61, z1), MECH, 6.5))
    pb = iso.p(DE_X, yr, z1 + 0.9)
    o.append(rect((pb[0] - 11, pb[1] - 9), 22, 18, fill="#dfe4ea", col=STEEL, sw=1.6, r=2))
    hb = iso.p(DE_X, yr, ZH)
    rr = SPR_R * S3
    o.append(circ(hb, rr, fill="#f6d8d4", col=MECH, w=1.7))
    for k in range(26):
        a1 = 2 * math.pi * k / 26
        o.append(line((hb[0] + rr * 0.9 * math.cos(a1), hb[1] + rr * 0.9 * math.sin(a1)),
                      (hb[0] + rr * math.cos(a1), hb[1] + rr * math.sin(a1)), MECH, 1.1))
    o.append(circ(hb, D["hub_flange"] / 2 * S3, fill="#f2c9c4", col=MECH, w=1.3))
    o.append(circ(hb, D["hub_boss"] / 2 * S3, fill="#dfe4ea", col=STEEL, w=1.4))
    for sgn in (-1, 1):
        a2 = iso.p(DE_X + sgn * SPR_R, yr, ZH)
        o.append(line(a2, iso.p(DE_X + sgn * SPR_R, 61, ZH), MECH, 2.4))
        o.append(line(a2, iso.p(DE_X + sgn * SPR_R, 28, ZH), MECH, 2.4, dash="8 5"))
    for xx in (DE_X - SPR_R - 1.6, DE_X + SPR_R + 1.6):
        o.append(line(iso.p(xx, 28, ZH + 1.8), iso.p(xx, 61, ZH + 1.8), MUTED, 1.0,
                      dash="4 3"))
    o.append(line(iso.p(DE_X - SPR_R - 1.6, 61, ZH + 1.8),
                  iso.p(DE_X + SPR_R + 1.6, 61, ZH + 1.8), MUTED, 1.0, dash="4 3"))
    o.append(cage_box(iso, xa, 0, yf, yt, z0, z1, mesh=True, op=0.18))
    o.append(quad_xz(iso, yf, xa, 0, z0, z1, "#eef3ee", CAGE_L, 0.8, 0.5))
    o.append(txt(iso.p(-5.0, ygap0 + 4.4, z1), "KEEP OUT", 11.5, MECH, "middle", "700"))

    # labels down the right-hand side of panel A
    lx = 640
    o.append(lead(iso.p(DE_X, 59, z1), (lx, 166), "DRIVE-STATION POST 50×50×5", MECH, 11))
    o.append(txt((lx + 6, 182), "one per side at x = 14\", floor to 90\".", 10.5, MUTED))
    o.append(txt((lx + 6, 197), "It IS the gantry: the post carries the top", 10.5, MUTED))
    o.append(txt((lx + 6, 212), "member itself, on its own footing (R1a).", 10.5, MUTED))
    o.append(lead(hb, (lx, 248), "TURNED HUB + 38T PLATES", MECH, 11))
    o.append(txt((lx + 6, 264), "boss Ø40 × 50 bored Ø20 H7, 6×6 key full", 10.5, MUTED))
    o.append(txt((lx + 6, 279), "length; flange Ø100 × 8; one 38T 428 plate", 10.5, MUTED))
    o.append(txt((lx + 6, 294), "each side on 5.5 mm spacers, M8 through.", 10.5, MUTED))
    o.append(txt((lx + 6, 309), "All 3 hubs per row IDENTICAL — see E.", 10.5, INK,
                 "start", "600"))
    o.append(lead(pb, (lx, 345), "UCP204 ON THE OUTSTANDING LEG", STEEL, 11))
    o.append(txt((lx + 6, 361), "the leg's outer face IS the bearing seat.", 10.5, MUTED))
    o.append(txt((lx + 6, 376), "FIXED at the drive end — a face-mounted", 10.5, MUTED))
    o.append(txt((lx + 6, 391), "block cannot take up belt length.  See E.", 10.5, MUTED))
    o.append(lead(iso.p(DE_X + SPR_R, 52, ZH), (lx, 427), "DROP CHAIN — 428 on 38T",
                  MECH, 11))
    o.append(txt((lx + 6, 443), "daisy-chained tier to tier in ONE dead-", 10.5, MUTED))
    o.append(txt((lx + 6, 458), "vertical plane through x = 14\".  Sprocket", 10.5, MUTED))
    o.append(txt((lx + 6, 473), "centres 10.8 / 33.8 / 56.8\", line shaft 85\".", 10.5, MUTED))
    o.append(txt((lx + 6, 488), "130L tier-to-tier · 140L to the line shaft,", 10.5, MUTED))
    o.append(txt((lx + 6, 503), "BOTH UNCUT — so a spring tensioner is", 10.5, MUTED))
    o.append(txt((lx + 6, 518), "mandatory.  NEVER mix 428 with 08B.", 10.5, MECH,
                 "start", "700"))
    o.append(lead(iso.p(XHOP1, hy0, pz1 - 4), (lx, 554),
                  "HOPPER, x = 16–26\" — TIERS 2 AND 3", MANURE, 11))
    o.append(txt((lx + 6, 570), "45° WALLS falling 150 mm across the 790", 10.5, MUTED))
    o.append(txt((lx + 6, 585), "into a 100 × 100 cross-channel (arrow) —", 10.5, MUTED))
    o.append(txt((lx + 6, 600), "identical on all 8.  LIQUID-TIGHT, not", 10.5, MUTED))
    o.append(txt((lx + 6, 615), "draining: the tray drains now.  See F.", 10.5, MUTED))
    o.append(txt((lx + 6, 630), "★ TIER 1 HAS NO HOPPER — it falls free at", 10.5, MECH,
                 "start", "700"))
    o.append(txt((lx + 6, 645), "305 mm onto its own tray behind a three-", 10.5, MECH,
                 "start", "700"))
    o.append(txt((lx + 6, 660), "sided shroud (R7 / D105).  See B and F.", 10.5, MECH,
                 "start", "700"))
    o.append(lead(iso.p(XSCR0 + 1.4, yp + 2.4, pz1), (lx, 681), "SCRAPER, x = 15–18\"",
                  MECH, 11))
    o.append(txt((lx + 6, 697), "rubber blade, 15–20 mm projection,", 10.5, MUTED))
    o.append(txt((lx + 6, 712), "hinged off the pan end.", 10.5, MUTED))
    t, _ = wrap(lx, 745, 268,
                "THE ONLY MANUAL FALLBACK is a "
                "removable two-bolt coupling at the gearbox output (D29) — and the 450 mm "
                "handle that fits it is an EMERGENCY TOOL on a nail by the switchboard, "
                "NOT part of the machine (D88).",
                10.5, 14, MECH, "600")
    o.append(t)
    t, _ = wrap(76, 806, 530,
                "The dropping gap stays a keep-out volume at the drive end as well as along "
                "the run: belt, pan, cross-bar and scraper only. The drop chain, the hub and "
                "the bearings all sit OUTBOARD of the cage face, in the machinery aisle — "
                "which is what ruling R1's aisle allocation buys.", 10.5, 14, INK, "600")
    o.append(t)

    # ========================================================================
    # B -- SIDE ELEVATION, all three tiers
    # ========================================================================
    o.append(panel(940, 80, 800, 800,
                   "B · SIDE ELEVATION OF THE DRIVE END  —  from the machinery aisle.  "
                   "x is from the rear cage leg, rearward positive"))
    fl = Flat(7.4, 1064, 810)
    xl, xrr = -12.0, 34.0
    for tt in range(3):
        ka, kb = PAN[tt] - 3.0, FLOOR[tt]
        o.append(rect(fl.p(xl, kb), (xrr - xl) * fl.s, (kb - ka) * fl.s,
                      fill="#f7d9d5", col="#eec4bd", sw=0.8, op=0.75))
        o.append(txt(fl.p(xl + 5, (ka + kb) / 2 - 0.8), "KEEP OUT", 8.5, MECH,
                     "middle", "700"))
    o.append(line(fl.p(xl - 2, 0), fl.p(xrr, 0), FAINT, 2.0))
    for i in range(24):
        a = fl.p(xl - 2 + i * 2, 0)
        o.append(line((a[0], a[1]), (a[0] - 5, a[1] + 5), FAINT, 0.9))
    for tt in range(3):
        o.append(rect(fl.p(xl, TOP[tt]), (0 - xl) * fl.s, D["cage_h"] * fl.s,
                      fill=CAGE_F, col=CAGE_L, sw=1.1, op=0.45))
    o.append(line(fl.p(0, 0), fl.p(0, D["upright"]), STEEL, 6.0))
    o.append(txt(fl.p(0, 79.2), "x = 0", 10, STEEL, "middle", "700"))
    o.append(vtxt(fl.p(-1.4, 33), "rear cage leg", 9, STEEL, "middle", "700"))
    # the ONE combining chute (far face) -- TIERS 2 AND 3 ONLY (R7 / D105)
    o.append(rect(fl.p(XHOP0, 62), (XHOP1 - XHOP0) * fl.s, (62 - D["spout"]) * fl.s,
                  fill="none", col=MANURE, sw=1.4, r=2))
    o.append(vtxt(fl.p((XHOP0 + XHOP1) / 2 + 1.6, 42), "TWO-TIER CHUTE (far face) — "
                                                       "TIERS 2 AND 3", 9.5,
                  MANURE, "middle", "700"))
    o.append(txt(fl.p(XHOP1 + 0.6, D["spout"] + 1.2), "spout 250 mm", 9.5, MANURE,
                 "start", "700"))
    o.append(txt(fl.p(XHOP1 + 0.6, D["spout"] - 1.4), "above the tray", 9, MUTED))
    # the drive-station post, to 90", and its braces
    o.append(line(fl.p(DE_X, 0), fl.p(DE_X, DE_H), MECH, 7.0))
    o.append(line(fl.p(DE_X - 2.4, DE_H), fl.p(DE_X + 2.4, DE_H), MECH, 5.0))
    o.append(txt(fl.p(DE_X + 3.4, DE_H + 0.6), "gantry top member  90\"", 10, MECH,
                 "start", "700"))
    # ★ R7 / D105: the lower brace must stay ABOVE the 150 mm tray rim across
    #   x = 2-26", or be taken down to the post's own foot instead.
    o.append(line(fl.p(DE_X, D["brace_at"]), fl.p(0.4, 23), MECH, 3.0))
    o.append(line(fl.p(DE_X, 87), fl.p(0.4, 63), MECH, 3.0))
    o.append(vtxt(fl.p(5.1, 20.1), "★ ABOVE 150 mm", 8.5, MECH, "middle", "700",
                  ang=49))
    o.append(txt(fl.p(6.0, 71.4), "braced to the frame at 63\"", 9, MECH,
                 "middle", "600"))
    # pans, belts, rollers, sprockets, scrapers
    for tt in range(3):
        o.append(line(fl.p(xl, PAN[tt]), fl.p(XSCR0, PAN[tt]), PAN_L, 2.6))
        o.append(line(fl.p(xl, PAN[tt] + 1.0), fl.p(DE_X, PAN[tt] + 1.0), BELT_L, 3.0))
        o.append(line(fl.p(xl, PAN[tt] - 2.6), fl.p(DE_X, PAN[tt] - 2.6), BELT_L, 2.2))
        rc = fl.p(DE_X, ROLL_Y[tt])
        o.append(circ(rc, SPR_R * fl.s, fill="none", col=MECH, w=1.0))
        o.append(circ(rc, D["roller_d"] / 2 * fl.s, fill="#f2c9c4", col=MECH, w=1.8))
        o.append(line(fl.p(XSCR0, PAN[tt] + 1.9), fl.p(XSCR1, PAN[tt] + 0.6), INK, 2.2))
    # drop chain: two runs per span, at +/- the sprocket radius
    chain_y = list(ROLL_Y) + [DE_LINE]
    for i in range(3):
        for sgn in (-1, 1):
            o.append(line(fl.p(DE_X + sgn * SPR_R, chain_y[i]),
                          fl.p(DE_X + sgn * SPR_R, chain_y[i + 1]), MECH, 2.2))
        mid = (chain_y[i] + chain_y[i + 1]) / 2
        o.append(spring(fl.p(DE_X + SPR_R, mid - 1.7), fl.p(DE_X + SPR_R, mid + 1.7),
                        5, 3.2))
    o.append(lead(fl.p(DE_X + SPR_R, 72), fl.p(19.5, 77),
                  "spring tensioner on each loop", MECH, 9.5, "700", "start"))
    # line shaft + its sprocket
    ls = fl.p(DE_X, DE_LINE)
    o.append(circ(ls, SPR_R * fl.s, fill="none", col=MECH, w=1.0))
    o.append(circ(ls, 0.40 * fl.s, fill="#dfe4ea", col=STEEL, w=2.0))
    # gearmotor, pedestal, pivot, arm, rubber block, limit switch
    o.append(line(fl.p(DE_X - 1.8, 89.2), fl.p(DE_X + 9.6, 89.2), MECH, 3.4))
    o.append(line(fl.p(DE_X + 9.6, 89.2), fl.p(DE_X + 9.6, 80.4), MECH, 3.0))
    gb = fl.p(DE_X + 1.6, DE_LINE)
    o.append(rect((gb[0], gb[1] - 4.6 * fl.s), 8.0 * fl.s, 9.2 * fl.s,
                  fill="#f6d8d4", col=MECH, sw=1.8, r=3))
    o.append(txt((gb[0] + 4.0 * fl.s, gb[1] - 0.8 * fl.s), "GEARBOX", 9.5, MECH,
                 "middle", "700"))
    o.append(txt((gb[0] + 4.0 * fl.s, gb[1] + 8), "worm 300:1", 9, MUTED, "middle"))
    mo = fl.p(DE_X + 9.9, DE_LINE + 2.8)
    o.append(rect((mo[0], mo[1]), 6.8 * fl.s, 5.6 * fl.s,
                  fill="#dfe4ea", col=STEEL, sw=1.6, r=4))
    o.append(txt((mo[0] + 3.4 * fl.s, mo[1] + 3.2 * fl.s), "0.37 kW", 9.5, STEEL,
                 "middle", "700"))
    o.append(circ(ls, 5.0, fill=PAPER, col=INK, w=2.0))
    o.append(line(fl.p(DE_X, DE_LINE), fl.p(DE_X - ARM, DE_LINE), INK, 3.4))
    bl = fl.p(DE_X - ARM, DE_LINE - 1.7)
    o.append(spring((bl[0], bl[1]), (bl[0], bl[1] + 2.1 * fl.s), 5, 4.0, "#3a3f46", 2.0))
    o.append(line(fl.p(DE_X - ARM - 2.2, DE_LINE - 4.0),
                  fl.p(DE_X - ARM + 2.2, DE_LINE - 4.0), INK, 3.0))
    sw = fl.p(DE_X - ARM + 2.9, DE_LINE - 2.6)
    o.append(rect((sw[0], sw[1]), 12, 16, fill="#ffe9a8", col=INK, sw=1.5, r=2))
    o.append(dim_h(fl.p(DE_X - ARM, 0)[0], fl.p(DE_X, 0)[0], fl.p(0, DE_LINE + 3.6)[1],
                   "450 mm REACTION ARM  —  see D", MECH, 10))
    # ★ TIER 1's OWN TRAY, IN THIS PLANE: x = 2-26", 150 mm deep (R7 / D105).
    #   The tiers 2-3 tray is in the aisle, out of this plane -- see F.
    o.append(rect(fl.p(D["t1_x0"], D["tray_d"]),
                  (D["t1_x1"] - D["t1_x0"]) * fl.s, D["tray_d"] * fl.s,
                  fill="#eef4f8", col=STEEL, sw=1.8, r=2))
    o.append(txt(fl.p((D["t1_x0"] + D["t1_x1"]) / 2, 3.6), "TIER-1 TRAY", 8.5, STEEL,
                 "middle", "700"))
    o.append(txt(fl.p((D["t1_x0"] + D["t1_x1"]) / 2, 1.6), "draws out REARWARD",
                 8.5, MUTED, "middle"))
    # ★ the tray draws out rearward BETWEEN the two post feet -- the rule is in G
    o.append(txt(fl.p(D["t1_x1"] + 0.8, D["tray_d"] / 2 + 0.4),
                 "★ post feet ~1100 CLEAR", 8.5, MECH, "start", "700"))
    o.append(txt(fl.p(D["t1_x1"] + 0.8, D["tray_d"] / 2 - 1.4),
                 "foot to foot — see G", 8.5, MECH, "start", "700"))
    # height dimensions, on the left
    dx = fl.p(xl - 1.6, 0)[0]
    for yy in (ROLL_Y[0], ROLL_Y[1], ROLL_Y[2], DE_LINE, DE_H):
        o.append(line((dx, fl.p(0, yy)[1]), fl.p(DE_X - SPR_R - 0.4, yy), FAINT, 0.7,
                      dash="3 3"))
    o.append(dim_v(dx, fl.p(0, 0)[1], fl.p(0, ROLL_Y[0])[1], '10.8"', MECH, 10))
    o.append(dim_v(dx, fl.p(0, ROLL_Y[0])[1], fl.p(0, ROLL_Y[1])[1], '23"', MECH, 10))
    o.append(dim_v(dx, fl.p(0, ROLL_Y[1])[1], fl.p(0, ROLL_Y[2])[1], '23"', MECH, 10))
    o.append(dim_v(dx, fl.p(0, ROLL_Y[2])[1], fl.p(0, DE_LINE)[1],
                   '%.1f"  ★' % (DE_LINE - ROLL_Y[2]), MECH, 10))
    o.append(dim_v(dx, fl.p(0, DE_LINE)[1], fl.p(0, DE_H)[1], '5"', MECH, 10))
    # the rear elevation budget, along the bottom
    yb = fl.p(0, 0)[1] + 30
    o.append(dim_h(fl.p(0, 0)[0], fl.p(DE_X, 0)[0], yb,
                   '14"  roller · post · chain plane', MECH, 10))
    o.append(dim_h(fl.p(DE_X + 12, 0)[0], fl.p(XCLR, 0)[0], yb,
                   '23"  CLEAR — nothing fixed', MECH, 10))
    o.append(txt((fl.p(11, 0)[0], yb + 22), 'scraper 15–18"  ·  hopper 16–26" '
                 '(tiers 2–3)  ·  tier-1 tray 2–26", 1.0 m across',
                 9.5, MANURE, "middle", "600"))
    # notes, in the clear right-hand third of panel B
    bx2 = 1400
    o.append(txt((bx2, 160), "ONE MEMBER, THREE JOBS  (R1a)", 11.5, MECH, "start", "700"))
    t, _ = wrap(bx2, 180, 320,
                "The post at x = 14\" carries the three drive-roller pillow blocks, the "
                "gantry top member at 90\" and the line shaft at 85\" — one member on one "
                "footing. That is what makes the drop chain dead vertical in a single plane "
                "and keeps both chain loops on stock lengths.", 10.5, 14, MUTED)
    o.append(t)
    o.append(txt((bx2, 262), "★ CHECK THE LINE-SHAFT HEIGHT BEFORE YOU DRILL IT",
                 11, MECH, "start", "700"))
    o.append(txt((bx2, 278), 'The doc gives the line shaft as 85" AND as 25.5" above tier 3. '
                             'With tier 3 at', 9.5, MUTED))
    o.append(txt((bx2, 290), '56.8" those cannot both hold — 85" is 28.2" up. Set the shaft '
                             'off the AS-BUILT', 9.5, MUTED))
    o.append(txt((bx2, 302), 'tier-3 centre and record what you used; the 130L tier loops are '
                             'unaffected.', 9.5, MUTED))
    o.append(txt((bx2, 334), "AND THE RESERVATION AGAINST IT", 11.5, MECH, "start", "700"))
    t, _ = wrap(bx2, 354, 320,
                "It also puts the motor reaction and the roller-parallelism datum on the same "
                "member. Mitigations, all drawn here: the pedestal sits on the TOP MEMBER not "
                "the leg; the member's ends brace down to the cage frame at 63\"; the torque "
                "is taken by the pivot, arm and rubber block so the post sees a steady "
                "reaction. MEASURE PARALLELISM AFTER THE MOTOR IS MOUNTED, AND AGAIN AFTER "
                "THE FIRST LOADED RUN.", 10.5, 14, MUTED)
    o.append(t)
    o.append(txt((bx2, 486), "THE FALLBACK IF IT MOVES", 11.5, MECH, "start", "700"))
    t, _ = wrap(bx2, 506, 320,
                "If the prototype shows measurable movement at the bearing seats under a "
                "limiter trip, fall back to a separate gantry at x = 26\" and accept that "
                "the line-shaft chain becomes cut to length.", 10.5, 14, MUTED)
    o.append(t)
    o.append(txt((bx2, 586), "★ NOTHING STANDS ON THIS FLOOR", 11.5, MECH, "start", "700"))
    t, _ = wrap(bx2, 606, 320,
                "Behind x = 26\" the floor is ACCESS FLOOR for a man with a rod — keep it "
                "empty, nothing parked and nothing turning. The gearmotor overhangs to about "
                "x = 34\" but at 82–90\", above head height, so it takes none of it. In "
                "FRONT of it, x = 2–26\" is the tier-1 tray's floor.",
                10.5, 14, MUTED)
    o.append(t)
    o.append(txt((bx2, 700), "★ THE LOWER BRACE MUST CLEAR THE TRAY  (R7)", 11.5, MECH,
                 "start", "700"))
    t, _ = wrap(bx2, 720, 320,
                "R1(a) braces the post diagonally back to the rear cage leg. Everywhere "
                "that brace crosses x = 2–26\" it must stay ABOVE 150 mm — the tier-1 "
                "tray's rim — or be taken down to the post's own foot instead. Drawn here "
                "landing at 7.4\" = 188 mm, 38 mm clear of the rim. Dropping it to the "
                "foot for an easier fit-up is what fouls the tray: cheap on the drawing, "
                "a grinder job afterwards.",
                10.5, 14, MECH, "600")
    o.append(t)

    # ========================================================================
    # C -- PLAN AT 85": the line shafts, the propshaft, the 15 mm offset
    # ========================================================================
    o.append(panel(40, 900, 880, 540,
                   "C · PLAN AT 85\"  —  the cross-aisle propshaft.  "
                   "DO NOT INSTALL IT STRAIGHT"))
    pl = Flat(6.0, 96, 1070, flip_y=False)      # u = z across the house, v = x along the row
    depth = float(D["depth"])
    r1z, r2z = 0.0, depth + D["aisle"]
    off = D["ps_off"]
    for zz0, xoff, lab in ((r1z, 0.0, "ROW 1"), (r2z, off, "ROW 2")):
        o.append(rect(pl.p(zz0, -14), depth * pl.s, 14 * pl.s,
                      fill=CAGE_F, col=CAGE_L, sw=1.3))
        o.append(rect(pl.p(zz0 + (depth - D["belt_w"]) / 2, -14),
                      D["belt_w"] * pl.s, 14 * pl.s, fill=BELT_F, col=BELT_L, sw=0.8,
                      op=0.28))
        o.append(txt(pl.p(zz0 + depth / 2, -7), lab, 10.5, CAGE_L, "middle", "700"))
        # the two drive-station posts, in section: an L, legs pointing away from the belt
        for zz, flip in ((zz0, -1), (zz0 + depth, +1)):
            q = pl.p(zz, DE_X + xoff - 1.0)
            o.append(path(f"M {f(q[0])} {f(q[1])} l {f(flip*13)} 0 l 0 4 "
                          f"l {f(-flip*9)} 0 l 0 9 l -4 0 Z",
                          fill="#dfe4ea", col=MECH, w=1.4))
        # line shaft: 32" between the bearings, plus the hub plane and then the yoke
        sa = zz0 - 1.0 if zz0 == r1z else zz0 + depth + 1.0
        o.append(line(pl.p(sa, DE_X + xoff),
                      pl.p(zz0 + depth + 4.8 if zz0 == r1z else zz0 - 4.8, DE_X + xoff),
                      STEEL, 3.6))
        for zb in (zz0 - 0.9, zz0 + depth + 0.9):
            q = pl.p(zb, DE_X + xoff)
            o.append(rect((q[0] - 7, q[1] - 9), 14, 18, fill="#dfe4ea", col=STEEL, sw=1.5,
                          r=2))
        hz = zz0 + depth + HUB_Z if zz0 == r1z else zz0 - HUB_Z
        o.append(circ(pl.p(hz, DE_X + xoff), 5.4, fill="#f6d8d4", col=MECH, w=1.7))
        o.append(txt(pl.p(hz, DE_X + xoff - 2.4), "hub", 9, MECH, "middle", "700"))
    # the propshaft across the machinery aisle
    pa = pl.p(depth + 4.8, DE_X)
    pb2 = pl.p(r2z - 4.8, DE_X + off)
    o.append(rect(pl.p(depth + 2.6, DE_X - 3.6),
                  (r2z - depth - 5.2) * pl.s, 7.2 * pl.s, fill="none", col=MECH, sw=1.3, r=3))
    o.append(line(pa, pb2, MECH, 6.0))
    for q in (pa, pb2):
        o.append(circ(q, 5.6, fill=PAPER, col=INK, w=2.0))
        o.append(line((q[0] - 4, q[1] - 4), (q[0] + 4, q[1] + 4), INK, 1.6))
        o.append(line((q[0] - 4, q[1] + 4), (q[0] + 4, q[1] - 4), INK, 1.6))
    sy = ((pa[0] + pb2[0]) / 2, (pa[1] + pb2[1]) / 2)
    o.append(rect((sy[0] - 17, sy[1] - 7), 34, 14, fill="#dfe4ea", col=STEEL, sw=1.6, r=2))
    o.append(txt((sy[0], sy[1] - 13), "SLIP YOKE — KEEP IT", 9.5, STEEL, "middle", "700"))
    o.append(dim_h(pa[0], pb2[0], pl.p(0, DE_X + 6.2)[1],
                   'JOINT TO JOINT  602 mm = 23.7"  (D81)', MECH, 10))
    o.append(txt(pl.p((depth + r2z) / 2, DE_X + 8.4), "trough: bolted lid, independently",
                 9, MECH, "middle", "600"))
    o.append(txt(pl.p((depth + r2z) / 2, DE_X + 9.9), "bracketed, end shrouds, yoke pinned,",
                 9, MECH, "middle", "600"))
    o.append(txt(pl.p((depth + r2z) / 2, DE_X + 11.4), "6 mm safety loop at EACH joint",
                 9, MECH, "middle", "600"))
    # gearmotor on row 2's post
    gq = pl.p(r2z + 9.0, DE_X + off + 7.5)
    o.append(rect((gq[0] - 33, gq[1] - 11), 66, 22, fill="#f6d8d4", col=MECH, sw=1.7, r=3))
    o.append(txt((gq[0], gq[1] + 4), "GEARMOTOR", 9.5, MECH, "middle", "700"))
    o.append(txt((gq[0] + 40, gq[1] - 1), "on row 2's post;", 9.5, MUTED))
    o.append(txt((gq[0] + 40, gq[1] + 12), "row 3's in the other half", 9.5, MUTED))
    # dimensions
    o.append(dim_h(pl.p(r1z - 1.0, 0)[0], pl.p(r1z + depth + 4.8, 0)[0],
                   pl.p(0, -17)[1], 'line shaft ~950 mm — UNCHANGED (D81)', STEEL, 10))
    o.append(dim_h(pl.p(depth, 0)[0], pl.p(r2z, 0)[0], pl.p(0, -17)[1],
                   'machinery aisle 33.3" = 847 mm', MUTED, 10))
    o.append(dim_h(pl.p(r2z, 0)[0], pl.p(r2z + depth, 0)[0], pl.p(0, -17)[1],
                   'row 2', MUTED, 10))
    o.append(dim_v(pl.p(r1z - 4.0, 0)[0], pl.p(0, 0)[1], pl.p(0, DE_X)[1],
                   '14"', MECH, 10))
    o.append(txt(pl.p(r2z + depth + 4.0, DE_X - 2.6), 'all three axes', 10, STEEL,
                 "start", "700"))
    o.append(txt(pl.p(r2z + depth + 4.0, DE_X - 1.2), 'at 85"', 10, STEEL, "start", "700"))
    # ---- the offset detail, exaggerated -------------------------------
    ex, ey = 92, 1354
    o.append(txt((ex, 1288), "OFFSET DETAIL  —  axes exaggerated ×15", 11.5, INK,
                 "start", "700"))
    o.append(line((ex, ey), (ex + 110, ey), STEEL, 3.0))
    o.append(line((ex + 185, ey - 32), (ex + 300, ey - 32), STEEL, 3.0))
    o.append(line((ex + 110, ey), (ex + 185, ey - 32), MECH, 5.0))
    o.append(line((ex + 110, ey), (ex + 300, ey), FAINT, 1.0, dash="5 4"))
    o.append(circ((ex + 110, ey), 5.2, fill=PAPER, col=INK, w=1.8))
    o.append(circ((ex + 185, ey - 32), 5.2, fill=PAPER, col=INK, w=1.8))
    o.append(dim_v(ex + 314, ey - 32, ey, "15 mm", MECH, 10.5))
    o.append(txt((ex + 4, ey + 22), "1.43° at EACH joint — 15 mm over 602 mm (D82)",
                 10.5, MECH, "start", "700"))
    o.append(txt((ex + 4, ey + 38), "usable band is 0.5–2°, so the angle needs no "
                                    "checking", 9.5, MUTED))
    tx2 = 448
    o.append(txt((tx2, 1306), "A universal joint at zero angle never indexes its needle",
                 10.5, MUTED))
    o.append(txt((tx2, 1322), "rollers. They stop rolling, sit still under load and BRINELL",
                 10.5, MUTED))
    o.append(txt((tx2, 1338), "the cups. A straight propshaft is a FAILURE, not a neat job.",
                 10.5, MECH, "start", "700"))
    o.append(txt((tx2, 1364), "Offset ALONG THE ROW, not vertically: that keeps both line",
                 10.5, INK, "start", "600"))
    o.append(txt((tx2, 1380), "shafts at the SAME height and both drop chains on the same",
                 10.5, INK, "start", "600"))
    o.append(txt((tx2, 1396), "both 140L stock loops stay uncut.", 10.5, INK,
                 "start", "600"))
    o.append(txt((tx2, 1420), "SET THE 15 mm OFFSET.  DO NOT CHASE THE ANGLE.", 11,
                 MECH, "start", "700"))

    # ========================================================================
    # D -- the torque-reaction limit switch
    # ========================================================================
    o.append(panel(940, 900, 800, 540,
                   "D · TORQUE-REACTION LIMIT SWITCH  —  the most important single part "
                   "in Rev C"))
    dl = Flat(21.0, 1206, 2871)
    o.append(line(dl.p(-2.4, 90.2), dl.p(9.8, 90.2), MECH, 5.0))
    o.append(txt(dl.p(3.7, 90.9), "gantry top member, 90\"", 10, MECH, "middle", "700"))
    gz = dl.p(0.0, DE_LINE)
    o.append(rect(dl.p(-1.6, 90.2), 10.4 * dl.s, 1.6 * dl.s,
                  fill="#dfe4ea", col=MECH, sw=1.8))
    o.append(txt(dl.p(4.1, 89.1), "PEDESTAL PLATE, bolted to the top member", 9.5, MECH,
                 "middle", "700"))
    o.append(rect((gz[0] - 1.2 * dl.s, gz[1] - 3.6 * dl.s), 9.6 * dl.s, 9.0 * dl.s,
                  fill="#f6d8d4", col=MECH, sw=2.0, r=4))
    o.append(txt((gz[0] + 4.0 * dl.s, gz[1] - 1.9 * dl.s), "GEARBOX", 12, MECH,
                 "middle", "700"))
    o.append(txt((gz[0] + 4.0 * dl.s, gz[1] - 0.6 * dl.s), "worm / double worm", 9.5,
                 MUTED, "middle"))
    o.append(txt((gz[0] + 4.0 * dl.s, gz[1] + 0.6 * dl.s), "250–300:1", 9.5, MUTED,
                 "middle"))
    o.append(txt((gz[0] + 4.0 * dl.s, gz[1] + 1.8 * dl.s), "≥100 N·m at ~5 rpm", 9.5,
                 MUTED, "middle"))
    o.append(txt((gz[0] + 4.0 * dl.s, gz[1] + 3.0 * dl.s), "output shaft 25–35 mm", 9.5,
                 MUTED, "middle"))
    o.append(line(dl.p(-3.6, DE_LINE), dl.p(0.0, DE_LINE), STEEL, 6.0))
    cp = dl.p(-2.0, DE_LINE)
    o.append(rect((cp[0] - 9, cp[1] - 12), 18, 24, fill="#dfe4ea", col=STEEL, sw=1.8, r=2))
    o.append(circ(gz, 11.0, fill=PAPER, col=INK, w=2.4))
    o.append(circ(gz, 3.4, fill=INK, col=INK, w=1))
    o.append(lead(gz, (975, 1000), "PIVOT — on the output axis", INK, 10, "700", "start"))
    o.append(lead((cp[0], cp[1] - 12), (975, 1024),
                  "removable two-bolt coupling (D29)", STEEL, 10, "700", "start"))
    o.append(txt((981, 1042), "to the 20 mm line shaft", 9.5, MUTED))
    # the 450 mm arm, the rubber block, the switch
    o.append(line(dl.p(0.0, DE_LINE), dl.p(-9.0, DE_LINE), INK, 5.0))
    o.append(txt(dl.p(-5.0, 85.6), "REACTION ARM  450 mm", 10, INK, "middle", "700"))
    o.append(txt(dl.p(-3.6, 84.2), "(foreshortened — see B)", 9, MUTED, "middle"))
    bx = dl.p(-9.0, 84.5)
    for k in range(3):
        o.append(rect((bx[0] - 26, bx[1] + k * 11), 52, 9,
                      fill="#3a3f46", col=INK, sw=1.0, op=0.75))
    o.append(arrow(dl.p(-9.0, 84.9), dl.p(-9.0, 84.6), MECH, 2.2, 5.0))
    o.append(line(dl.p(-10.6, 81.4), dl.p(-7.4, 81.4), MECH, 5.0))
    o.append(txt(dl.p(-8.4, 80.8), "seat welded to the 63\" brace", 9.5, MECH,
                 "middle", "600"))
    o.append(txt(dl.p(-8.4, 80.1), "STACKED RUBBER BLOCK", 9.5, INK, "middle", "700"))
    o.append(txt(dl.p(-8.4, 79.5), "conveyor-belt offcut", 9, MUTED, "middle"))
    sx = dl.p(-6.9, 83.1)
    o.append(rect((sx[0], sx[1]), 26, 34, fill="#ffe9a8", col=INK, sw=1.8, r=3))
    o.append(txt((sx[0] + 13, sx[1] + 22), "LS", 11, INK, "middle", "700"))
    o.append(txt((sx[0] + 34, sx[1] + 12), "LIMIT SWITCH,", 9.5, INK, "start", "700"))
    o.append(txt((sx[0] + 34, sx[1] + 25), "behind the block", 9.5, INK, "start", "700"))
    # how to set it
    o.append(txt((975, 1226), "HOW TO SET IT", 11.5, MECH, "start", "700"))
    t, _ = wrap(975, 1246, 430,
                "Hook the luggage scale to the arm 450 mm from the output axis and pull until "
                "the switch trips. It must trip at 37.6 kgf. Adjust with the nut behind the "
                "rubber stack, then PAINT A MARK on the nut and confirm that mark monthly.",
                10.5, 14, MUTED)
    o.append(t)
    # the numbers
    nx = 1450
    o.append(txt((nx, 960), "THE ONE NUMBER TO SET", 12, MECH, "start", "700"))
    yy = 986
    for a, b in [
        ("TRIP", "165.8 N·m = 37.6 kgf at the arm"),
        ("Set with", "a nut, checked on the luggage scale"),
        ("Behaviour", "LATCHING, into the contactor coil"),
        ("Why latching", "clearing a jam must not restart the belt"),
        ("Gearbox peak", "127.6 N·m — the trip is 92% of nominal, so the box cannot "
                         "reach its own rating"),
        ("Unprotected stall", "~852 N·m · 23.9 kN into a 27.7 kN belt = 86% of ultimate"),
        ("Weakest link", "the 20 mm shaft at ~170 N·m, and the frame — NOT the belt"),
        ("Why that matters", "a twisted shaft is permanently out of square, and THAT BELT "
                             "NEVER TRACKS AGAIN"),
    ]:
        o.append(txt((nx, yy), a, 10.5, INK, "start", "700"))
        t, yy = wrap(nx, yy + 14, 272, b, 10, 13)
        o.append(t)
        yy += 8
    o.append(rect((960, 1320), 760, 108, fill="#fdf1ef", col="#eec4bd", sw=1, r=6))
    o.append(txt((982, 1344), "★ DO NOT SUBSTITUTE ANY OF THESE FOR THE TORQUE LIMITER",
                 11.5, MECH, "start", "700"))
    t, _ = wrap(982, 1364, 716,
                "A SHEAR PIN: after the third failure it gets replaced with a bigger bolt and "
                "the protection is gone for the machine's life.  ·  THE THERMAL OVERLOAD: at "
                "a true stall it still takes 10–20 s, by which time the joint or the shaft is "
                "gone; it protects the motor, not the machine.  ·  AND THE LIMIT OF THE "
                "LIMITER: it catches JAMS. Only a human eye catches mistracking.",
                10.5, 14, MUTED)
    o.append(t)

    # ========================================================================
    # E -- bearing seating and the turned hub
    # ========================================================================
    o.append(panel(40, 1460, 880, 530,
                   "E · BEARING SEATING AND THE TURNED HUB  —  view along the row, in mm"))
    b2 = Flat(2.2, 132, 1704)          # u = z outboard from the heel, v = up the post
    # the outstanding leg, seen face-on: 50 mm wide, heel at u = 0, toe at u = 50
    o.append(rect(b2.p(0, 86), 50 * b2.s, 172 * b2.s, fill="#eef1f4", col=STEEL, sw=1.0))
    for k in range(8):
        o.append(line(b2.p(0, 82 - k * 20), b2.p(50, 70 - k * 20), "#c6cdd6", 0.6))
    o.append(line(b2.p(0, 86), b2.p(0, -86), STEEL, 4.0))
    o.append(line(b2.p(50, 86), b2.p(50, -86), STEEL, 4.0))
    o.append(txt(b2.p(0, 89), "HEEL", 9, STEEL, "middle", "700"))
    o.append(txt(b2.p(50, 89), "TOE", 9, STEEL, "middle", "700"))
    o.append(rect(b2.p(47, 76), 3 * b2.s, 18 * b2.s, fill="#ffe9a8", col=INK, sw=1.5))
    # UCP204: base 35 mm in z, 127 mm long in y, bolts 95 mm apart
    o.append(rect(b2.p(12, 63.5), 35 * b2.s, 127 * b2.s, fill="#dfe4ea", col=STEEL,
                  sw=1.8, r=6))
    o.append(rect(b2.p(10, 27), 39 * b2.s, 54 * b2.s, fill="#eef1f4", col=STEEL,
                  sw=1.6, r=10))
    for vv in (47.5, -47.5):
        o.append(circ(b2.p(29.5, vv), 7 * b2.s, fill=PAPER, col=INK, w=1.8))
        o.append(line(b2.p(21, vv), b2.p(38, vv), INK, 0.7, dash="4 3"))
        o.append(line(b2.p(29.5, vv - 9), b2.p(29.5, vv + 9), INK, 0.7, dash="4 3"))
    # the shaft, the collar, the hub, the plates -- ruling R6 / D84 positions
    HT = float(D["hub_toe_mm"])                       # 16 mm: inboard plate off the toe
    u_in = 50 + HT                                    # 66  inboard plate face
    u_sand = u_in + 29                                # 95  outboard plate face (29 sandwich)
    u_end = u_in + 50                                 # 116 end of the 50 mm boss
    u_col = 54                                        # collar outer face, 4 mm past the toe
    o.append(rect(b2.p(-28, 10), 160 * b2.s, 20 * b2.s, fill="#cfd6de", col=STEEL, sw=1.6))
    o.append(txt(b2.p(-16, 14), "Ø20", 9.5, STEEL, "middle", "700"))
    o.append(rect(b2.p(47, 15), 7 * b2.s, 30 * b2.s, fill="#b9c2cc", col=STEEL, sw=1.5))
    o.append(rect(b2.p(u_in, 20), 50 * b2.s, 40 * b2.s, fill="#f6d8d4", col=MECH, sw=1.8))
    o.append(rect(b2.p(u_in + 10.5, 50), 8 * b2.s, 100 * b2.s,
                  fill="#f2c9c4", col=MECH, sw=1.5))
    for uu in (u_in, u_sand - 5):
        o.append(rect(b2.p(uu, 80), 5 * b2.s, 160 * b2.s, fill="#eec4bd", col=MECH, sw=1.6))
    # dimensions
    o.append(dim_h(b2.p(0, 0)[0], b2.p(29.5, 0)[0], b2.p(0, 70)[1], "28", STEEL, 9.5))
    o.append(dim_v(b2.p(4.5, 0)[0], b2.p(0, -47.5)[1], b2.p(0, 47.5)[1], "", STEEL, 9.5))
    o.append(vtxt(b2.p(1.8, 0), "95", 9.5, STEEL, "middle", "700"))
    for uu, vv in ((47, -100), (50, -88), (u_col, -64), (u_in, -64),
                   (u_in + 14.5, -100), (u_end, -88), (119.5, -76)):
        o.append(line(b2.p(uu, -58), b2.p(uu, vv), MUTED, 0.9, dash="3 3"))
    o.append(dim_h(b2.p(u_col, 0)[0], b2.p(u_in, 0)[0], b2.p(0, -64)[1],
                   f"{D['hub_clear_mm']} CLEAR", MECH, 9.5))
    o.append(dim_h(b2.p(50, 0)[0], b2.p(119.5, 0)[0], b2.p(0, -76)[1],
                   f"{D['hub_free_mm']} AVAILABLE", STEEL, 9.5))
    o.append(dim_h(b2.p(50, 0)[0], b2.p(u_end, 0)[0], b2.p(0, -88)[1],
                   f"★ {D['hub_need_mm']} NEEDED = {D['hub_toe_mm']} + 50 "
                   f"(3.5 spare)", MECH, 9.5))
    o.append(dim_h(b2.p(47, 0)[0], b2.p(u_in + 14.5, 0)[0], b2.p(0, -100)[1],
                   f"OVERHANG {D['ovh_mm']} — ≤{D['ovh_max_mm']} RULED (R6)",
                   MECH, 9.5))
    # numbered callouts
    cpts = [(6, 30), (48, 82), (17, -58), (50.5, 26), (105, -10), (u_in + 14, 40),
            (u_sand - 2.5, 72), (u_in + 0.5, 58)]
    for n, (uu, vv) in enumerate(cpts, start=1):
        o.append(callout(b2.p(uu, vv), n, 9))
    kx = 418
    yy = 1516
    for n, s2 in enumerate([
        "Outstanding leg 50 × 50 × 5 — its OUTER face is the seat; the heel points at "
        "the belt",
        "3 mm offcut laid on the toe: butt the base against it. No measuring, "
        "repeatable 48 times",
        "UCP204: base 35 wide, 2 × Ø14 at 95 c/c, 28 from the heel, M12 × 40 gr 8.8 "
        "nyloc, no doubler",
        "★ Grub-screw collar — it STAYS OUTBOARD (R6). Inboard there is no key access, "
        "ever, and an unreachable set screw is how a drive roller walks",
        "Turned boss Ø40 × 50, bored Ø20 H7, 6 × 6 keyway full length — the 50 mm boss "
        "IS the 50 mm key",
        "Integral flange Ø100 × 8",
        "One 38T 428 plate each side on 5.5 mm spacers, M8 through. All 3 hubs per row "
        "identical, and all 12 move outboard by the SAME 11 mm, so every chain stays "
        "coplanar",
        "★ 16 mm from the inboard plate to the TOE — the hub is what moved (R6 / D84)",
    ], start=1):
        o.append(callout((kx, yy - 4), n, 9))
        t, yy = wrap(kx + 16, yy, 182, s2, 10, 13)
        o.append(t)
        yy += 8
    # notes for E
    e2 = 636
    o.append(txt((e2, 1512), "THREE RULES THE WELDER CAN CHECK", 11, INK, "start", "700"))
    t, yy = wrap(e2, 1532, 278,
                 "1 · The face looking at the belt is an OUTSIDE face — never the inside of "
                 "the L.   2 · The heel points at the belt.   3 · The bearing leg reaches "
                 "into the aisle.", 10.5, 14, MUTED)
    o.append(t)
    o.append(txt((e2, yy + 24), "★ RULED (R6 / D84) — AND THE BENCH CHECK",
                 11, MECH, "start", "700"))
    t, yy = wrap(e2, yy + 44, 278,
                 "The collar stays outboard and the HUB moves out 11 mm, to 16 mm off the "
                 "toe — 12 mm clear for a 3 mm L-key, 66 of the 69.5 mm budget. Overhang "
                 "33.5 mm breaks D36's 25 mm rule, so it is checked, not obeyed: 2.4× at "
                 "the trip load (see G). IT GATES THE POSTS: bench a real UCP204, two real "
                 "plates, a 3 mm offcut and a real 50 × 50 × 5, and measure the collar "
                 "projection. ≤8 mm → build as ruled; >8 mm → boss and key 50 → 44 mm.",
                 10.5, 14, MECH, "600")
    o.append(t)
    o.append(txt((e2, yy + 24), "WHY THE BEARING BOLTS AND IS NEVER WELDED", 11, INK,
                 "start", "700"))
    t, yy = wrap(e2, yy + 44, 278,
                 "Chain tension pulls VERTICALLY, and a welded pad would put that pull "
                 "straight into a weld.  Bolted to the outstanding leg it is in-plane shear "
                 "on two M12 bolts, in the leg's strong direction — no weld in the load "
                 "path, and no doubler needed.", 10.5, 14, MUTED)
    o.append(t)
    o.append(txt((e2, yy + 24), "ACCEPT THE ANGLE AT THE YARD", 11, INK, "start", "700"))
    for i, s2 in enumerate([
        "leg width ≥ 46 mm — at 44 the nut lands on the fillet",
        "thickness ≥ 3.5 mm · fillet ≤ 12 mm · bow ≤ 5 mm / 6 m",
        "50 × 50 is the MINIMUM wherever a pillow block lands",
        "M12 × 40 grade 8.8, nyloc or double nut, no doubler",
        "drive end FIXED; the idler end is the slotted shelf",
    ]):
        o.append(txt((e2, yy + 44 + i * 15), "·  " + s2, 10, MUTED))

    # ========================================================================
    # F -- the discharge
    # ========================================================================
    o.append(panel(940, 1460, 800, 530,
                   "F · DISCHARGE  —  across the row from the rear.  TIERS 2–3: "
                   "hopper → channel → TWO-TIER chute.  TIER 1: FREE"))
    dc = Flat(5.0, 1000, 1932)
    zc0, zc1 = 0.0, float(D["depth"])
    CH, XF = D["chan"], D["xfall"]
    for tt in range(3):
        o.append(rect(dc.p(zc0, FLOOR[tt]), zc1 * dc.s, (FLOOR[tt] - PAN[tt] + 3) * dc.s,
                      fill="#f7d9d5", col="#eec4bd", sw=0.8, op=0.75))
    o.append(line(dc.p(-4, 0), dc.p(70, 0), FAINT, 2.0))
    for i in range(25):
        a = dc.p(-4 + i * 3, 0)
        o.append(line((a[0], a[1]), (a[0] - 4, a[1] + 4), FAINT, 0.9))
    # ---- TIERS 2 AND 3 ONLY: 45 deg walls, 150 mm of cross-fall, a 100 x 100
    #      channel.  Tier 1 has none of it (ruling R7 / D105) ----------------
    for tt in range(3):
        o.append(line(dc.p(zc0, PAN[tt]), dc.p(zc1, PAN[tt]), PAN_L, 2.6))
        o.append(rect(dc.p(zc0, TOP[tt]), zc1 * dc.s, D["cage_h"] * dc.s,
                      fill=CAGE_F, col=CAGE_L, sw=1.0, op=0.4))
        if tt == 0:
            continue
        yhi = PAN[tt] - 0.8                     # channel top, inboard (high) end
        ylo = yhi - XF                          # channel top, outboard (low) end
        o.append(poly([dc.p(zc0, PAN[tt]), dc.p(zc1, PAN[tt]),
                       dc.p(zc1, ylo), dc.p(zc0, yhi)],
                      fill="#efe6da", col=MANURE, w=1.0, op=0.75))
        o.append(poly([dc.p(zc0, yhi), dc.p(zc1, ylo),
                       dc.p(zc1, ylo - CH), dc.p(zc0, yhi - CH)],
                      fill="#e7ded3", col=MANURE, w=1.6))
        o.append(arrow(dc.p(zc1 * 0.74, yhi - XF * 0.74 - CH / 2),
                       dc.p(zc1 - 1.0, ylo - CH / 2), MANURE, 1.8, 4.5))
        o.append(arrow(dc.p(-3.2, yhi - CH / 2), dc.p(-0.4, yhi - CH / 2),
                       WATER, 1.8, 4.5))
    # the channel labels RIDE ON the channel at its own angle, so no line strikes
    # through them.  The 45 deg walls are fore-and-aft -- square to this section, so
    # they are a note, not a label on the geometry.
    SLOPE = math.degrees(math.atan2(XF, zc1))
    for tt, s2, wt in ((2, "100 × 100 CHANNEL", "700"),
                       (1, "IDENTICAL ON ALL 8", "700")):
        lp = dc.p(zc1 * 0.40, PAN[tt] - 0.8 - XF * 0.40 - CH / 2)
        o.append(vtxt((lp[0], lp[1] + 3.0), s2, 8.5, MANURE, "middle", wt, ang=SLOPE))
    o.append(vtxt(dc.p(-9.6, 46), "2 L FLUSH — each channel, every evening", 8.5,
                  WATER, "middle", "700"))
    # the fall and the section, dimensioned once, on tier 2
    y2 = PAN[1] - 0.8
    for yy2 in (y2, y2 - XF, y2 - XF - CH):
        o.append(line(dc.p(-0.6, yy2), dc.p(-7.4, yy2), MUTED, 0.7, dash="3 3"))
    o.append(dim_v(dc.p(-3.0, 0)[0], dc.p(0, y2)[1], dc.p(0, y2 - XF)[1], "150", MECH, 9.5))
    o.append(dim_v(dc.p(-6.6, 0)[0], dc.p(0, y2 - XF)[1], dc.p(0, y2 - XF - CH)[1],
                   "100", MECH, 9.5))
    # ---- ONE combining chute, TIERS 2 AND 3, LIQUID-TIGHT ---------------
    ytop = PAN[2] - 0.8 - XF
    o.append(poly([dc.p(zc1, ytop + 1.2), dc.p(zc1 + 10.0, ytop + 1.2),
                   dc.p(zc1 + 10.0, D["spout"]), dc.p(zc1 + 4.2, D["spout"]),
                   dc.p(zc1 + 4.2, D["spout"] + 4.0), dc.p(zc1, D["spout"] + 4.0)],
                  fill="#e7ded3", col=MANURE, w=1.8, op=0.9))
    o.append(vtxt(dc.p(zc1 + 5.8, 40), "TWO-TIER CHUTE  ≥45°  ·  LIQUID-TIGHT", 9,
                  MANURE, "middle", "700"))
    for i2, s2 in enumerate([
            "TWO inlets — tiers 2 and 3.  Tier 1 has NO inlet (R7)",
            "45° hopper walls fore-and-aft — not seen in this section",
            "150 mm of fall across the 790 mm, identical on all 8",
            "bare galvanised, NOT painted · ONE wingnut rodding door per inlet",
            "LIQUID-TIGHT: the tray drains, not the chute"]):
        o.append(txt((1206, 1502 + i2 * 14), s2, 9,
                     MECH if i2 == 0 else MANURE, "start", "700" if i2 == 0 else "600"))
    o.append(dim_v(dc.p(zc1 + 11.0, 0)[0], dc.p(0, 0)[1], dc.p(0, D["spout"])[1],
                   '', MANURE, 9.5))
    o.append(txt((1213, 1880), "spout 250 above the tray floor", 9, MANURE,
                 "start", "700"))
    # ---- TIER 1 (R7 / D105): free discharge, a three-sided shroud, own tray --
    T1Y, T1TR = PAN[0], D["tray_d"]          # 12" discharge, 150 mm tray rim
    pz0d, pz1d = (zc1 - D["pan_w"]) / 2, zc1 - (zc1 - D["pan_w"]) / 2
    bz0d, bz1d = (zc1 - D["belt_w"]) / 2, zc1 - (zc1 - D["belt_w"]) / 2
    # tier 1's OWN tray first: the D77 part at 1.0 m ACROSS the row (R7b / D112)
    t1z0, t1z1 = zc1 / 2 - D["t1_tray_l"] / 2, zc1 / 2 + D["t1_tray_l"] / 2
    o.append(rect(dc.p(t1z0, T1TR), D["t1_tray_l"] * dc.s, T1TR * dc.s,
                  fill="#eef4f8", col=STEEL, sw=2.0, r=2))
    o.append(rect(dc.p(t1z0 + 0.5, T1TR - 0.5), (D["t1_tray_l"] - 1.0) * dc.s,
                  (T1TR - 0.9) * dc.s, fill="#dff1fa", col=WATER, sw=1.0, op=0.55))
    o.append(txt(dc.p(zc1 / 2 - 6, 3.6), "TIER-1 TRAY  ×4", 9.5, STEEL,
                 "middle", "700"))
    o.append(txt(dc.p(zc1 / 2 - 6, 1.5), "the D77 part at 1.0 m", 8.5, MUTED,
                 "middle"))
    o.append(dim_h(dc.p(t1z0, 0)[0], dc.p(t1z1, 0)[0], dc.p(0, -3.4)[1],
                   f'1.0 m ACROSS the row  ·  x = 2–26"  ·  '
                   f'{D["t1_tray_cap"]} L = 5 × a run',
                   STEEL, 9.5))
    # the curtain: 790 mm wide, essentially vertical -- 3 mm of carry at 16 mm/s
    o.append(rect(dc.p(bz0d, T1Y - 0.5), (bz1d - bz0d) * dc.s, (T1Y - 0.5 - T1TR) * dc.s,
                  fill="#efe6da", col="none", sw=0, op=0.8))
    for i3 in range(6):
        zq = bz0d + (i3 + 0.5) * (bz1d - bz0d) / 6
        o.append(arrow(dc.p(zq, T1Y - 0.8), dc.p(zq, T1TR + 0.5), MANURE, 1.4, 3.4))
    # the THREE-SIDED SHROUD: both ends seen here, the cage-side face is square
    # to this section.  Pan lip down to the 150 mm tray rim, OPEN REARWARD ONLY.
    for zq in (pz0d, pz1d):
        o.append(line(dc.p(zq, T1Y + 0.2), dc.p(zq, T1TR), STEEL, 3.6))
        for i3 in range(4):
            a = dc.p(zq, T1TR + 0.5 + i3 * 1.4)
            o.append(line((a[0], a[1]), (a[0] + (5 if zq > 16 else -5), a[1] - 5),
                          STEEL, 0.8))
    o.append(txt(dc.p(zc1 / 2 - 3, T1Y + 1.1), "TIER 1 FALLS FREE — 305 mm", 9.0,
                 MECH, "middle", "700"))
    # ---- the catch tray in the aisle: TIERS 2 AND 3, set just clear of the
    #      tier-1 rim so the 33" aisle reads 68 + 600 + 170 mm ---------------
    ZAT = t1z1
    o.append(rect(dc.p(ZAT, D["tray_d"]), D["tray_w"] * dc.s, D["tray_d"] * dc.s,
                  fill="#eef4f8", col=STEEL, sw=2.0, r=2))
    o.append(rect(dc.p(ZAT + 0.4, D["tray_d"] - 0.5), (D["tray_w"] - 0.8) * dc.s,
                  (D["tray_d"] - 0.9) * dc.s, fill="#dff1fa", col=WATER, sw=1.0, op=0.7))
    o.append(txt(dc.p(ZAT + D["tray_w"] / 2, 3.4), "AISLE TRAY ×4", 9.0, STEEL,
                 "middle", "700"))
    o.append(txt(dc.p(ZAT + D["tray_w"] / 2, 1.3),
                 "tiers 2–3  ·  1.2 m  ·  108 L", 8.5, MUTED, "middle"))
    o.append(dim_h(dc.p(zc1 / 2 + D["row_foot"] / 2, 0)[0],
                   dc.p(zc1 / 2 + D["row_foot"] / 2 + 33, 0)[0], dc.p(0, -7.8)[1],
                   'WALL AISLE 33"  —  68 of tier-1 rim + 0.6 m of tray + 170 of strip',
                   MUTED, 9.5))
    # ---- inset: the tray ALONG the row, packed up 60 mm at one end ------
    o.append(rect((1204, 1596), 270, 132, fill="#fbfcfd", col=FAINT, sw=1, r=5))
    o.append(txt((1218, 1620), "THE TRAY ALONG THE ROW  —  1:20", 9.5, INK,
                 "start", "700"))
    ins = Flat(4.3, 1224, 1700)
    TL, TD, TP = D["tray_l"], D["tray_d"], D["tray_pack"]
    o.append(line(ins.p(-3, 0), ins.p(TL + 5, 0), FAINT, 1.6))
    o.append(rect(ins.p(0, TP), 4 * ins.s, TP * ins.s, fill="#dfe4ea", col=STEEL, sw=1.0))
    o.append(poly([ins.p(0, TP + TD), ins.p(0, TP), ins.p(TL, 0), ins.p(TL, TD)],
                  fill="#eef4f8", col=STEEL, w=1.8))
    o.append(poly([ins.p(TL * 0.66, 0.95), ins.p(TL, 0.95), ins.p(TL, 0),
                   ins.p(TL * 0.66, 0.37)], fill="#dff1fa", col=WATER, w=1.2))
    o.append(txt(ins.p(TL * 0.30, TP + 1.6), "solids", 8.5, MUTED, "middle"))
    o.append(txt(ins.p(TL * 0.84, 2.2), "LIQUID", 8.5, WATER, "middle", "700"))
    o.append(txt(ins.p(0, TP + TD + 1.4), "packed up 60", 8.5, STEEL, "start", "700"))
    o.append(txt(ins.p(TL, TD + 2.2), "scoop this FIRST", 8.5, WATER, "end", "700"))
    o.append(dim_h(ins.p(0, 0)[0], ins.p(TL, 0)[0], ins.p(0, -3.4)[1],
                   'AISLE 1.2 m · 108 L  —  TIER 1 the same at 1.0 m · 90 L',
                   MUTED, 8.0))
    # ---- ★ tier 1's free discharge, flagged where it happens ------------
    o.append(rect((1204, 1734), 270, 128, fill="#fdf1ef", col="#e6b7b0", sw=1, r=5))
    o.append(line((1210, 1800), dc.p(zc1 / 2 + 3.0, PAN[0] * 0.55), MECH, 0.9))
    o.append(txt((1218, 1754), "★ TIER 1 — NO CHUTE, NO HOPPER, A SHROUD", 9.5, MECH,
                 "start", "700"))
    t, _ = wrap(1218, 1770, 244,
                f'It falls FREE over its drive roller at {PAN[0] * 25.4:.0f} mm, '
                f'essentially vertical: at 16 mm/s the carry is {D["t1_carry_mm"]} mm, so '
                f'it lands where the roller is. 790 mm of curtain into a 1000 mm tray = '
                f'{D["t1_margin_mm"]} mm of rim outboard of it each side. NO channel, NO '
                f'flush. The 3-SIDED SHROUD runs from the pan lip down to '
                f'{D["tray_d"] * 25.4:.0f} mm — both ends and the cage-side face — so the '
                f'ONLY open face is REARWARD, and that is the axis the chalk test '
                f'measures (G).',
                9, 11.5, MECH)
    o.append(t)
    # ---- notes for F ----------------------------------------------------
    fx = 1490
    o.append(txt((fx, 1508), "WHY IT TURNS INTO THE AISLE  (D79)", 10.5, MECH,
                 "start", "700"))
    t, yy = wrap(fx, 1526, 240,
                 "The LABOURER decides it: to scoop he crouches FACING the tray, which "
                 "needs ~600 mm of knee room beyond it. Behind the row there is 584 mm "
                 "in all.", 10, 13, MUTED)
    o.append(t)
    o.append(txt((fx, yy + 18), "★ THREE-SIDED SHROUD AT TIER 1  (R7 / D105)", 10.5,
                 MECH, "start", "700"))
    t, yy = wrap(fx, yy + 36, 240,
                 "Both ends and the cage-side face, pan lip down to 150 mm, OPEN REARWARD "
                 "ONLY — the tray draws out onto the access floor and a hand in it has no "
                 "upward path to the tier-1 nip. Four of the twelve nose guards are simply "
                 "taller.", 10, 13, MUTED)
    o.append(t)
    o.append(txt((fx, yy + 18), "★ ISOLATE — LOCK — TRY IS PRIMARY HERE", 10.5, MECH,
                 "start", "700"))
    t, yy = wrap(fx, yy + 36, 240,
                 "At this station the padlock is the FIRST protection, not the second: "
                 "there is no four-sided hopper box to rely on. Scoop either tray only "
                 "with the isolator off and your own lock on it.", 10, 13, MECH, "700")
    o.append(t)
    o.append(txt((fx, yy + 18), "TWO TRAYS, ONE DRAWING  (D77 / D78 / R7b)", 10.5, MECH,
                 "start", "700"))
    t, yy = wrap(fx, yy + 36, 240,
                 "TWO LENGTHS off one drawing: 1.2 m in the aisle, 108 L against the "
                 "35.2 L it takes from tiers 2–3; 1.0 m at tier 1, 90 L against a 17.6 L "
                 "run. Section, depth, liner, six clips and the 60 mm pack identical. "
                 "Nothing is swapped during a pass; two patches, both reachable.",
                 10, 13, MUTED)
    o.append(t)
    o.append(txt((fx, yy + 18), "★ THE 2 L FLUSH IS COMPULSORY  (R5)", 10.5, MECH,
                 "start", "700"))
    t, _ = wrap(fx, yy + 36, 240,
                f'TWO channels per row, {2 * D["flush_l"]} L a row — '
                f'{D["flush_house_l"]} L/day in {D["hoppers"]} channels. Skip it and a '
                f'channel glazes and blocks in a week. Run → isolate → scoop → THEN '
                f'flush. GATED: one TIER-2 hopper, one 17.6 kg run.',
                10, 13, MECH, "600")
    o.append(t)

    # ========================================================================
    # G -- guards, clearance checks, queries
    # ========================================================================
    o.append(panel(40, 2010, 1700, 440,
                   "G · GUARDS, CLEARANCE CHECKS, AND WHAT THIS SHEET HAD TO ASSUME"))
    gx = 70
    o.append(txt((gx, 2058), "GUARDS  —  mesh, apertures ≤8 mm, WINGNUT STUDS NOT BOLTS",
                 11.5, INK, "start", "700"))
    yy = 2082
    for a, b in [
        ("Drop-chain enclosure ×4",
         "full length per row, MESH not sheet so the chain can be seen without removing it; "
         "wrap each sprocket ≥25 mm past both tangent points; bottom edge slotted to drain; "
         "top-hinged"),
        ("At the TIER-1 station",
         "CLOSED BOTTOM — no upward-facing opening at ankle height, because the plate bottom "
         "sits at ~7.7\"; drain through a 6 mm slot in the OUTBOARD face; lower outboard "
         "corner a sloped deflector; its own short hinged panel. ★ EXTENDED BY D78: no "
         "upward-facing opening anywhere within 600 mm of the tray — the man scooping "
         "crouches with hands, knees and face at that height"),
        ("Discharge nose ×12  —  ★ tier 1's FOUR are the 3-SIDED SHROUD",
         "full 790 mm, ≤6 mm gap to the belt, ≥200 mm back along the incoming run.  ★ At "
         "tier 1 it runs on DOWN to 150 mm and wraps both ends and the cage-side face, open "
         "REARWARD only (R7 / D105): a hand in the tray then has no upward path to the "
         "tier-1 nip, and there is no upward-facing opening within 600 mm of the tray.  "
         "Not a new BOM line — four of the twelve are simply taller"),
        ("Shaft-end shrouds ×48  ·  propshaft trough ×2",
         "shrouds FIXED and non-rotating; trough with a bolted lid, independently bracketed, "
         "rated for 2× shaft weight, end shrouds, yoke pinned, 6 mm safety loop each joint"),
        ("Bottom skirts ×8 runs",
         "250 mm, both outboard faces, full 22 ft. It keeps an escaped pullet out of the "
         "bottom-tier nip — under the bottom tier is the darkest spot in the house — and it "
         "is what a boot actually meets, 100 mm outboard of the sprocket plane"),
    ]:
        o.append(txt((gx, yy), a, 10.5, MECH, "start", "700"))
        t, yy = wrap(gx + 6, yy + 15, 500, b, 10, 13)
        o.append(t)
        yy += 8
    t, _ = wrap(gx, yy + 12, 520,
                "A guard that needs a spanner comes off once and never goes back — the "
                "wingnut is as load-bearing as the aperture size. Brush the chain DRY, never "
                "oil it: oil plus manure and feed dust is a grinding paste. Budget one chain "
                "per row per year. And never run the belts after lights-out — a startle in "
                "the dark causes piling, which is a hundred-bird event.", 10.5, 14, INK, "600")
    o.append(t)

    cx2 = 616
    o.append(txt((cx2, 2058), "CLEARANCE CHECKS THIS SHEET CARRIES", 11.5, INK,
                 "start", "700"))
    for i, (a, b) in enumerate([
        ("11.5 mm", "roller face to angle, each side — the tightest gap"),
        ("21.5 mm", "belt edge to the angle, each side — never allowed to touch"),
        ("9 in", "the dropping gap, shaded as a keep-out band on A, B and F"),
        ("16 / 12 mm", "inboard 38T plate off the toe / clear of the collar (R6)"),
        ("33.5 mm", "sprocket overhang — RULED ≤35 here, 2.4× at the trip load"),
        ("69.5 / 66 mm", "free shaft outboard of the toe: available / needed"),
        ("1 mm / 790 mm", "roller parallelism; square to the run within 2 mm"),
        ("10 mm", "belt to pan lip — 1 mm parallelism = 10 mm ÷ 7.42 m of run"),
        ("15 mm", "propshaft offset over 602 mm = 1.43°.  NEVER zero."),
        ("250 mm", "chute spout above the tray floor, over its 150 mm lip"),
        ("305 mm", "★ tier 1's FREE discharge — 3 mm of carry at 16 mm/s (R7)"),
        ("1000 mm", "★ tier 1's tray across the row — 68 mm outboard each side"),
        ("1100 mm", "★ CLEAR between the post feet — tray passes, 50 each side"),
        (f"{T1_SKIRT_MM:.0f} mm", f"★ tray rim {T1_RIM_MM:.0f} to the skirt line "
                                  f"{SKIRT_Z_MM:.0f}, off the row centre"),
        ("188 mm", "★ R1(a)'s brace crossing x = 2–26\" — over the 150 mm rim"),
        ("250 N", "slack-side tension — the fuse is gone if it is too tight"),
    ]):
        o.append(txt((cx2, 2072 + i * 17), a, 10.5, MECH, "start", "700"))
        t, _ = wrap(cx2 + 96, 2072 + i * 17, 292, b, 10, 11)
        o.append(t)
    lg, _ = legend(cx2, 2348, [
        (MECH, "drive — rollers, chain, sprockets, posts, gearmotor"),
        (MANURE, "hopper, 100 mm cross-channel, TWO-TIER chute, tier 1's free fall"),
        ("#eef4f8", "the TWO catch trays per row  ·  light blue = where liquid pools"),
        (STEEL, "shafts, bearings, angle steel"),
        ("#f7d9d5", "9\" dropping gap — keep-out band"),
    ])
    o.append(lg)

    qx = 1092
    o.append(rect((qx - 18, 2036), 630, 396, fill="#fffbe9", col="#e8d9a0", sw=1, r=6))
    o.append(txt((qx, 2062), "★ WHAT IS CHECKED IN THE FIELD, AND WHAT THIS SHEET "
                              "ASSUMES", 11.5, "#8a6a00", "start", "700"))
    yy = 2086
    for a, b in [
        ("★ PRE-WELD — THE POST FEET ARE NOW A DIMENSION",
         f"Tier 1's tray is {D['t1_tray_l'] * 25.4:.0f} mm across a row whose footprint is "
         f"{D['row_foot'] * 25.4:.0f} mm, so {D['t1_ovh_mm']} mm of rim stands outboard of "
         f"each frame line, and it draws out REARWARD between the two drive-station post "
         f"feet at x = {D['post_x']}\". Those feet must stay ~{D['post_feet_mm']} mm "
         f"CLEAR, foot to foot — the tray then passes with ~{D['post_gap_mm']} mm each "
         f"side. NO foot splayed, cranked or foot-plated OUTBOARD for an easier fit-up. "
         f"Check it before the post is set."),
        ("★ MACHINERY SIDE — CONFIRM THE SKIRT STAND-OFF, THE RULE HOLDS EITHER WAY",
         f"As drawn, the sprocket plane is {SPR_Z_MM:.0f} mm off the row centre and the "
         f"250 mm bottom skirt stands {D['skirt_out_mm']} mm outboard of it, at "
         f"{SKIRT_Z_MM:.0f} mm; the tray rim is at {T1_RIM_MM:.0f} mm, so it stops "
         f"{T1_SKIRT_MM:.0f} mm INBOARD of the skirt line. Measure the built stand-off. "
         f"THE RULE, whatever the figure: NO PART OF THE TRAY RIM PASSES UNDER THE "
         f"DROP-CHAIN ENCLOSURE — a rim inside a guard means slurry in the guard and a "
         f"gap under the skirt whenever the tray is drawn out. If it does, 0.9 m."),
        ("★ ON THE PROTOTYPE — CHALK TIER 1's SPLATTER, REARWARD",
         "Tip a full 17.6 kg run over the bare tier-1 roller and mark the floor. MEASURE "
         "REARWARD FROM THE ROLLER PLANE AT x = 14\" and ACCEPT if the patch stops inside "
         "x = 26\" — within ±305 mm, the tray's own 0.6 m. Throws past → a 150 mm APRON "
         "on the shroud's open rear face, NOT a chute and NOT a bigger tray; 26\" is where "
         "the 23\" access floor starts. It gates THE FOUR APRONS AND FOLDING THE FOUR "
         "SHROUDS only. Chalk the across-row spread as well and write it down."),
        ("The gearmotor mounting",
         "§15.11 puts the pedestal on the 90\" top member; §15.5 says foot-mount on a pivot; "
         "D29 wants a removable coupling at the output. Drawn with the pivot concentric with "
         "the output at 85\" so the coupling sees no arc. Output centre height, pedestal "
         "geometry and pivot position are all assumed."),
        ("The reaction arm's direction",
         "Drawn FORWARD over the stack, reacting down onto the 63\" brace, because rearward "
         "would need structure behind x = 26\". Not stated."),
        ("Sections and sizes not stated",
         "gantry top member, both diagonal braces, rubber-block stack, hopper and chute "
         "plate gauge, and the door leaf width on sheet 3. 50×50×5, 3 mm galvanised and a "
         "30\" leaf assumed; the tray frame IS stated (25×25×3)."),
    ]:
        o.append(txt((qx, yy), "•  " + a, 10.5, "#8a6a00", "start", "700"))
        t, yy = wrap(qx + 12, yy + 14, 590, b, 10, 12)
        o.append(t)
        yy += 5

    write("manure-belt-REVC-6-driveend.svg", W, H, "".join(o))


# ============================================================================
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print(f"Manure-belt drawing set (Rev C)  ->  {OUT}")
    print(f"  elevations: pan {PAN}  floor {FLOOR}  top {TOP}")
    print(f"  {CELLS_SIDE} cells/side  ·  capacity {CAPACITY:,} birds")
    reset_bbox()
    drawing_row()
    drawing_house()
    drawing_details()
    drawing_frontend_c()
    drawing_driveend()
    print("done.")
