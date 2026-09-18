#!/usr/bin/env python3
"""
Verify the built LayerTrack.html / BroodTrack.html.

Two gates, both from MODULARISATION-PLAN.md section 8:

1. Syntax — `node --check` on the generated <script> block. Catches a module
   that got concatenated in a way that does not parse.
2. Inline handlers — every bare name called from an onclick=/oninput=/...
   attribute must still be a top-level `function` in the built script. This is
   the one failure mode the concatenate-into-one-scope design has: module
   scope would break all ~450 of them silently, with no error until a tap.

Node is optional; without it gate 1 is skipped and gate 2 still runs.

Usage: python tools/check_build.py
"""

import io
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS = ["LayerTrack.html", "BroodTrack.html"]

# on*="foo(...)" — we want the bare names, not this.value or event.key
HANDLER_ATTR = re.compile(r'\bon(?:click|input|change|submit|keydown|keyup|'
                          r'focus|blur|mouseover|mouseout|mousemove|scroll|'
                          r'load|error)\s*=\s*(["\'])(.*?)\1', re.S)
# The lookbehind drops method calls (DB.delBird(), el.click(), Math.max()) —
# only a bare name resolved against global scope is at risk here.
CALL = re.compile(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(')
DECL = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', re.M)
ASSIGNED = re.compile(r'^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*'
                      r'(?:async\s*)?(?:function\b|\()', re.M)

# Called from markup but supplied by the browser or by a local variable in the
# generated string, not by our top-level scope.
BUILTINS = {
    "if", "for", "while", "switch", "return", "typeof", "catch", "function",
    "alert", "confirm", "prompt", "parseInt", "parseFloat", "Number", "String",
    "Boolean", "Array", "Object", "Date", "Math", "JSON", "RegExp", "Set",
    "Map", "isNaN", "encodeURIComponent", "decodeURIComponent", "setTimeout",
    "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
}


def script_body(path):
    src = io.open(os.path.join(ROOT, path), encoding="utf-8", newline="\n").read()
    a = src.index("\n<script>\n") + len("\n<script>\n")
    b = src.index("\n</script>\n", a) + 1
    return src[a:b]


def whole_file(path):
    return io.open(os.path.join(ROOT, path), encoding="utf-8", newline="\n").read()


def node_check(path, body):
    tmp = os.path.join(tempfile.gettempdir(), os.path.basename(path) + ".js")
    io.open(tmp, "w", encoding="utf-8", newline="\n").write(body)
    try:
        r = subprocess.run(["node", "--check", tmp],
                           capture_output=True, text=True)
    except (OSError, FileNotFoundError):
        return None
    finally:
        pass
    if r.returncode == 0:
        os.remove(tmp)
        return True
    print(r.stdout or r.stderr)
    return False


def handler_check(path, html, body):
    defined = set(DECL.findall(body)) | set(ASSIGNED.findall(body))

    called = {}
    for _, code in HANDLER_ATTR.findall(html):
        for name in CALL.findall(code):
            called.setdefault(name, code.strip()[:70])

    missing = {n: c for n, c in called.items()
               if n not in defined and n not in BUILTINS}

    print("    %d handler attributes, %d distinct names called, "
          "%d top-level functions" % (len(HANDLER_ATTR.findall(html)),
                                      len(called), len(defined)))
    for n, c in sorted(missing.items()):
        print("    MISSING  %-28s from  %s" % (n, c))
    return not missing


def main():
    ok = True
    for path in APPS:
        print(path)
        html, body = whole_file(path), script_body(path)

        syn = node_check(path, body)
        if syn is None:
            print("    node not found - syntax check skipped")
        elif syn:
            print("    node --check: OK")
        else:
            print("    node --check: FAILED")
            ok = False

        if not handler_check(path, html, body):
            ok = False

    print("\n" + ("All checks passed." if ok else "FAILURES above."))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
