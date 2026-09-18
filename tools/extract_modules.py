#!/usr/bin/env python3
"""
One-shot: carve the inline <script> of LayerTrack.html and BroodTrack.html into
the src/ module tree that build_apps.py reassembles.

This is the Slice 0 extractor from MODULARISATION-PLAN.md. It is pure
mechanical cut-and-paste along the existing `// ====` banner comments — the
seams were already there, this only turns them into files. It asserts that the
concatenation of what it wrote is byte-for-byte the script it read, which is
the whole safety net: if the bytes match, no behaviour change is possible.

Kept in the repo so the proof can be re-run against any earlier commit, not
because it is part of the normal build. Day to day you edit src/ and run
build_apps.py; you never run this again.

Usage: python tools/extract_modules.py          # report only
       python tools/extract_modules.py --write  # write src/
"""

import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")

OPEN_TAG = "\n<script>\n"
CLOSE_TAG = "\n</script>\n"
BANNER = "// \u2550"  # the box-drawing rule the banner comments are made of

# (module filename, [banner titles that go into it]). The titles are matched
# by prefix so the em dashes and parenthetical suffixes in the real banners
# don't have to be reproduced here. Order must match the file's own order —
# the extractor asserts it does, and build_apps.py reassembles in this order.
LAYERTRACK = [
    ("sync.js", ["FIREBASE & SYNC"]),
    ("constants.js", ["CONSTANTS"]),
    ("db.js", ["DATA LAYER", "EGG STOCK"]),
    ("feedstore.js", ["FEED STORE"]),
    ("state.js", ["SESSION STATE"]),
    ("nav.js", ["NAVIGATION", "PEN CONTEXT"]),
    ("utils.js", ["UTILITIES"]),
    ("home.js", ["HOME"]),
    ("eggs.js", ["EGGS"]),
    ("flock.js", ["FLOCK"]),
    ("feed.js", ["FEED \u2014 DAILY FEED USAGE"]),
    ("health.js", ["HEALTH"]),
    ("finance.js", ["CUSTOMER + PAYMENT HELPERS", "FINANCE"]),
    ("document.js", ["RECEIPT / INVOICE DOCUMENT"]),
    ("reports.js", ["REPORTS", "FEED ANALYTICS"]),
    ("settings.js", ["SETTINGS"]),
    ("init.js", ["INIT"]),
]

BROODTRACK = [
    ("sync.js", ["FIREBASE & SYNC"]),
    ("constants.js", ["CONSTANTS"]),
    ("db.js", ["DATA LAYER"]),
    ("feedstore.js", ["FEED STORE"]),
    ("nav.js", ["NAVIGATION"]),
    ("utils.js", ["UTILITIES"]),
    ("home.js", ["HOME"]),
    ("batches.js", ["BATCHES"]),
    ("dailylog.js", ["DAILY LOG"]),
    ("weight.js", ["WEIGHT"]),
    ("feed.js", ["FEED \u2014 DAILY FEED USAGE"]),
    ("health.js", ["HEALTH"]),
    ("finance.js", ["FINANCE"]),
    ("document.js", ["RECEIPT / INVOICE DOCUMENT"]),
    ("reports.js", ["REPORTS"]),
    ("settings.js", ["SETTINGS"]),
    ("init.js", ["INIT"]),
]

APPS = [("LayerTrack.html", "layertrack", LAYERTRACK),
        ("BroodTrack.html", "broodtrack", BROODTRACK)]


def script_body(path):
    src = io.open(os.path.join(ROOT, path), encoding="utf-8", newline="\n").read()
    if "BEGIN GENERATED APP SCRIPT" in src:
        sys.exit("%s is already generated from src/. Re-extracting would fold "
                 "the build markers back into sync.js. Edit src/ instead."
                 % path)
    open_at = src.index(OPEN_TAG) + len(OPEN_TAG)
    close_at = src.index(CLOSE_TAG, open_at) + 1
    return src[open_at:close_at]


def banner_blocks(body):
    """[(title, start_line_index)] for every banner comment in the script."""
    lines = body.split("\n")
    blocks, i = [], 0
    while i < len(lines):
        if lines[i].startswith(BANNER):
            j = i + 1
            while j < len(lines) and not lines[j].startswith(BANNER):
                j += 1
            blocks.append((lines[i + 1][3:].strip(), i))
            i = j + 1
        else:
            i += 1
    return blocks


def carve(body, plan):
    """Slice the script body into (filename, text) along the planned banners."""
    # Put each line's newline back so slices rejoin with "" and no seam is
    # lost; body ends with a newline, so drop the empty tail split() leaves.
    lines = [l + "\n" for l in body.split("\n")[:-1]]
    blocks = banner_blocks(body)
    wanted = [t for _, titles in plan for t in titles]

    if len(blocks) != len(wanted):
        sys.exit("Banner count %d != planned %d:\n  found:   %s\n  planned: %s"
                 % (len(blocks), len(wanted),
                    [b[0] for b in blocks], wanted))
    for (found, _), want in zip(blocks, wanted):
        if not found.startswith(want):
            sys.exit("Banner mismatch: found %r, planned %r" % (found, want))

    # A module runs from its first banner to the next module's first banner.
    firsts, seen = [], 0
    for _, titles in plan:
        firsts.append(blocks[seen][1])
        seen += len(titles)
    bounds = firsts[1:] + [len(lines)]

    out = []
    for (name, _), start, stop in zip(plan, firsts, bounds):
        out.append((name, "".join(lines[start:stop])))
    return out


def main():
    write = "--write" in sys.argv[1:]
    ok = True

    for path, pkg, plan in APPS:
        body = script_body(path)
        pieces = carve(body, plan)

        # The safety net: every byte of the script is in exactly one module.
        if "".join(text for _, text in pieces) != body:
            sys.exit("%s: carved pieces do not rejoin to the original" % path)

        # What build_apps.py will produce from the files we are about to write.
        rebuilt = "\n\n".join(text.rstrip("\n") for _, text in pieces) + "\n"
        if rebuilt == body:
            note = "byte-identical"
        else:
            note = "DIFFERS from source by %d chars" % abs(len(rebuilt) - len(body))
            ok = False

        print("%-18s %2d modules  %6.1f KB  %s"
              % (path, len(pieces), len(body) / 1024, note))
        for name, text in pieces:
            print("    %-16s %5d lines  %6.1f KB"
                  % (name, text.count("\n"), len(text) / 1024))

        if write:
            d = os.path.join(SRC, pkg)
            os.makedirs(d, exist_ok=True)
            for name, text in pieces:
                io.open(os.path.join(d, name), "w",
                        encoding="utf-8", newline="\n").write(text.rstrip("\n") + "\n")

    if write:
        print("\nWrote src/. Now run: python build_apps.py --check")
    elif ok:
        print("\nDry run. Re-run with --write to create src/.")


if __name__ == "__main__":
    main()
