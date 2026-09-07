#!/usr/bin/env python3
"""
Rev B drawing set for the hand-cranked manure belt on the H-frame pullet
grower cages (SiloForge farm, Nigeria).

Dimensions here are the single source of truth for the drawings and must match
images/cages/manure-belt-DESIGN.md  (sections 8, 14.10-14.13).
Change a number in DIMS, re-run, and every drawing updates together:

    python cage_belt_drawings.py

Outputs into images/cages/ :
    manure-belt-REVB-1-set.svg      one 6 ft double set, 3 tiers, + end view
    manure-belt-REVB-2-row.svg      full 22 ft row incl. drive / idler / discharge
    manure-belt-REVB-3-house.svg    whole house, 2 halves x 2 rows (plan + 3D)
    manure-belt-REVB-4-details.svg  fabrication details for the welder

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
    rear_off=20,        # drive roller centre beyond the rear leg
    pen_len=327,        # 27 ft 3 in
    half_w=168,         # 14 ft, wall to wall
    wall=6,
    aisle=33.33,
    row_foot=34,        # 32 cage + 2 x 20 mm rod
    birds_cell=8,
)

# elevation schedule -- derived, matches DESIGN.md 14.13
PAN = [D["ground"]]
FLOOR = [PAN[0] + 5]
TOP = [FLOOR[0] + D["cage_h"]]
for _ in range(2):
    FLOOR.append(TOP[-1] + D["gap"])
    PAN.append(FLOOR[-1] - 5)
    TOP.append(FLOOR[-1] + D["cage_h"])

# water: nipple line sits INSIDE each cage, just under its roof, on the divider centreline.
# These heights are what keep it out of the dropping gap.
NIPPLE = [t - 3 for t in TOP]              # 28 / 51 / 74 in

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


def header(w, title, sub, rev="REV B  |  2026-08-03"):
    return "".join([
        rect((0, 0), w, 62, fill=BAND, col=BAND),
        line((0, 62), (w, 62), FAINT, 1.2),
        txt((28, 30), title, 21, INK, "start", "700"),
        txt((28, 50), sub, 12.5, MUTED),
        txt((w - 28, 30), rev, 12, MECH, "end", "700"),
        txt((w - 28, 50), "hand-cranked manure belt  ·  no motor", 11.5, MUTED, "end"),
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
# DRAWING 1 -- one 6 ft double set, 3 tiers  (+ end view)
# ============================================================================
def drawing_set():
    W, H = 1740, 940
    z0, z1 = 0, D["depth"]
    x0, x1 = 0, D["set_full"]
    iso = Iso(4.0, 250, 430)
    o = [header(W, "1 · ONE SET  —  6 ft of double cage, 3 tiers",
                "Two cages back-to-back sharing one belt per tier.  This unit repeats 3½ times to make one row.")]

    # ground shadow
    g = [iso.p(x0 - 4, 0, z0 - 4), iso.p(x1 + 4, 0, z0 - 4),
         iso.p(x1 + 4, 0, z1 + 4), iso.p(x0 - 4, 0, z1 + 4)]
    o.append(poly(g, fill="#eef1f4", col="#e2e6eb", w=1, op=0.9))

    # far frame, then the belts/cages, then near frame on top
    o.append(frame(iso, x0, z0, z1))
    for zz in (z0, z1):
        o.append(longbar(iso, zz, 4, x0, x1))
        for t in range(3):
            o.append(longbar(iso, zz, PAN[t], x0, x1, STEEL12, 1.8))
    o.append(tier_stack(iso, x0, x1, z0, z1, top_wire=True, cutaway=1))
    o.append(frame(iso, x1, z0, z1))

    # point out the cut-away that reveals the pan
    cp = iso.p(x1 - 12, PAN[1] + 1, (z0 + z1) / 2)
    o.append(line(cp, (cp[0] + 96, cp[1] - 54), MECH, 1, dash="4 3"))
    o.append(txt((cp[0] + 100, cp[1] - 56), "belt cut away here —", 11.5, MECH, "start", "700"))
    o.append(txt((cp[0] + 100, cp[1] - 42), "the blue PAN underneath", 11.5, MECH, "start", "700"))
    o.append(txt((cp[0] + 100, cp[1] - 28), "runs the full length", 11.5, MECH, "start", "700"))

    # callouts on the picture
    marks = [
        (1, iso.p(x1, D["upright"] - 2, z1)),                 # upright
        (2, iso.p(x1 - 6, PAN[1], z1 + 1)),                   # pan cross-bar
        (3, iso.p(x1 - 26, PAN[1] + 1.0, (z0 + z1) / 2)),     # pan
        (4, iso.p(x1 - 50, PAN[1] + 2.0, (z0 + z1) / 2 - 8)),  # belt
        (5, iso.p(x1 - 12, FLOOR[1] + 7, z1)),                # cage
        (6, iso.p(x1 - 34, TOP[2], (z0 + z1) / 2)),           # divider
        (7, iso.p(x1 - 18, PAN[2] + 3.0, z1)),                # deflector
        (8, iso.p(x0 + 10, 4, z1)),                           # bottom brace
    ]
    for n, p in marks:
        o.append(callout(p, n))

    # ---- end view -------------------------------------------------------
    ex, ey = 730, 640
    fl = Flat(6.2, ex, ey)
    o.append(txt((ex - 34, 128), "END VIEW  —  looking along the row", 13.5, INK, "start", "700"))
    o.append(txt((ex - 34, 146), "why the belt is narrower than the cage", 11.5, MUTED))
    # uprights
    for zz in (0, D["depth"]):
        a, b = fl.p(zz, 0), fl.p(zz, D["upright"])
        o.append(line(a, b, STEEL, 5))
    # floor line
    o.append(line(fl.p(-6, 0), fl.p(D["depth"] + 6, 0), FAINT, 1.4))
    for t in range(3):
        pz0, pz1 = (D["depth"] - D["pan_w"]) / 2, D["depth"] - (D["depth"] - D["pan_w"]) / 2
        bz0, bz1 = (D["depth"] - D["belt_w"]) / 2, D["depth"] - (D["depth"] - D["belt_w"]) / 2
        # pan cross-bar
        o.append(line(fl.p(0, PAN[t] - 0.8), fl.p(D["depth"], PAN[t] - 0.8), STEEL, 3.2))
        # pan with upturned lips
        o.append(path(f'M {f(fl.p(pz0, PAN[t]+1.6)[0])} {f(fl.p(pz0, PAN[t]+1.6)[1])} '
                      f'L {f(fl.p(pz0, PAN[t])[0])} {f(fl.p(pz0, PAN[t])[1])} '
                      f'L {f(fl.p(pz1, PAN[t])[0])} {f(fl.p(pz1, PAN[t])[1])} '
                      f'L {f(fl.p(pz1, PAN[t]+1.6)[0])} {f(fl.p(pz1, PAN[t]+1.6)[1])}',
                      fill="none", col=PAN_L, w=2.4))
        # belt
        o.append(line(fl.p(bz0, PAN[t] + 0.7), fl.p(bz1, PAN[t] + 0.7), BELT_L, 3.4))
        # return run below the pan
        o.append(line(fl.p(bz0, PAN[t] - 2.5), fl.p(bz1, PAN[t] - 2.5), BELT_L, 2.0))
        # cage + divider
        o.append(rect(fl.p(0, TOP[t]), D["depth"] * fl.s, D["cage_h"] * fl.s,
                      fill=CAGE_F, col=CAGE_L, sw=1.2, op=0.55))
        zm = D["depth"] / 2
        o.append(line(fl.p(zm, FLOOR[t]), fl.p(zm, TOP[t]), CAGE_L, 1.6, dash="4 3"))
        # deflectors
        for zz, sgn in ((pz0, +1), (pz1, -1)):
            o.append(line(fl.p(zz, PAN[t] + 1.6), fl.p(zz + sgn * 2.0, PAN[t] + 3.4), MUTED, 1.8))
        # nipple line -- inside the cage, on the divider, well clear of the gap
        o.append(circ(fl.p(zm, NIPPLE[t]), 4.5, fill="#dff1fa", col=WATER, w=1.6))
        for dz in (-1.2, 1.2):
            a = fl.p(zm + dz, NIPPLE[t] - 0.8)
            o.append(line(a, (a[0], a[1] + 7), WATER, 1.8))
        dtop = fl.p(zm, NIPPLE[t] - 2.4)
        dbot = fl.p(zm, PAN[t] + 1.4)
        o.append(line((dtop[0], dtop[1] + 5), (dbot[0], dbot[1] - 3), WATER, 1, dash="2 4"))

    pm0, pm1 = (D["depth"] - D["pan_w"]) / 2, D["depth"] - (D["depth"] - D["pan_w"]) / 2
    bm0, bm1 = (D["depth"] - D["belt_w"]) / 2, D["depth"] - (D["depth"] - D["belt_w"]) / 2
    base = fl.p(0, -2.0)[1]
    o.append(dim_h(fl.p(0, 0)[0], fl.p(D["depth"], 0)[0], base + 26,
                   'clear span 32" / 813 mm', INK, 11))
    o.append(dim_h(fl.p(pm0, 0)[0], fl.p(pm1, 0)[0], base + 52,
                   "roller face / pan  790 mm", PAN_L, 11))
    o.append(dim_h(fl.p(bm0, 0)[0], fl.p(bm1, 0)[0], base + 78,
                   "BELT  770 mm  ← order this", BELT_L, 11.5))
    o.append(txt((ex + D["depth"] / 2 * fl.s, base + 100),
                 'nothing that turns comes within 0.45" of the rod', 10.5, MECH, "middle", "600"))
    npl = fl.p(D["depth"] / 2, NIPPLE[1])
    lx = ex - 18
    o.append(line((lx + 4, npl[1] - 6), (npl[0] - 7, npl[1] - 1), WATER, 1, dash="3 3"))
    o.append(txt((lx, npl[1] - 45), "nipple line", 11, WATER, "end", "700"))
    o.append(txt((lx, npl[1] - 32), "sits ON THE DIVIDER,", 10, MUTED, "end"))
    o.append(txt((lx, npl[1] - 20), "inside the cage — so drips", 10, MUTED, "end"))
    o.append(txt((lx, npl[1] - 8), "fall on the MIDDLE of the belt", 10, MUTED, "end"))
    o.append(txt((ex - 4, fl.p(0, D["cage_h"] / 2 + FLOOR[0])[1]), '16"', 11, CAGE_L, "end", "600"))
    o.append(txt((ex + D["depth"] * fl.s + 4, fl.p(0, D["cage_h"] / 2 + FLOOR[0])[1]),
                 '16"', 11, CAGE_L, "start", "600"))

    # ---- parts list -----------------------------------------------------
    px, py = 1000, 100
    o.append(panel(px, py, 700, 300, "What each number is"))
    rows = [
        (1, "Upright", '20 mm NEW rod, cut 78". Must be straight and plumb.'),
        (2, "Pan cross-bar", '20 mm rod, cut 813 mm, at 12" / 35" / 58". String line!'),
        (3, "Support pan", "galv sheet 790 mm wide, upturned lips, 1-2° fall to rear."),
        (4, "PP belt", "770 mm wide. Lies ON the pan and slides over it."),
        (5, "Cage box", '16" deep each side, 14" high, 24" cells.'),
        (6, "Wire divider", "the only thing between the two cages - no centre post."),
        (7, "Side deflector", "50 mm strip at ~45°, guides edge droppings onto the belt."),
        (8, "Bottom brace", "12 mm rod, keeps the frame square."),
    ]
    yy = py + 54
    for n, name, desc in rows:
        o.append(callout((px + 26, yy - 4), n, 9.5))
        o.append(txt((px + 46, yy), name, 12, INK, "start", "700"))
        o.append(txt((px + 172, yy), desc, 11.5, MUTED))
        yy += 30

    lg, _ = legend(px + 26, py + 322, [
        (STEEL, "20 mm rod - uprights + pan bars"),
        (STEEL12, "12 mm rod - cage bars, braces, ties"),
        (PAN_F, "galvanised pan (the existing tray, fixed)"),
        (BELT_F, "PP manure belt"),
        (CAGE_F, "cage / mesh"),
        (MANURE, "droppings carried to the rear"),
    ])
    o.append(lg)

    o.append(rect((px, 580), 700, 195, fill="#fff8f2", col="#f0d3bc", sw=1, r=6))
    o.append(txt((px + 20, 610), "The one idea to hold on to", 12.5, MECH, "start", "700"))
    t1, y2 = wrap(px + 20, 636,
                  650,
                  "The BELT catches the droppings. The PAN catches nothing - it is only a hard, "
                  "smooth surface for the belt to lie on and slide over, so the belt cannot sag "
                  "under a day of wet manure. It is the same galvanised tray you already slide out "
                  "and scrape; it simply stops being removable.")
    o.append(t1)
    t2, _ = wrap(px + 20, y2 + 16, 650,
                 "Turn the crank at the rear and the whole belt creeps along, carrying everything "
                 "to a fixed blade that peels it off into a basin. Nobody pulls a tray out again.",
                 col=INK, weight="600")
    o.append(t2)

    write("manure-belt-REVB-1-set.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 2 -- the whole 22 ft row
# ============================================================================
def drawing_row():
    W, H = 1560, 820
    z0, z1 = 0, D["depth"]
    x0, x1 = 0, D["row_len"]
    xi = -D["front_off"]
    xd = x1 + D["rear_off"]
    iso = Iso(2.45, 200, 250)
    o = [header(W, "2 · ONE ROW  —  3½ sets, 22 ft, 3 tiers",
                "Three 6 ft sets plus one 4 ft half-set.  One belt per tier runs the whole 22 ft "
                "and discharges at the rear.")]

    g = [iso.p(xi - 6, 0, z0 - 5), iso.p(xd + 6, 0, z0 - 5),
         iso.p(xd + 6, 0, z1 + 5), iso.p(xi - 6, 0, z1 + 5)]
    o.append(poly(g, fill="#eef1f4", col="#e2e6eb", w=1, op=0.9))

    # frames back to front
    o.append(frame(iso, FRAME_X[0], z0, z1))
    for zz in (z0, z1):
        o.append(longbar(iso, zz, 4, x0, x1))
    o.append(tier_stack(iso, x0, x1, z0, z1, show_manure=True, mesh=False, top_wire=True))
    for fx in FRAME_X[1:]:
        o.append(frame(iso, fx, z0, z1))

    # rollers, crank, scraper, basins at each tier
    for t in range(3):
        bz0 = z0 + (D["depth"] - D["belt_w"]) / 2
        bz1 = z1 - (D["depth"] - D["belt_w"]) / 2
        yb = PAN[t] + 0.9
        # belt continuing out to the two rollers
        o.append(slab_xz(iso, yb, 0.8, xi, x0, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
        o.append(slab_xz(iso, yb, 0.8, x1, xd, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
        o.append(roller(iso, xi, yb - D["roller_d"] / 2, bz0 - 0.5, bz1 + 0.5))
        o.append(roller(iso, xd, yb - D["roller_d"] / 2, bz0 - 0.5, bz1 + 0.5))
        # return run
        o.append(line(iso.p(xi, yb - D["roller_d"], (bz0 + bz1) / 2),
                      iso.p(xd, yb - D["roller_d"], (bz0 + bz1) / 2), BELT_L, 1.6, dash="7 5"))
        # crank on the drive shaft, outboard
        cp = iso.p(xd, yb - D["roller_d"] / 2, bz1 + 3.5)
        o.append(line(iso.p(xd, yb - D["roller_d"] / 2, bz1 + 0.5), cp, MECH, 3.0))
        o.append(circ(cp, 3.0, fill="#f2c9c4", col=MECH, w=1.4))
        o.append(line(cp, (cp[0] + 12, cp[1] + 9), MECH, 3.0))
        o.append(circ((cp[0] + 12, cp[1] + 9), 3.2, fill=MECH, col=MECH, w=1))
        # scraper blade + falling manure + basin
        sp = iso.p(xd + 3.5, yb - 3.0, (bz0 + bz1) / 2)
        o.append(line(iso.p(xd + 1.2, yb - 1.0, bz0), iso.p(xd + 1.2, yb - 1.0, bz1), MECH, 3.2))
        o.append(line(sp, (sp[0], sp[1] + 16), MANURE, 2.0, dash="3 4"))
        bp = iso.p(xd + 4.5, 0, (bz0 + bz1) / 2)
        o.append(f'<ellipse cx="{f(bp[0])}" cy="{f(bp[1]-6)}" rx="17" ry="7.5" '
                 f'fill="#3a3f46" fill-opacity="0.85" stroke="{INK}" stroke-width="1"/>')

    # end labels -- front label sits in the clear space under the front end
    fb = iso.p(xi, PAN[0], (z0 + z1) / 2)
    o.append(txt((70, 396), "FRONT END", 12.5, WATER, "start", "700"))
    o.append(txt((70, 414), "door + water tank", 11, MUTED))
    o.append(txt((70, 430), "nipple header at the cage front", 11, MUTED))
    o.append(txt((70, 446), "idler roller + tensioner", 11, MUTED))
    o.append(line((150, 386), (fb[0] - 2, fb[1] + 14), WATER, 1, dash="4 3"))
    rp = iso.p(xd, D["upright"] + 12, z0)
    o.append(txt((rp[0] + 14, rp[1] - 20), "REAR  —  discharge end", 12.5, MECH, "start", "700"))
    o.append(txt((rp[0] + 14, rp[1] - 4), "drive roller · crank · scraper · basin", 11, MUTED))

    # dimension band along the bottom
    yb = 690
    o.append(line((150, yb), (150 + D["row_len"] * 2.45 * C30 * 0 + 940, yb), "#00000000", 0.1))
    sx = 190
    scale = 2.72
    marks = [0, 72, 144, 216, 264]
    for i, m in enumerate(marks):
        X = sx + m * scale
        o.append(line((X, yb - 8), (X, yb + 8), MUTED, 1))
        o.append(txt((X, yb + 24), f'{m}"', 10.5, MUTED, "middle"))
    o.append(line((sx, yb), (sx + 264 * scale, yb), MUTED, 1.2))
    for i in range(4):
        a = sx + marks[i] * scale
        b = sx + marks[i + 1] * scale
        lab = "6 ft set  (3 × 24\" cells)" if i < 3 else "4 ft half-set  (2 cells)"
        o.append(txt(((a + b) / 2, yb - 16), lab, 10.5, INK if i < 3 else MECH, "middle", "700"))
    o.append(txt((sx, yb - 44), "ROW MAKE-UP  (a straight measuring strip, not the 3-D view above)",
                 11.5, MUTED, "start", "700"))
    o.append(txt((sx + 264 * scale / 2, yb + 46),
                 'total row 22 ft (264") leg-to-leg  ·  11 cells per side  ·  5 frames', 12, INK, "middle", "700"))

    # notes panel
    px = 1010
    o.append(panel(px, 100, 520, 270, "Row facts for the welder"))
    rows = [
        ("Frames", '5 per row, at 0 / 72 / 144 / 216 / 264"'),
        ("Belt run C", 'roller centre to centre = 292" = 7.42 m'),
        ("Belt loop", "2C + wrap + slack = 15.43 m → cut 16 m"),
        ("Front end", 'idler 8" beyond the leg, on slotted brackets'),
        ("Rear end", 'drive roller 20" beyond the leg, rubber-lagged'),
        ("Crank", "one per tier, independent. No chain, no sprockets."),
        ("Ratchet", "pawl on every drive shaft - a loaded belt must not run back"),
        ("Fall", "pan drops 1-2° toward the rear so liquid drains out"),
    ]
    yy = 154
    for a, b in rows:
        o.append(txt((px + 22, yy), a, 11.5, INK, "start", "700"))
        o.append(txt((px + 132, yy), b, 11.5, MUTED))
        yy += 27

    o.append(rect((px, 370), 520, 150, fill="#f2f8f4", col="#cfe4d8", sw=1, r=6))
    o.append(txt((px + 20, 396), "Daily routine", 12.5, "#2f6b4f", "start", "700"))
    t, _ = wrap(px + 20, 418, 480,
                "Put the basin under the top tier, wind the crank until the belt has gone all the "
                "way round and the blade has cleaned it, then move the basin down to the next tier "
                "and repeat. Three cranks per row, twelve for the house. No tray is ever pulled out.")
    o.append(t)

    o.append(rect((px, 540), 520, 170, fill="#fff8f2", col="#f0d3bc", sw=1, r=6))
    o.append(txt((px + 20, 566), "Build ONE of these first", 12.5, MECH, "start", "700"))
    t, _ = wrap(px + 20, 588, 480,
                "Complete a single tier - frame, pan, both rollers, belt, scraper, crank - and run "
                "it for a few days with a cheap tarpaulin offcut as the belt. You are testing four "
                "things: does it track straight, how heavy is the crank, does the blade clean the "
                "belt, does liquid stay in. Fix any tracking problem there, then cut the PP belt.")
    o.append(t)

    write("manure-belt-REVB-2-row.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 3 -- the whole house: 2 halves x 2 rows
# ============================================================================
def drawing_house():
    W, H = 1500, 1260
    o = [header(W, "3 · THE WHOLE HOUSE  —  4 double rows, 12 belts",
                "Two 14 ft halves, two rows in each.  Plan view above, 3-D impression below.")]

    S = 2.15
    fl = Flat(S, 80, 150, flip_y=False)
    total_w = D["half_w"] * 2 + D["wall"]

    # outer walls
    o.append(rect(fl.p(0, 0), D["pen_len"] * S, total_w * S, fill="#fafbfc", col=INK, sw=2))
    # dividing wall
    o.append(rect(fl.p(0, D["half_w"]), D["pen_len"] * S, D["wall"] * S,
                  fill="#dfe3e8", col=INK, sw=1.2))

    row_z = []
    for half in range(2):
        base = half * (D["half_w"] + D["wall"])
        for r in range(2):
            z = base + D["aisle"] * (r + 1) + D["row_foot"] * r
            row_z.append(z)

    for i, z in enumerate(row_z):
        # cage footprint
        o.append(rect(fl.p(14, z), D["row_len"] * S, D["row_foot"] * S,
                      fill=CAGE_F, col=CAGE_L, sw=1.4))
        # the belt inside it
        o.append(rect(fl.p(14, z + (D["row_foot"] - D["belt_w"]) / 2),
                      D["row_len"] * S, D["belt_w"] * S, fill=BELT_F, col=BELT_L, sw=0.9, op=0.55))
        # centre divider line
        o.append(line(fl.p(14, z + D["row_foot"] / 2), fl.p(278, z + D["row_foot"] / 2),
                      CAGE_L, 0.8, dash="6 4"))
        # cell ticks
        for c in range(1, CELLS_SIDE):
            X = fl.p(14 + c * D["cell"], z)[0]
            o.append(line((X, fl.p(0, z)[1]), (X, fl.p(0, z + D["row_foot"])[1]),
                          CAGE_L, 0.4, op=0.5))
        # idler + drive roller
        o.append(line(fl.p(6, z + 1), fl.p(6, z + D["row_foot"] - 1), MECH, 3))
        o.append(line(fl.p(298, z + 1), fl.p(298, z + D["row_foot"] - 1), MECH, 4.5))
        # crank
        o.append(circ(fl.p(298, z + D["row_foot"] + 4), 4, fill="#f2c9c4", col=MECH, w=1.2))
        # basin
        bp = fl.p(302, z + D["row_foot"] / 2)
        o.append(circ(bp, 8, fill="#3a3f46", col=INK, w=1))
        # nipple header at the front
        o.append(line(fl.p(11, z + 1), fl.p(11, z + D["row_foot"] - 1), WATER, 2.4))
        o.append(txt(fl.p(150, z + D["row_foot"] / 2 + 3), f"ROW {i+1}", 11.5,
                     CAGE_L, "middle", "700"))

    # aisles
    for half in range(2):
        base = half * (D["half_w"] + D["wall"])
        for k in range(3):
            z = base + k * (D["aisle"] + D["row_foot"])
            zc = z + D["aisle"] / 2
            o.append(txt(fl.p(70, zc + 3), 'aisle 33"', 10.5, MUTED, "middle", "600"))
            o.append(line(fl.p(40, z + 2), fl.p(40, z + D["aisle"] - 2), FAINT, 0.9))

    # door + water tank at the front wall
    dz = D["half_w"] * 0.12
    o.append(rect(fl.p(-3, dz), 6, 30 * S, fill=WATER, col=WATER, sw=1))
    o.append(txt((fl.p(0, dz)[0] - 10, fl.p(0, dz + 15)[1]), "DOOR", 11.5, WATER, "end", "700"))
    o.append(txt((fl.p(0, dz)[0] - 10, fl.p(0, dz + 15)[1] + 15), "+ water tank", 10.5, MUTED, "end"))

    # front / rear labels and dimensions
    o.append(txt(fl.p(D["pen_len"] / 2, -30), 'PEN LENGTH  27 ft 3 in  (327")', 12.5, INK, "middle", "700"))
    o.append(dim_h(fl.p(0, 0)[0], fl.p(D["pen_len"], 0)[0], fl.p(0, -20)[1], "", MUTED))
    o.append(dim_h(fl.p(14, 0)[0], fl.p(278, 0)[0], fl.p(0, -6)[1], 'cage run 22 ft (264")', CAGE_L, 11))
    o.append(txt(fl.p(7, total_w + 16), 'front 14"', 10.5, WATER, "middle", "600"))
    o.append(txt(fl.p(300, total_w + 16), 'rear 49"  discharge + basins', 10.5, MECH, "middle", "600"))
    o.append(dim_v(fl.p(D["pen_len"] + 10, 0)[0], fl.p(0, 0)[1], fl.p(0, D["half_w"])[1],
                   "half 1  ·  14 ft", MUTED))
    o.append(dim_v(fl.p(D["pen_len"] + 10, 0)[0], fl.p(0, D["half_w"] + D["wall"])[1],
                   fl.p(0, total_w)[1], "half 2  ·  14 ft", MUTED))

    # ---- 3-D impression: ONE HALF of the house (2 rows + the aisle) ------
    iso = Iso(0.95, 330, 1062)
    o.append(txt((80, 950), "3-D impression  —  ONE HALF of the house, as you will see it",
                 13.5, INK, "start", "700"))
    o.append(txt((80, 968), 'two rows with the 33" centre aisle between them.  '
                            "The other half is identical.", 11.5, MUTED))
    pitch = D["row_foot"] + D["aisle"]
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
            o.append(roller(iso, D["row_len"] + D["rear_off"], PAN[t],
                            zoff + 1, zoff + D["depth"] - 1, MECH, 1.0))
        for fx in FRAME_X:
            o.append(upright(iso, fx, zoff, 0, D["upright"], STEEL, 1.8))
            o.append(upright(iso, fx, zoff + D["depth"], 0, D["upright"], STEEL, 1.8))
    # caption to the right of the 3-D block, in the clear space
    o.append(txt((700, 1060), "The gap you can see between the two rows", 11.5, INK, "start", "700"))
    o.append(txt((700, 1078), 'is the 33" (2 ft 9 in) centre aisle you', 11.5, MUTED))
    o.append(txt((700, 1094), "walk down to reach both cage fronts", 11.5, MUTED))
    o.append(txt((700, 1110), "and to turn the cranks at the rear.", 11.5, MUTED))
    o.append(txt((700, 1140), "Every belt discharges at the far (rear)", 11.5, MECH, "start", "700"))
    o.append(txt((700, 1156), "end — 12 spouts, 4 basin positions.", 11.5, MECH, "start", "700"))

    # summary panel
    px = 1000
    o.append(panel(px, 110, 470, 340, "The whole thing in numbers"))
    rows = [
        ("Rows", "4 double (2 per 14 ft half)"),
        ("Tiers", "3"),
        ("Row length", '22 ft — 3 × 6 ft sets + 1 × 4 ft'),
        ("Cells", f'{CELLS_SIDE} per side × 2 × 3 tiers × 4 rows = {CELLS_SIDE*2*3*4}'),
        ("Birds", f'{CAPACITY:,} pullets at 8/cell to 13 weeks'),
        ("Belt modules", "12  (one per tier per row)"),
        ("PP belt to buy", "770 mm × 200 m"),
        ("Rollers", "24  ·  bearings 48 × UCP204"),
        ("Cranks", "12, independent"),
        ("Aisles", '3 per half at 33" (2 ft 9 in)'),
        ("Top tier floor", '63" (5 ft 3 in) — reachable standing'),
    ]
    yy = 158
    for a, b in rows:
        o.append(txt((px + 22, yy), a, 11.5, INK, "start", "700"))
        o.append(txt((px + 150, yy), b, 11.5, MUTED))
        yy += 26

    lg, ly = legend(px + 22, 490, [(CAGE_F, "cage footprint"), (BELT_F, "belt"),
                                   (WATER, "water / door end"), ("#3a3f46", "collection basin")])
    o.append(lg)

    o.append(rect((px, ly + 20), 470, 200, fill="#f2f8f4", col="#cfe4d8", sw=1, r=6))
    o.append(txt((px + 20, ly + 46), "Why the rows sit where they do", 12.5, "#2f6b4f", "start", "700"))
    t, _ = wrap(px + 20, ly + 68, 430,
                "Both cages of a back-to-back double face OUTWARD, so every row needs a walkway on "
                "both of its sides. That is why each 14 ft half gets three aisles and not two: wall "
                'aisle, centre aisle, wall aisle, all about 33" wide. Two rows per half is the most '
                "that fits while still leaving you room to work and to crank.")
    o.append(t)

    write("manure-belt-REVB-3-house.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 4 -- fabrication details
# ============================================================================
def drawing_details():
    W, H = 1500, 1420
    o = [header(W, "4 · FABRICATION DETAILS  —  for the welder",
                "Orthographic details. Every dimension here is a build dimension, not an impression.",
                rev="REV B  |  2026-08-12")]

    # ---- A: width section through a roller -----------------------------
    o.append(panel(40, 90, 690, 330, "A · SECTION THROUGH A ROLLER  —  the critical width chain"))
    S = 12.5
    ax, ay = 130, 300
    fl = Flat(S, ax, ay)
    span = D["depth"]
    # uprights (rod section)
    for zz in (0, span):
        o.append(circ(fl.p(zz, 0), D["rod20"] / 2 * S + 2.5, fill="#cfd5dd", col=STEEL, w=1.6))
    o.append(line(fl.p(-2.5, 0), fl.p(span + 2.5, 0), FAINT, 0.9, dash="6 4"))
    # shaft right through, past both uprights
    o.append(line(fl.p(-4.2, 0), fl.p(span + 4.2, 0), STEEL, 3.2))
    # roller barrel
    rf0, rf1 = (span - D["roller_face"]) / 2, span - (span - D["roller_face"]) / 2
    o.append(rect(fl.p(rf0, D["roller_d"] / 2), D["roller_face"] * S, D["roller_d"] * S,
                  fill="#f2c9c4", col=MECH, sw=1.6, r=3))
    # crown exaggerated
    o.append(path(f'M {f(fl.p(rf0, D["roller_d"]/2)[0])} {f(fl.p(rf0, D["roller_d"]/2)[1])} '
                  f'Q {f(fl.p(span/2, D["roller_d"]/2+0.9)[0])} {f(fl.p(span/2, D["roller_d"]/2+0.9)[1])} '
                  f'{f(fl.p(rf1, D["roller_d"]/2)[0])} {f(fl.p(rf1, D["roller_d"]/2)[1])}',
                  fill="none", col=MECH, w=1.6))
    # belt
    b0, b1 = (span - D["belt_w"]) / 2, span - (span - D["belt_w"]) / 2
    o.append(line(fl.p(b0, D["roller_d"] / 2 + 1.1), fl.p(b1, D["roller_d"] / 2 + 1.1), BELT_L, 4))
    # pillow blocks OUTBOARD
    for zz, sgn in ((0, -1), (span, +1)):
        bx = fl.p(zz + sgn * 3.0, 0)
        o.append(rect((bx[0] - 15, bx[1] - 13), 30, 26, fill="#cfd5dd", col=STEEL, sw=1.4, r=3))
        o.append(circ(bx, 5, fill=PAPER, col=STEEL, w=1.4))
        o.append(txt((bx[0], bx[1] + 40), "UCP204", 10, STEEL, "middle", "700"))
        o.append(txt((bx[0], bx[1] + 53), "OUTBOARD", 9.5, MECH, "middle", "700"))
    o.append(dim_h(fl.p(0, 0)[0], fl.p(span, 0)[0], ay - 78, 'CLEAR SPAN  32" / 813 mm', INK, 11.5))
    o.append(dim_h(fl.p(rf0, 0)[0], fl.p(rf1, 0)[0], ay - 56, "roller face 790 mm", MECH, 11))
    o.append(dim_h(fl.p(b0, 0)[0], fl.p(b1, 0)[0], ay - 34, "belt 770 mm", BELT_L, 11))
    o.append(txt((ax + span / 2 * S, ay + 78), "clearance belt→rod 21.5 mm  ·  roller→rod 11.5 mm",
                 11, MECH, "middle", "700"))
    o.append(txt((ax + span / 2 * S, ay + 96),
                 "the shaft passes OUTSIDE the uprights — this is what lets a 770 mm belt fit",
                 10.5, MUTED, "middle"))

    # ---- B: elevation schedule -----------------------------------------
    o.append(panel(760, 90, 700, 330, "B · ELEVATION SCHEDULE  —  set every pan bar off a STRING LINE"))
    S2 = 3.3
    bx, by = 900, 400
    fl2 = Flat(S2, bx, by)
    o.append(line(fl2.p(-14, 0), fl2.p(46, 0), INK, 2))
    o.append(txt(fl2.p(-14, -6), "floor", 10.5, MUTED))
    for zz in (0, D["depth"]):
        o.append(line(fl2.p(zz, 0), fl2.p(zz, D["upright"]), STEEL, 5))
    items = [(4, "bottom brace  12 mm", STEEL12),
             (PAN[0], 'PAN BAR 1   12"   20 mm', STEEL),
             (FLOOR[0], 'cage floor 1   17"   12 mm', STEEL12),
             (PAN[1], 'PAN BAR 2   35"   20 mm', STEEL),
             (FLOOR[1], 'cage floor 2   40"   12 mm', STEEL12),
             (PAN[2], 'PAN BAR 3   58"   20 mm', STEEL),
             (FLOOR[2], 'cage floor 3   63"   12 mm', STEEL12),
             (D["upright"], 'top tie   78"   12 mm', STEEL12)]
    for h, lab, col in items:
        o.append(line(fl2.p(0, h), fl2.p(D["depth"], h), col, 3.4 if col == STEEL else 2.2))
        o.append(line(fl2.p(D["depth"], h), fl2.p(D["depth"] + 4, h), FAINT, 0.8, dash="3 3"))
        o.append(txt(fl2.p(D["depth"] + 5, h + 1.2), lab, 10.5,
                     INK if col == STEEL else MUTED, "start",
                     "700" if col == STEEL else "400"))
    for t in range(3):
        o.append(rect(fl2.p(1, TOP[t]), (D["depth"] - 2) * S2, D["cage_h"] * S2,
                      fill=CAGE_F, col=CAGE_L, sw=1, op=0.5))
        o.append(txt(fl2.p(D["depth"] / 2, FLOOR[t] + D["cage_h"] / 2 - 1),
                     f'tier {t+1}  14"', 10, CAGE_L, "middle", "600"))
        o.append(line(fl2.p(1, PAN[t] + 1.2), fl2.p(D["depth"] - 1, PAN[t] + 1.2), BELT_L, 2.4))
    # gap dimension, label to the LEFT so it clears the cage boxes
    gx = fl2.p(-6, 0)[0]
    ga, gb = fl2.p(0, TOP[0])[1], fl2.p(0, FLOOR[1])[1]
    o.append(line((gx, ga), (gx, gb), MECH, 0.9))
    o.append(line((gx - 4, ga), (gx + 4, ga), MECH, 0.9))
    o.append(line((gx - 4, gb), (gx + 4, gb), MECH, 0.9))
    o.append(txt((gx - 7, (ga + gb) / 2 + 4), 'gap 9"', 11, MECH, "end", "700"))
    o.append(dim_v(fl2.p(-26, 0)[0], fl2.p(0, 0)[1], fl2.p(0, D["upright"])[1], "", INK))
    o.append(txt((fl2.p(-26, 0)[0] - 7, fl2.p(0, D["upright"] / 2)[1]), 'upright',
                 11, INK, "end", "700"))
    o.append(txt((fl2.p(-26, 0)[0] - 7, fl2.p(0, D["upright"] / 2)[1] + 14), 'cut 78"',
                 11, INK, "end", "700"))
    o.append(txt((bx - 110, by + 38), 'top tier floor 63" (5\'3") · top of stack 77" · 31" to ceiling',
                 11, MECH, "start", "700"))

    # ---- C: tensioner ---------------------------------------------------
    o.append(panel(40, 445, 460, 275, "C · IDLER + TENSIONER  (front / door end)"))
    cx, cy = 90, 640
    o.append(rect((cx, cy - 60), 300, 14, fill="#eceff3", col=STEEL, sw=1.3, r=3))
    o.append(txt((cx, cy - 70), "slotted bracket welded to the upright", 10.5, MUTED))
    o.append(rect((cx + 60, cy - 74), 44, 42, fill="#cfd5dd", col=STEEL, sw=1.5, r=4))
    o.append(circ((cx + 82, cy - 53), 8, fill=PAPER, col=STEEL, w=1.5))
    o.append(txt((cx + 82, cy - 84), "bearing block slides", 10, STEEL, "middle", "700"))
    o.append(line((cx + 104, cy - 53), (cx + 176, cy - 53), MECH, 4))
    o.append(txt((cx + 186, cy - 49), "M10 push-bolt + lock nut", 10.5, MECH, "start", "700"))
    o.append(txt((cx + 186, cy - 33), "turned from the AISLE side, not", 10.5, MUTED))
    o.append(txt((cx + 186, cy - 19), 'the end wall — only 6" to it', 10.5, MUTED))
    o.append(circ((cx + 30, cy + 6), 26, fill="#f2c9c4", col=MECH, w=1.6))
    o.append(txt((cx + 30, cy + 42), "idler Ø63", 10.5, MECH, "middle", "700"))
    t, _ = wrap(cx, cy + 58, 400,
                "Tension only enough that the lagged drive roller stops slipping. Over-tension "
                "wears the belt and worsens tracking. If the belt drifts, nudge ONE side.")
    o.append(t)

    # ---- D: drive + scraper --------------------------------------------
    o.append(panel(520, 445, 470, 275, "D · DRIVE ROLLER, SCRAPER + BASIN  (rear)"))
    dx, dy = 640, 590
    o.append(circ((dx, dy), 34, fill="#f2c9c4", col=MECH, w=2))
    o.append(circ((dx, dy), 27, fill="none", col=MECH, w=1, ))
    o.append(txt((dx, dy + 4), "Ø63", 10.5, MECH, "middle", "700"))
    o.append(txt((dx + 42, dy + 34), "rubber-lagged for grip", 10.5, MECH, "start", "700"))
    o.append(line((dx + 24, dy + 26), (dx + 38, dy + 32), MECH, 1, dash="3 2"))
    o.append(line((dx - 120, dy - 34), (dx - 2, dy - 34), BELT_L, 4))
    o.append(txt((dx - 120, dy - 44), "belt in, loaded", 10.5, BELT_L, "start", "600"))
    o.append(line((dx - 120, dy + 34), (dx - 2, dy + 34), BELT_L, 2.4, dash="6 4"))
    o.append(txt((dx - 120, dy + 50), "return run, clean", 10.5, MUTED, "start"))
    o.append(path(f"M {dx+30} {dy-14} L {dx+74} {dy-30}", col=MECH, w=4))
    o.append(txt((dx + 80, dy - 32), "scraper blade", 10.5, MECH, "start", "700"))
    o.append(txt((dx + 80, dy - 18), "spring / gravity loaded", 10, MUTED, "start"))
    o.append(txt((dx + 80, dy - 5), "so it rides over the weld", 10, MUTED, "start"))
    o.append(path(f"M {dx+34} {dy+6} L {dx+50} {dy+40}", col=MANURE, w=2.4, ))
    o.append(f'<ellipse cx="{dx+56}" cy="{dy+72}" rx="40" ry="15" fill="#3a3f46" '
             f'stroke="{INK}" stroke-width="1.2"/>')
    o.append(txt((dx + 56, dy + 100), 'basin — bottom tier spout is 12" up', 10.5, INK, "middle", "600"))
    o.append(circ((dx, dy - 56), 9, fill="#cfd5dd", col=STEEL, w=1.4))
    o.append(txt((dx + 14, dy - 58), "ratchet pawl — a loaded", 10, INK, "start", "700"))
    o.append(txt((dx + 14, dy - 46), "belt must not run backwards", 10, MUTED, "start"))

    # ---- E: belt joint --------------------------------------------------
    o.append(panel(1010, 445, 450, 275, "E · JOINING THE LOOP  —  on site, not at the factory"))
    ex, ey = 1050, 536
    # a lapped, welded joint -- upper sheet's free edge faces the direction of travel
    o.append(line((ex, ey + 4), (ex + 210, ey + 4), BELT_L, 7))
    o.append(line((ex + 170, ey - 3), (ex + 380, ey - 3), BELT_L, 7))
    o.append(poly([(ex + 170, ey - 7), (ex + 210, ey - 7), (ex + 210, ey + 8), (ex + 170, ey + 8)],
                  fill="#f6d8d4", col=MECH, w=1.4))
    o.append(dim_h(ex + 170, ex + 210, ey + 30, "40 mm lap", MECH, 10))
    o.append(txt((ex + 190, ey - 18), "one continuous weld", 10.5, MECH, "middle", "700"))
    o.append(line((ex + 300, ey - 26), (ex + 250, ey - 26), MECH, 2.2))
    o.append(poly([(ex + 250, ey - 26), (ex + 258, ey - 30), (ex + 258, ey - 22)],
                  fill=MECH, col=MECH, w=1))
    o.append(txt((ex + 306, ey - 23), "travel", 10.5, MECH, "start", "600"))
    o.append(txt((ex, ey + 52), "NO lacing.  NO glue — nothing bonds PP.", 11, MECH, "start", "700"))
    t, _ = wrap(ex, ey + 74, 390,
                "The supplier's \"supersonic\" welding is ultrasonic — heat fusion done by vibration. "
                "It needs the exact loop length BEFORE the frames exist, so do the same thing by hand "
                "instead: 40 mm lap, hot-air gun and seam roller, ONE continuous seam across the full "
                "770 mm (spot welds leak and start peeling). Set the lap so the scraper rides UP onto "
                "it. Tension is low because the PAN carries the manure, so a welded lap is far stronger "
                "than needed. PRACTISE ON OFFCUTS: pull it, wrap it round a 63 mm pipe 20 times, pool "
                "water on it.")
    o.append(t)

    # ---- F: water line routing -----------------------------------------
    o.append(panel(40, 745, 1420, 320,
                   "F · WATER LINE ROUTING  —  the dropping gap is a KEEP-OUT zone"))
    S3 = 3.0
    fx, fy = 300, 1040
    fl3 = Flat(S3, fx, fy)
    o.append(line(fl3.p(-14, 0), fl3.p(40, 0), INK, 1.6))
    for zz in (0, D["depth"]):
        o.append(line(fl3.p(zz, 0), fl3.p(zz, D["upright"]), STEEL, 4.5))
    for t in range(3):
        # the band that must stay clear: belt + manure headroom
        ka, kb = PAN[t] - 1.5, FLOOR[t]
        o.append(rect(fl3.p(0, kb), D["depth"] * S3, (kb - ka) * S3,
                      fill="#f7d9d5", col=MECH, sw=1, op=0.85))
        o.append(txt(fl3.p(D["depth"] / 2, (ka + kb) / 2 - 0.7), "KEEP OUT", 8.5,
                     MECH, "middle", "700"))
        # pan + belt inside that band
        o.append(line(fl3.p(0.9, PAN[t]), fl3.p(D["depth"] - 0.9, PAN[t]), PAN_L, 2.2))
        o.append(line(fl3.p(1.4, PAN[t] + 0.8), fl3.p(D["depth"] - 1.4, PAN[t] + 0.8), BELT_L, 2.6))
        # cage
        o.append(rect(fl3.p(0, TOP[t]), D["depth"] * S3, D["cage_h"] * S3,
                      fill=CAGE_F, col=CAGE_L, sw=1, op=0.55))
        zm = D["depth"] / 2
        o.append(line(fl3.p(zm, FLOOR[t]), fl3.p(zm, TOP[t]), CAGE_L, 1.2, dash="3 3"))
        # nipple line on the divider + branch from the riser
        o.append(circ(fl3.p(zm, NIPPLE[t]), 3.4, fill="#dff1fa", col=WATER, w=1.5))
        o.append(line(fl3.p(-6, NIPPLE[t]), fl3.p(zm, NIPPLE[t]), WATER, 2.2))
        o.append(line(fl3.p(zm, NIPPLE[t] - 1.4), fl3.p(zm, PAN[t] + 1.2), WATER, 0.9, dash="2 3"))
        o.append(txt(fl3.p(D["depth"] + 1.6, NIPPLE[t] + 0.6), f'{NIPPLE[t]}"', 10,
                     WATER, "start", "700"))
    # the riser, out in the aisle
    o.append(line(fl3.p(-6, -1), fl3.p(-6, D["upright"] + 3), WATER, 4.5))
    o.append(txt(fl3.p(-6, D["upright"] + 6), "riser", 10.5, WATER, "middle", "700"))
    o.append(dim_h(fl3.p(-6, 0)[0], fl3.p(0, 0)[0], fy + 26, "100 mm", WATER, 10))
    o.append(txt((fx + D["depth"] / 2 * S3, fy + 48),
                 "riser stands in the AISLE, clear of the frame — never inside it",
                 10.5, WATER, "middle", "600"))

    tx = 520
    o.append(txt((tx, 790), "THE RULE", 12, MECH, "start", "700"))
    t, y2 = wrap(tx, 810, 420,
                 "Nothing may enter the dropping gap except the belt, the pan and the cross-bar that "
                 "carries it. No pipe, no fitting, no valve, no hose loop, no clip, no hanger. "
                 "Anything in there is dragged by the belt on every single turn of the crank.")
    o.append(t)
    o.append(txt((tx, y2 + 22), "WHERE THE WATER GOES INSTEAD", 12, WATER, "start", "700"))
    t, y3 = wrap(tx, y2 + 42, 420,
                 "The nipple line runs the length of the row INSIDE each cage, fixed under the cage "
                 "roof on the divider centreline. It is in the cage volume, so it is above its own "
                 "belt and below the next one. Drips fall on the MIDDLE of the belt — 385 mm from "
                 "either edge, the safest place they could land.")
    o.append(t)
    o.append(txt((tx, y3 + 22), "MOUNT IT UNDER THE CAGE ROOF, NOT ON TOP OF IT", 11.5,
                 MECH, "start", "700"))
    t, _ = wrap(tx, y3 + 40, 420,
                "A line laid on top of the cage roof sits straight in the gap above. That is the "
                "one mistake to watch for.")
    o.append(t)

    ux = 990
    o.append(txt((ux, 790), "BRANCH HEIGHTS  (centre of pipe, above the floor)", 12,
                 INK, "start", "700"))
    yy = 812
    for t in range(3):
        o.append(txt((ux, yy), f"Tier {t+1}", 11.5, INK, "start", "700"))
        o.append(txt((ux + 70, yy), f'{NIPPLE[t]}"', 11.5, WATER, "start", "700"))
        o.append(txt((ux + 120, yy),
                     f'inside the cage ({FLOOR[t]}"–{TOP[t]}")', 11.5, MUTED))
        yy += 22
    o.append(txt((ux, yy + 14), "WHAT HAS TO CHANGE FROM THE PRESENT SETUP", 12,
                 MECH, "start", "700"))
    for i, s in enumerate([
        "The riser is presently at the END of the row on the centreline.",
        "That is exactly where the idler roller, its outboard bearings",
        "and the tensioner now sit.  Move it into the aisle, ~100 mm off",
        'the cage face, just BEHIND the front frame (x ≈ 6–12") so it also',
        "clears the idler's slotted bracket.",
        "",
        "Tie every flexible hose back to the frame.  No free loops hanging",
        "below cage-floor level.",
        "",
        "Put the line's flush outlet at the REAR, piped over the end of the",
        "belt into the basin.  Never flush into the middle of the run.",
    ]):
        o.append(txt((ux, yy + 34 + i * 15), s, 11, MUTED if i > 4 else INK))

    # ---- G: do / do not -------------------------------------------------
    o.append(rect((40, 1095), 1420, 285, fill="#fbfcfd", col=FAINT, sw=1, r=6))
    o.append(txt((62, 1125), "THE FIVE THINGS THAT DECIDE WHETHER THIS WORKS",
                 13.5, INK, "start", "700"))
    items = [
        ("End rollers parallel and square",
         'Within ~2 mm across the width, at BOTH ends of every tier. Check by measuring diagonals, '
         'not by eye. This is the number one cause of a belt that will not track.'),
        ("Crown the rollers",
         "1-2 mm larger diameter at the centre than at the ends. This is what makes the belt "
         "self-centre. A perfectly straight roller will not."),
        ("Pan bars off a string line",
         "All three pan cross-bars on all five frames must line up. Inconsistent heights make the "
         "pan wavy and the belt will pick a side and stay there."),
        ("1-2° fall toward the rear",
         "The pan must drop toward the discharge end so free liquid drains into the basin instead "
         "of sitting in the middle and souring."),
        ("Paint or galvanise everything, sealed bearings",
         "The rust on the existing stands is what seizes rollers. Sealed pillow blocks, painted "
         "frame. A seized roller means dragging the belt, which destroys it."),
    ]
    yy = 1156
    for i, (a, b) in enumerate(items):
        o.append(circ((74, yy - 4), 11, fill=MECH, col=MECH, w=1))
        o.append(txt((74, yy + 0), str(i + 1), 11.5, PAPER, "middle", "700"))
        o.append(txt((96, yy), a, 12, INK, "start", "700"))
        t, _ = wrap(96, yy + 17, 1330, b, 11)
        o.append(t)
        yy += 44

    write("manure-belt-REVB-4-details.svg", W, H, "".join(o))


# ============================================================================
# DRAWING 5 -- FRONT END: the water supply and the idler, kept apart
# ============================================================================
RISER_X = 8.0                     # riser centreline, 8" BEHIND the front leg
RISER_Z = D["depth"] + 4.0        # 100 mm clear of the cage face, in the aisle
IDLER_X = -D["front_off"]         # -8"
WALL_X = -14.0                    # front wall (front end space = 14")
SHAFT_OUT = 5.1                   # 130 mm of shaft outboard of the roller face
BLOCK_Z = D["depth"] + 1.5        # pillow block body, on the upright's outer face
DIV_Z = D["depth"] / 2            # divider centreline -- where the nipple line runs


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


def drawing_frontend():
    W, H = 1740, 1440
    o = [header(W, "5 · FRONT END  —  the water supply and the idler, kept apart",
                "Where the riser, its valves and its branches go, now that the row end belongs "
                "to the idler roller, its outboard bearings and the tensioner.",
                rev="REV B  |  2026-08-10")]
    z0, z1 = 0, D["depth"]
    pz0, pz1 = (D["depth"] - D["pan_w"]) / 2, D["depth"] - (D["depth"] - D["pan_w"]) / 2
    bz0, bz1 = (D["depth"] - D["belt_w"]) / 2, D["depth"] - (D["depth"] - D["belt_w"]) / 2
    xr = 60                      # how far down the row the flat views run
    T = 1                        # the tier drawn in detail
    yp, yf, yt, yn = PAN[T], FLOOR[T], TOP[T], NIPPLE[T]
    ygap0 = TOP[T - 1]           # 31" -- floor of this tier's dropping gap

    # ---- A: one tier at the front end, isometric -------------------------
    o.append(panel(40, 80, 900, 700,
                   "A · ONE TIER AT THE FRONT END, IN 3-D   (tier 2 shown — tiers 1 and 3 repeat it)"))
    xa, xb = -12, 34
    iso = Iso(7.6, 409, 631)
    kx0, ky0 = xa + 2, ygap0 + 1.5
    o.append(keepout_box(iso, kx0, xb, ky0, yf, z0, z1, "fill"))
    o.append(line(iso.p(0, ygap0 - 1, z0), iso.p(0, yt + 3, z0), STEEL, 6.0))   # far leg
    o.append(crossbar(iso, 0, yp, z0, z1, STEEL, 4.4))
    o.append(slab_xz(iso, yp, 1.0, xa + 4, xb, pz0, pz1, PAN_F, PAN_L, 1.0, 0.95))
    o.append(slab_xz(iso, yp + 1.0, 0.9, xa + 4, xb, bz0, bz1, BELT_F, BELT_L, 1.0, 0.95))
    o.append(roller(iso, IDLER_X, yp - 0.8, bz0 - 0.6, bz1 + 0.6))
    for zz, sg in ((z0, -1), (z1, +1)):
        o.append(line(iso.p(IDLER_X, yp - 0.8, zz),
                      iso.p(IDLER_X, yp - 0.8, zz + sg * SHAFT_OUT), STEEL, 3.4))
    o.append(line(iso.p(0, yp - 0.8, z1 + 0.7), iso.p(IDLER_X, yp - 0.8, z1 + 0.7), STEEL, 4.2))
    pbp = iso.p(IDLER_X, yp - 0.8, BLOCK_Z)
    o.append(rect((pbp[0] - 9, pbp[1] - 8), 18, 16, fill="#dfe4ea", col=STEEL, sw=1.4, r=2))
    o.append(keepout_box(iso, kx0, xb, ky0, yf, z0, z1, "edge"))
    o.append(line(iso.p(0, ygap0 - 1, z1), iso.p(0, yt + 3, z1), STEEL, 6.0))   # near leg
    o.append(cage_box(iso, 0, xb, yf, yt, z0, z1, mesh=True, op=0.20))
    zm = DIV_Z
    o.append(quad_xz(iso, yf, 0, xb, z0, z1, "#eef3ee", CAGE_L, 0.8, 0.5))      # cage floor
    o.append(line(iso.p(0, yf, zm), iso.p(0, yt, zm), CAGE_L, 1.1, op=0.6))
    o.append(line(iso.p(0, yt, zm), iso.p(xb, yt, zm), CAGE_L, 1.1, op=0.6))
    o.append(line(iso.p(xb, yf, zm), iso.p(xb, yt, zm), CAGE_L, 1.1, op=0.6))
    # the water
    o.append(line(iso.p(0, yn, zm), iso.p(xb, yn, zm), WATER, 3.4))
    o.append(line(iso.p(RISER_X, yn, zm), iso.p(RISER_X, yn, RISER_Z), WATER, 3.6))
    hz = (zm + z1) / 2
    o.append(line(iso.p(RISER_X, yn + 0.5, hz), iso.p(RISER_X, yt, hz), MUTED, 1.6))
    o.append(line(iso.p(RISER_X, ygap0 - 2, RISER_Z), iso.p(RISER_X, yt + 4, RISER_Z), WATER, 5.6))
    vp = iso.p(RISER_X, yn, RISER_Z)
    o.append(poly([(vp[0] - 6, vp[1]), (vp[0], vp[1] - 5), (vp[0] + 6, vp[1]),
                   (vp[0], vp[1] + 5)], fill="#f6d8d4", col=MECH, w=1.5))
    o.append(line(vp, (vp[0] - 14, vp[1] - 12), MECH, 2.6))
    gm = iso.p(RISER_X, yn, z1)
    o.append(circ(gm, 4.2, fill=PAPER, col=MECH, w=1.8))
    o.append(txt(iso.p(xb - 5, ygap0 + 4.2, z1), "KEEP OUT", 11.5, MECH, "middle", "700"))
    # labels down the right-hand side
    lx = 660
    o.append(lead(iso.p(RISER_X, yt + 3.4, RISER_Z), (lx, 176),
                  "RISER — stands in the aisle,", WATER))
    o.append(txt((lx + 6, 192), "100 mm off the cage face,", 11, MUTED))
    o.append(txt((lx + 6, 207), '8" behind the front leg', 11, MUTED))
    o.append(lead(vp, (lx, 244), 'BALL VALVE at 51"', WATER))
    o.append(txt((lx + 6, 260), "(28 / 74\" on the other tiers)", 11, MUTED))
    o.append(lead(iso.p(RISER_X, yn, (zm + RISER_Z) / 2), (lx, 296),
                  "BRANCH — rigid pipe,", WATER))
    o.append(txt((lx + 6, 312), "in through a grommet in the", 11, MUTED))
    o.append(txt((lx + 6, 327), "mesh, then under the cage", 11, MUTED))
    o.append(txt((lx + 6, 342), "roof on a hanger. Never a", 11, MUTED))
    o.append(txt((lx + 6, 357), "flexible loop.", 11, MUTED))
    o.append(lead(iso.p(xb - 5, yn, zm), (lx, 378), "NIPPLE LINE — down the", WATER))
    o.append(txt((lx + 6, 394), "divider, all 22 ft", 11, MUTED))
    o.append(lead(pbp, (lx, 440), "PILLOW BLOCK — outboard,", STEEL))
    o.append(txt((lx + 6, 456), 'on the leg\'s outer face, at 35"', 11, MUTED))
    o.append(lead(iso.p(IDLER_X, yp - 0.8, z1 + SHAFT_OUT), (lx, 492),
                  "SHAFT END — 130 mm into", STEEL))
    o.append(txt((lx + 6, 508), "the aisle, further out than", 11, MUTED))
    o.append(txt((lx + 6, 523), "the riser. CAP IT.", 11, MECH, "start", "700"))
    o.append(lead(iso.p(IDLER_X, yp - 0.8, (bz0 + bz1) / 2), (lx, 560),
                  "IDLER ROLLER, 8\" out", MECH))
    o.append(txt((lx + 6, 576), "on slotted brackets", 11, MUTED))
    o.append(lead(iso.p(xb - 3, ygap0 + 4, z1), (lx, 612),
                  "THE DROPPING GAP", MECH))
    o.append(txt((lx + 6, 628), 'the belt\'s own 9" band —', 11, MUTED))
    o.append(txt((lx + 6, 643), "belt, pan and cross-bar only", 11, MUTED))
    t, _ = wrap(lx, 686, 262,
                "The riser passes this gap OUTSIDE the frame. The branch passes it ABOVE, "
                "inside the cage. Neither one is ever in it.", 11, 15, INK, "600")
    o.append(t)

    # ---- B: side elevation ----------------------------------------------
    o.append(panel(960, 80, 740, 700,
                   "B · SIDE ELEVATION  —  from the aisle the riser stands in"))
    fl = Flat(6.4, 1115, 700)
    for tt in range(3):
        ka, kb = PAN[tt] - 2.9, FLOOR[tt]
        o.append(rect(fl.p(WALL_X, kb), (xr - WALL_X) * fl.s, (kb - ka) * fl.s,
                      fill="#f7d9d5", col="#eec4bd", sw=0.8, op=0.75))
        o.append(txt(fl.p(xr - 8, (ka + kb) / 2 - 0.7), "KEEP OUT", 8.5, MECH, "middle", "700"))
    o.append(line(fl.p(WALL_X - 3, 0), fl.p(xr, 0), FAINT, 1.6))
    o.append(line(fl.p(WALL_X, 0), fl.p(WALL_X, 78), MUTED, 3.0))
    for i in range(15):
        a = fl.p(WALL_X, 3 + i * 5)
        o.append(line((a[0] - 7, a[1] + 5), a, FAINT, 1.0))
    wl = fl.p(WALL_X - 2.2, 42)
    o.append(txt(wl, "FRONT WALL", 11, MUTED, "middle", "600")
             .replace("<text ", f'<text transform="rotate(-90 {f(wl[0])} {f(wl[1])})" '))
    o.append(line(fl.p(0, 0), fl.p(0, 78), STEEL, 5.5))
    o.append(txt(fl.p(0, 80.5), "front leg", 10.5, STEEL, "middle", "700"))
    for tt in range(3):
        o.append(rect(fl.p(0, TOP[tt]), xr * fl.s, D["cage_h"] * fl.s,
                      fill=CAGE_F, col=CAGE_L, sw=1.1, op=0.45))
        o.append(line(fl.p(IDLER_X, PAN[tt]), fl.p(xr, PAN[tt]), PAN_L, 2.6))
        o.append(line(fl.p(IDLER_X, PAN[tt] + 0.9), fl.p(xr, PAN[tt] + 0.9), BELT_L, 3.0))
        o.append(line(fl.p(IDLER_X, PAN[tt] - 2.5), fl.p(xr, PAN[tt] - 2.5), BELT_L, 2.2))
        rc = fl.p(IDLER_X, PAN[tt] - 0.8)
        rr = D["roller_d"] / 2 * fl.s
        o.append(path(f'M {f(rc[0])} {f(rc[1] - rr)} A {f(rr)} {f(rr)} 0 0 0 '
                      f'{f(rc[0])} {f(rc[1] + rr)}', col=BELT_L, w=3.0))
        o.append(circ(rc, rr, fill="#f2c9c4", col=MECH, w=1.6))
        o.append(rect((rc[0] - 8, rc[1] - 7.5), 16, 15, fill="none", col=STEEL, sw=1.1, r=2))
        o.append(line(fl.p(0, PAN[tt] - 0.8), fl.p(IDLER_X, PAN[tt] - 0.8), STEEL, 2.0, dash="4 3"))
        bp = fl.p(WALL_X + 1.8, PAN[tt] - 0.8)
        o.append(line(bp, (rc[0] - 9, rc[1]), MECH, 2.0))
        o.append(rect((bp[0] - 4, bp[1] - 4), 8, 8, fill="#f6d8d4", col=MECH, sw=1.2, r=1))
        o.append(line(fl.p(0, NIPPLE[tt]), fl.p(xr, NIPPLE[tt]), WATER, 2.8))
        o.append(circ(fl.p(RISER_X, NIPPLE[tt]), 3.0, fill=PAPER, col=WATER, w=1.6))
        o.append(txt(fl.p(xr + 1, NIPPLE[tt] + 1.2), f'{NIPPLE[tt]}"', 11, WATER, "start", "700"))
        o.append(txt(fl.p(xr + 1, PAN[tt] - 0.4), f'{PAN[tt]}"', 11, MECH, "start", "700"))
    o.append(line(fl.p(RISER_X, 0), fl.p(RISER_X, 77), WATER, 4.6))
    o.append(line(fl.p(RISER_X, 1.5), fl.p(WALL_X + 1, 1.5), WATER, 2.8))
    o.append(txt(fl.p(WALL_X + 1.4, 4.4), "from the floor main", 10, WATER, "start", "600"))
    for tt in range(3):
        o.append(valve_flat(fl, RISER_X, NIPPLE[tt]))
    o.append(circ(fl.p(RISER_X, 5.5), 3.2, fill=PAPER, col=MECH, w=1.5))
    o.append(txt(fl.p(RISER_X + 1.6, 5.2), "drain cock", 10, MECH, "start", "600"))
    o.append(txt(fl.p(RISER_X, 80.5), "riser", 11, WATER, "middle", "700"))
    o.append(lead(fl.p(IDLER_X, PAN[2] - 0.8), (fl.p(xr + 1, PAN[2] + 9)),
                  "idler + outboard bearing", MECH, 10.5))
    o.append(txt((fl.p(xr + 1, PAN[2] + 9)[0] + 6, fl.p(xr + 1, PAN[2] + 9)[1] + 19),
                 "+ push-bolt, all inside", 10.5, MUTED))
    o.append(txt((fl.p(xr + 1, PAN[2] + 9)[0] + 6, fl.p(xr + 1, PAN[2] + 9)[1] + 33),
                 'these 14 inches', 10.5, MUTED))
    yd = fl.p(0, 0)[1] + 30
    o.append(dim_h(fl.p(WALL_X, 0)[0], fl.p(IDLER_X, 0)[0], yd, '6"', MECH))
    o.append(dim_h(fl.p(IDLER_X, 0)[0], fl.p(0, 0)[0], yd, '8"', MECH))
    o.append(dim_h(fl.p(0, 0)[0], fl.p(RISER_X, 0)[0], yd, '8"', WATER))
    o.append(dim_h(fl.p(WALL_X, 0)[0], fl.p(0, 0)[0], yd + 40,
                   'MECHANICAL ZONE — NO WATER', MECH, 11))
    o.append(txt((fl.p(RISER_X, 0)[0] + 18, yd + 40), "water starts here and works back →",
                 11, WATER, "start", "600"))
    # tie-back clips: short standoffs onto the longitudinal rails, not long cantilevers
    for tt in range(3):
        o.append(line(fl.p(RISER_X, PAN[tt]), fl.p(1.2, PAN[tt]), MUTED, 1.6))
    o.append(lead(fl.p(RISER_X - 4, PAN[0]), (fl.p(xr + 1, PAN[0] - 4)),
                  "clip to the longitudinal rail", MUTED, 10.5, "600"))
    o.append(txt((fl.p(xr + 1, PAN[0] - 4)[0] + 6, fl.p(xr + 1, PAN[0] - 4)[1] + 19),
                 'at 12 / 35 / 58" — 100 mm', 10.5, MUTED))
    o.append(txt((fl.p(xr + 1, PAN[0] - 4)[0] + 6, fl.p(xr + 1, PAN[0] - 4)[1] + 33),
                 "standoffs, not long arms", 10.5, MUTED))

    # ---- C: plan at one tier -------------------------------------------
    o.append(panel(40, 800, 900, 610,
                   "C · PLAN AT ONE TIER  —  how the branch gets in without crossing the gap"))
    pl = Flat(7.0, 216, 1250)
    o.append(rect(pl.p(IDLER_X, pz1), (xr - IDLER_X) * pl.s, D["pan_w"] * pl.s,
                  fill=PAN_F, col=PAN_L, sw=1.2, op=0.9))
    o.append(rect(pl.p(IDLER_X, bz1), (xr - IDLER_X) * pl.s, D["belt_w"] * pl.s,
                  fill=BELT_F, col=BELT_L, sw=1.2, op=0.9))
    for zz in (z0, z1):
        o.append(line(pl.p(0, zz), pl.p(xr, zz), CAGE_L, 2.2))
    o.append(line(pl.p(0, DIV_Z), pl.p(xr, DIV_Z), CAGE_L, 1.4, dash="6 4"))
    o.append(txt(pl.p(xr - 1, DIV_Z + 1.3), "wire divider", 10.5, CAGE_L, "end", "600"))
    o.append(txt(pl.p(xr - 1, z1 - 3.2), "cage face / mesh", 10.5, CAGE_L, "end", "600"))
    o.append(line(pl.p(IDLER_X, pz0), pl.p(IDLER_X, pz1), MECH, 8.0))
    for zz, sg in ((z0, -1), (z1, +1)):
        o.append(line(pl.p(IDLER_X, zz), pl.p(IDLER_X, zz + sg * SHAFT_OUT), STEEL, 3.2))
        bq = pl.p(IDLER_X, zz + sg * 1.6)
        o.append(rect((bq[0] - 9, bq[1] - 7.5), 18, 15, fill="#dfe4ea", col=STEEL, sw=1.3, r=2))
        o.append(line(pl.p(0, zz + sg * 0.7), pl.p(IDLER_X, zz + sg * 0.7), STEEL, 2.6))
    for zz in (z0, z1):
        o.append(circ(pl.p(0, zz), 4.6, fill="#dfe4ea", col=STEEL, w=2.2))
    o.append(txt(pl.p(IDLER_X - 1.5, z1 + SHAFT_OUT), "shaft end", 10.5, STEEL, "end", "600"))
    o.append(txt(pl.p(IDLER_X - 1.5, z1 + SHAFT_OUT - 2.2), "130 mm out", 10.5, STEEL, "end", "600"))
    o.append(txt(pl.p(IDLER_X + 1.6, (pz0 + pz1) / 2), "idler", 10.5, MECH, "start", "700"))
    # the water
    o.append(line(pl.p(RISER_X, RISER_Z), pl.p(RISER_X, DIV_Z), WATER, 3.6))
    o.append(line(pl.p(RISER_X, DIV_Z), pl.p(xr, DIV_Z), WATER, 3.6))
    o.append(line(pl.p(RISER_X, DIV_Z), pl.p(0, DIV_Z), WATER, 2.4))
    o.append(circ(pl.p(RISER_X, RISER_Z), 5.4, fill="#dff1fa", col=WATER, w=2.6))
    o.append(txt(pl.p(RISER_X + 1.8, RISER_Z + 0.6), "riser", 11, WATER, "start", "700"))
    o.append(circ(pl.p(RISER_X, z1), 3.6, fill=PAPER, col=MECH, w=1.7))
    o.append(txt(pl.p(RISER_X + 2.2, z1 - 1.9), "grommet through the mesh", 10.5,
                 MECH, "start", "600"))
    o.append(circ(pl.p(RISER_X, (DIV_Z + z1) / 2), 2.8, fill=MUTED, col=MUTED, w=1))
    o.append(txt(pl.p(RISER_X + 1.6, (DIV_Z + z1) / 2 - 0.4), "hanger off the cage roof", 10.5,
                 MUTED, "start", "600"))
    o.append(txt(pl.p(xr - 1, DIV_Z - 2.4), "nipple line, 22 ft", 10.5, WATER, "end", "700"))
    # dimension the standoff out where there is room
    o.append(line(pl.p(RISER_X, RISER_Z), pl.p(24, RISER_Z), WATER, 0.9, dash="3 3"))
    o.append(dim_v(pl.p(21, 0)[0], pl.p(0, z1)[1], pl.p(0, RISER_Z)[1], "100 mm", WATER))
    o.append(dim_h(pl.p(IDLER_X, 0)[0], pl.p(0, 0)[0], pl.p(0, z0 - 5)[1], '8"', MECH))
    o.append(dim_h(pl.p(0, 0)[0], pl.p(RISER_X, 0)[0], pl.p(0, z0 - 5)[1], '8"', WATER))
    o.append(txt(pl.p(46, RISER_Z + 1.4), "AISLE  —  riser side", 11.5, MUTED, "middle", "700"))
    o.append(txt(pl.p(46, z0 - 3), "AISLE  —  far side", 11.5, MUTED, "middle", "700"))
    t, _ = wrap(pl.p(IDLER_X - 2, z0 - 7)[0], pl.p(0, z0 - 8)[1], 470,
                "Keep the strip from the wall to the front leg clear on BOTH sides — that is "
                "where a spanner has to swing to reach the tension push-bolts.", 11, 15, MECH, "600")
    o.append(t)

    # ---- D: what changes, what to buy ----------------------------------
    o.append(panel(960, 800, 740, 610, "D · WHAT CHANGES, AND WHAT TO BUY PER ROW"))
    dx = 982
    o.append(txt((dx, 856), "THE THREE SEPARATIONS", 12, INK, "start", "700"))
    yy = 874
    for a, b in [
        ("Along the row",
         'The front 14" is the belt\'s: idler 8" out, brackets on the leg\'s outer face, '
         'push-bolts behind it. The riser starts 8" the other side of the leg — 16" from the '
         'nearest bearing.'),
        ("Across the aisle",
         'The riser stands 100 mm off the cage face, so it passes all three dropping gaps '
         'outside the frame. Cost: 4" of a 33" aisle.'),
        ("In height",
         'Valves and branches at 28 / 51 / 74", inside the cage volumes. Bearings and shaft '
         'ends at 12 / 35 / 58". They cannot meet even if someone re-plumbs it later without '
         'this drawing.'),
    ]:
        o.append(txt((dx, yy), "•  " + a, 11.5, WATER, "start", "700"))
        t, yy = wrap(dx + 14, yy + 16, 330, b, 11)
        o.append(t)
        yy += 10
    o.append(txt((dx, yy + 10), "THREE CHANGES FROM THE PEN IN THE PHOTOS", 12, MECH,
                 "start", "700"))
    yy += 28
    for a, b in [
        ("The riser comes off the row end",
         "Today it stands on the centreline at the end of the cage. That spot is now the idler, "
         "its bearings and the tensioner."),
        ("The hose loop becomes a rigid branch",
         "The white hose loops out and hangs below the cage floor. That is inside a moving belt "
         "now. Rigid pipe, hung at mid-span."),
        ("The branch enters through the mesh",
         "Not over the cage top. A pipe laid on a cage roof is sitting in the dropping gap "
         "above it."),
    ]:
        o.append(txt((dx, yy), "•  " + a, 11.5, INK, "start", "700"))
        t, yy = wrap(dx + 14, yy + 16, 330, b, 11)
        o.append(t)
        yy += 10

    ex = 1370
    o.append(txt((ex, 856), "PER ROW", 12, INK, "start", "700"))
    for i, s in enumerate([
        "1|riser, ~80\" of pipe, footed on the floor",
        "3|ball valves, at 28 / 51 / 74\"",
        "3|tees on the riser",
        "3|tees into the nipple lines",
        "3|rigid branches, ~500 mm each",
        "3|mesh grommets or sleeves",
        "3|branch hangers off the cage roof",
        "3|clips + 100 mm standoffs, riser to rail",
        "1|drain cock at the foot of the riser",
        "1|flush cock at the REAR of each line",
    ]):
        n, lab = s.split("|")
        o.append(txt((ex, 878 + i * 16.5), n, 11.5, WATER, "start", "700"))
        o.append(txt((ex + 20, 878 + i * 16.5), lab, 11.5, MUTED))
    t, _ = wrap(ex, 1064, 300,
                "Put each row's riser in whichever aisle its supply main reaches most directly, "
                "and if you have the choice keep it out of the middle aisle — that one is shared "
                "by two rows and takes the most traffic.", 11, 15, INK, "600")
    o.append(t)
    lg, _ = legend(ex, 1168, [
        (WATER, "water — riser, branch, nipple line"),
        (MECH, "belt mechanism — roller, tensioner"),
        (STEEL, "20 mm rod, bearings, brackets"),
        ("#f7d9d5", "dropping gap — keep-out band"),
    ])
    o.append(lg)
    t, _ = wrap(ex, 1288, 300,
                "Every figure on this sheet is a POSITION, not a size. Nothing here changes the "
                "frame, the belt width, or the belt order.", 11, 15, MECH, "600")
    o.append(t)
    o.append(txt((dx, 1378), "Rejected: feeding from the rear instead — the rear end is busier "
                             "still (drive roller, crank, scraper, spout, basin) and the tank "
                             "and door are at the front.", 11, MUTED))

    write("manure-belt-REVB-5-frontend.svg", W, H, "".join(o))


# ============================================================================
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print(f"Rev B drawing set  ->  {OUT}")
    print(f"  elevations: pan {PAN}  floor {FLOOR}  top {TOP}")
    print(f"  {CELLS_SIDE} cells/side  ·  capacity {CAPACITY:,} birds")
    reset_bbox()
    drawing_set()
    drawing_row()
    drawing_house()
    drawing_details()
    drawing_frontend()
    print("done.")
