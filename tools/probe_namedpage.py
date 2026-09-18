#!/usr/bin/env python3
"""
Probe: does the browser honour the `@page vax` named page?

The health record is the one document allowed onto a second sheet, and it
relies on a named page for its margins — without them the rows either side of
a page break land in the printer's non-printable edge and get clipped.

Named pages are ignored silently where unsupported, so this checks the only
observable consequence: inflate the named page's margin and the page count
must go up. If it does not move, the rule is being ignored.

Usage: python tools/probe_namedpage.py [demos/vaccdoc-preview.html]
"""

import io
import os
import re
import subprocess
import sys

CHROME = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]
RULE = "@page vax{size:203mm 254mm;margin:8mm 10mm}"


def browser():
    for p in CHROME:
        if os.path.exists(p):
            return p
    sys.exit("No Chrome or Edge found.")


def page_count(html, tag, exe):
    src = os.path.abspath("demos/_probe_%s.html" % tag)
    pdf = os.path.abspath("demos/_probe_%s.pdf" % tag)
    io.open(src, "w", encoding="utf-8", newline="\n").write(html)
    url = "file:///" + src.replace(os.sep, "/")
    subprocess.run([exe, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--print-to-pdf=" + pdf, url], capture_output=True)
    try:
        raw = open(pdf, "rb").read()
        n = int(re.search(rb"/Type\s*/Pages.*?/Count\s+(\d+)", raw, re.S).group(1))
    finally:
        for f in (src, pdf):
            if os.path.exists(f):
                os.remove(f)
    return n


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "demos/vaccdoc-preview.html"
    html = io.open(path, encoding="utf-8", newline="\n").read()
    if RULE not in html:
        sys.exit("Named page rule not found in " + path +
                 " — rebuild the preview first.")
    exe = browser()
    print("browser:", os.path.basename(exe))

    shipped = page_count(html, "a", exe)
    fat = page_count(html.replace(RULE, RULE.replace("8mm", "45mm")), "b", exe)
    print("  as shipped,  8mm margin : %d pages" % shipped)
    print("  probe,      45mm margin : %d pages" % fat)

    if fat > shipped:
        print("\nNamed page IS honoured — the margin is really being applied.")
        return 0
    print("\nNamed page appears to be IGNORED: a 45mm margin changed nothing.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
