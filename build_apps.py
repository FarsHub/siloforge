#!/usr/bin/env python3
"""
Assemble the inline <script> block of LayerTrack.html and BroodTrack.html
from the module files under src/.

Both apps ship as a single self-contained HTML file — one request, works from
file://, no CORS, and the ~450 inline onclick= handlers need every function in
global scope. So the source is split into modules but the artifact is not:
this script concatenates src/ back into the <script> block, exactly as
inject_receipt_css.py does for the receipt stylesheet.

The block is delimited by markers, so re-running replaces the previous copy
instead of stacking another one.

Concatenation order is the order in MODULES below, and it matters: top-level
`let`s (SES, COLLECT_DATE, FEED_TAB, _activePenId, ...) are in the temporal
dead zone until executed, so any module whose top-level code touches them must
come after the one that declares them. Function declarations hoist, so
function-to-function calls are order-free.

Usage: python build_apps.py            # write the HTML files
       python build_apps.py --check    # exit 1 if the HTML is out of date
"""

import io
import os
import sys

BEGIN = "// ==== BEGIN GENERATED APP SCRIPT — build_apps.py ===="
END = "// ==== END GENERATED APP SCRIPT ===="

SRC = "src"

# The <script> that gets generated is the inline one. The two Firebase compat
# <script src=...> tags above it are left alone.
OPEN_TAG = "\n<script>\n"
CLOSE_TAG = "\n</script>\n"

MODULES = {
    "LayerTrack.html": [
        "layertrack/sync.js",
        "layertrack/constants.js",
        "layertrack/db.js",
        "layertrack/feedstore.js",
        "layertrack/state.js",
        "layertrack/nav.js",
        "layertrack/utils.js",
        "layertrack/home.js",
        "layertrack/eggs.js",
        "layertrack/flock.js",
        "layertrack/feed.js",
        "layertrack/health.js",
        "layertrack/finance.js",
        "layertrack/document.js",
        "layertrack/reports.js",
        "layertrack/settings.js",
        "layertrack/init.js",
    ],
    "BroodTrack.html": [
        "broodtrack/sync.js",
        "broodtrack/constants.js",
        "broodtrack/db.js",
        "broodtrack/customers.js",
        "broodtrack/orders.js",
        "broodtrack/feedstore.js",
        "broodtrack/nav.js",
        "broodtrack/utils.js",
        "broodtrack/home.js",
        "broodtrack/batches.js",
        "broodtrack/dailylog.js",
        "broodtrack/weight.js",
        "broodtrack/feed.js",
        "broodtrack/health.js",
        "broodtrack/finance.js",
        "broodtrack/document.js",
        "broodtrack/vaccdoc.js",
        "broodtrack/passport.js",
        "broodtrack/reports.js",
        "broodtrack/settings.js",
        "broodtrack/init.js",
    ],
}


def read(path):
    return io.open(path, encoding="utf-8", newline="\n").read()


def write(path, text):
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)


def build_block(modules):
    """Concatenate the modules into the text that goes between the markers.

    Each module file is stored without trailing blank lines; the single blank
    line between modules is added here, so the separator is this script's
    business and an editor that trims trailing whitespace cannot break it.
    """
    parts = []
    for rel in modules:
        path = os.path.join(SRC, *rel.split("/"))
        if not os.path.exists(path):
            sys.exit("Missing module: " + path)
        parts.append(read(path).rstrip("\n"))
    return BEGIN + "\n" + "\n\n".join(parts) + "\n" + END + "\n"


def render(path, modules):
    """Return what `path` should contain, given the current src/ tree."""
    src = read(path)
    block = build_block(modules)

    if BEGIN in src:
        head, rest = src.split(BEGIN, 1)
        _, tail = rest.split(END, 1)
        return head + block.rstrip("\n") + tail

    # First run: the markers are not in the file yet. Wrap the whole body of
    # the inline <script>, which is what src/ was extracted from.
    open_at = src.index(OPEN_TAG)
    close_at = src.index(CLOSE_TAG, open_at)
    return src[: open_at + len(OPEN_TAG)] + block + src[close_at + 1 :]


def main():
    check = "--check" in sys.argv[1:]
    stale = []

    for path, modules in MODULES.items():
        if not os.path.exists(path):
            sys.exit("Missing " + path)
        current = read(path)
        out = render(path, modules)

        if check:
            state = "up to date" if out == current else "STALE"
            if out != current:
                stale.append(path)
            print("%-20s %s" % (path, state))
        else:
            write(path, out)
            action = "unchanged" if out == current else "rebuilt"
            print("%-20s %s  (%d modules, %.1f KB)"
                  % (path, action, len(modules), len(out) / 1024))

    if stale:
        print("\nRun: python build_apps.py")
        sys.exit(1)


if __name__ == "__main__":
    main()
