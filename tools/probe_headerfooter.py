#!/usr/bin/env python3
"""
Probe: at what @page margin does Chrome stop drawing its own header/footer?

The health record needs page margins so rows at a page break are not clipped
by the printer's non-printable edge. But a non-zero margin is also what gives
Chrome room to print the date and the file:// URL onto the sheet, which has
no place on a document going to a customer.

Chrome only draws them if the margin is tall enough to hold them, so there
may be a window: big enough to clear the printer's dead zone (~5 mm), small
enough that Chrome gives up. This sweeps the margin and reports where the
line falls.

CAVEAT, learned the hard way: this drives headless --print-to-pdf, where the
header and footer templates are empty by default and the margin comes from API
parameters rather than from @page. It reported a clean window at 7-8mm that
does not survive contact with the real print dialog, which drew the header at
that margin anyway. Treat a "suppressed" reading above 0mm as unproven until
it has been checked on paper. margin:0 is the only value that cannot fail.

Detection: render the same page twice at the same margin, once with Chrome's
header/footer forced on and once off, and compare. Drawing them embeds a
system font and two more content streams, so the file grows by tens of KB.
If the two renders come out the same size, Chrome declined to draw them —
which is the answer we want. (Reading the text back does not work: it is
encoded against a subsetted font and does not survive as literal strings.)

Usage: python tools/probe_headerfooter.py
"""

import io
import os
import re
import subprocess
import sys
import zlib

CHROME = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]
PREVIEW = "demos/vaccdoc-preview.html"
RULE = "@page vax{size:203mm 254mm;margin:7mm 10mm}"
MARGINS = [0, 3, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20]


def browser():
    for p in CHROME:
        if os.path.exists(p):
            return p
    sys.exit("No Chrome or Edge found.")


def render(html, tag, exe, headers):
    src = os.path.abspath("demos/_hf_%s.html" % tag)
    pdf = os.path.abspath("demos/_hf_%s.pdf" % tag)
    io.open(src, "w", encoding="utf-8", newline="\n").write(html)
    args = [exe, "--headless", "--disable-gpu", "--print-to-pdf=" + pdf,
            "file:///" + src.replace(os.sep, "/")]
    args.insert(-1, "--print-to-pdf-header-footer" if headers
                else "--no-pdf-header-footer")
    subprocess.run(args, capture_output=True)
    try:
        raw = open(pdf, "rb").read()
    finally:
        for f in (src, pdf):
            if os.path.exists(f):
                os.remove(f)
    return raw


def streams(raw):
    n = 0
    for m in re.finditer(rb"stream\r?\n", raw):
        s = m.end()
        e = raw.find(b"endstream", s)
        try:
            zlib.decompress(raw[s:e])
            n += 1
        except zlib.error:
            pass
    return n


def pages(raw):
    return int(re.search(rb"/Type\s*/Pages.*?/Count\s+(\d+)", raw, re.S).group(1))


def main():
    exe = browser()
    html = io.open(PREVIEW, encoding="utf-8", newline="\n").read()
    if RULE not in html:
        sys.exit("Named page rule not found — rebuild the preview first.")
    print("browser:", os.path.basename(exe))
    print("(headers forced ON vs OFF at each margin — worst case a user can set)\n")
    print("  margin   pages   bytes on / off        Chrome header/footer")
    safe = []
    for mm in MARGINS:
        variant = html.replace(RULE, "@page vax{size:203mm 254mm;margin:%dmm 10mm}" % mm)
        on = render(variant, str(mm) + "on", exe, headers=True)
        off = render(variant, str(mm) + "off", exe, headers=False)
        drawn = streams(on) > streams(off)
        print("  %4d mm  %3d     %7d / %-7d       %s"
              % (mm, pages(on), len(on), len(off), "DRAWN" if drawn else "suppressed"))
        if not drawn:
            safe.append(mm)
    print()
    if safe:
        usable = [m for m in safe if m >= 5]
        print("suppressed at: " + ", ".join(str(m) + "mm" for m in safe))
        print("clears the ~5mm printer dead zone AND stays clean: " +
              (", ".join(str(m) + "mm" for m in usable) if usable else "NONE"))
    else:
        print("Chrome draws its header/footer at every margin tested.")


if __name__ == "__main__":
    main()
