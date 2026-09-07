#!/usr/bin/env python3
"""Test that restore.py can actually put a snapshot back into Firestore.

Runs against the database left behind by test_mirror.py, so run that first:
  DATABASE_URL=... python test_mirror.py && DATABASE_URL=... python test_restore.py
"""

import os
import sys

import psycopg

import restore
from test_mirror import FakeFirestore, ok, pg, PASS, FAIL


class Ref:
    """Doubles as a document reference and a batch write target."""

    def __init__(self, node, doc_id):
        self.node = node
        self.doc_id = doc_id

    def collection(self, sub):
        return Coll(self.node.setdefault(self.doc_id, {}).setdefault(sub, {}))


class Coll:
    def __init__(self, node):
        self.node = node

    def document(self, doc_id):
        return Ref(self.node, doc_id)

    def stream(self):
        return [type("D", (), {"id": k})() for k in self.node]


class RecordingBatch:
    def __init__(self, sink):
        self._sink = sink
        self._ops = []

    def set(self, ref, doc):
        self._ops.append((ref, doc))

    def commit(self):
        for ref, doc in self._ops:
            ref.node[ref.doc_id] = doc
        self._sink.append(len(self._ops))
        self._ops = []


class BatchingFakeFS(FakeFirestore):
    """Minimal stand-in for the Firestore surface restore.py touches."""

    def __init__(self, data):
        super().__init__(data)
        self.commits = []

    def batch(self):
        return RecordingBatch(self.commits)

    def collection(self, name):
        return Coll(self.data.setdefault(name, {}))


def run_restore(fs, argv):
    restore.firestore_client = lambda: fs
    old = sys.argv
    sys.argv = ["restore.py"] + argv
    try:
        return restore.main()
    finally:
        sys.argv = old


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("set DATABASE_URL")
    os.environ.setdefault("FIREBASE_SERVICE_ACCOUNT", "unused-because-client-is-faked")

    # Find the snapshot taken before the simulated wipe: the one with 40 sales.
    with pg(dsn) as c, c.cursor() as cur:
        cur.execute("select run_id from mirror_snapshots where collection='lt_sales_v1' "
                    "and doc_count=40 order by taken_at limit 1")
        row = cur.fetchone()
    if not row:
        sys.exit("no 40-sale snapshot found -- run test_mirror.py first")
    run_id = row[0]
    print("using snapshot run %s" % run_id)

    args = ["--run-id", run_id, "--farm", "LAYER01", "--collection", "lt_sales_v1"]

    print("\n--- restore into an empty collection, dry run ---")
    fs = BatchingFakeFS({"farms": {"LAYER01": {"lt_sales_v1": {}}}})
    ok(run_restore(fs, args) == 0, "dry run exits 0")
    ok(len(fs.data["farms"]["LAYER01"]["lt_sales_v1"]) == 0,
       "dry run wrote nothing to Firestore")

    print("\n--- same restore, confirmed ---")
    ok(run_restore(fs, args + ["--confirm"]) == 0, "confirmed run exits 0")
    live = fs.data["farms"]["LAYER01"]["lt_sales_v1"]
    ok(len(live) == 40, "all 40 sales written back into Firestore")
    ok(live["s7"]["customer"] == "Buyer 7", "restored document has its original field values")
    ok(live["s3"]["total_amount_ngn"] == 3500 * 13, "restored amounts are intact")

    print("\n--- restore again in merge mode (must not clobber) ---")
    live["s7"]["customer"] = "Edited Since Backup"
    ok(run_restore(fs, args + ["--confirm"]) == 0, "second run exits 0")
    ok(live["s7"]["customer"] == "Edited Since Backup",
       "merge mode left an existing, newer document alone")

    print("\n--- replace mode overwrites deliberately ---")
    ok(run_restore(fs, args + ["--confirm", "--mode", "replace"]) == 0, "replace run exits 0")
    ok(live["s7"]["customer"] == "Buyer 7", "replace mode restored the snapshot value")

    print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
