#!/usr/bin/env python3
"""
Inject the receipt/invoice stylesheet and its embedded webfonts into
LayerTrack.html and BroodTrack.html.

Both apps are single self-contained HTML files, so the shared document styles
live in receipt-src/document.css and get copied in by this script
rather than duplicated by hand. Re-run it after editing that file.

The block is delimited by markers, so re-running replaces the previous copy
instead of stacking another one.

Usage: python inject_receipt_css.py
       python build_receipt_fonts.py   # run first if the subset changed
"""

import io
import os
import sys

BEGIN = "/* ==== BEGIN GENERATED RECEIPT STYLES — inject_receipt_css.py ==== */"
END = "/* ==== END GENERATED RECEIPT STYLES ==== */"

FONTS = os.path.join("receipt-src", "fonts.css")
DOC = os.path.join("receipt-src", "document.css")

# Each app themes the document with its own brand colours. The document CSS
# refers to these three custom properties and nothing else brand-specific.
TARGETS = [
    ("LayerTrack.html", {"brand": "#1b4332", "accent": "#40916c",
                         "wash": "#eaf6ee", "toolbar": "#1b4332"}),
    ("BroodTrack.html", {"brand": "#4a1060", "accent": "#7b2d8b",
                         "wash": "#f6eefa", "toolbar": "#4a1060"}),
]


def build_block(theme):
    fonts = io.open(FONTS, encoding="utf-8").read().strip()
    doc = io.open(DOC, encoding="utf-8").read().strip()
    vars_ = (
        ".rd-ov,.rd{"
        f"--rd-brand:{theme['brand']};"
        f"--rd-accent:{theme['accent']};"
        f"--rd-wash:{theme['wash']};"
        f"--rd-toolbar:{theme['toolbar']}"
        "}"
    )
    return f"{BEGIN}\n{fonts}\n{vars_}\n{doc}\n{END}\n"


def main():
    for missing in (p for p in (FONTS, DOC) if not os.path.exists(p)):
        sys.exit(f"Missing {missing} — run build_receipt_fonts.py first.")

    for path, theme in TARGETS:
        src = io.open(path, encoding="utf-8").read()
        block = build_block(theme)

        if BEGIN in src:
            head, rest = src.split(BEGIN, 1)
            _, tail = rest.split(END, 1)
            out = head + block.rstrip("\n") + tail
            action = "replaced"
        else:
            close = src.index("</style>")
            out = src[:close] + block + src[close:]
            action = "inserted"

        io.open(path, "w", encoding="utf-8").write(out)
        print(f"{path:<20} {action}  ({len(block)/1024:.1f} KB block, "
              f"file now {len(out)/1024:.1f} KB)")


if __name__ == "__main__":
    main()
