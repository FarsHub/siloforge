#!/usr/bin/env python3
"""End-to-end test for mirror.py against a real Postgres and a faked Firestore.

Run with a throwaway database:
  docker run -d --name sf_pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=siloforge \
    -p 55432:5432 postgres:16
  DATABASE_URL=postgresql://postgres:test@127.0.0.1:55432/siloforge python test_mirror.py

Covers the properties the archive depends on: records land in the right typed
columns, nested egg entries and the pen tree get flattened, a vanished record is
soft-deleted rather than dropped, a bulk wipe trips the safety check and rolls the
whole run back, --force lets a genuine reset through, and a restored record comes
back to life.
"""

import copy
import os
import sys

import psycopg

import mirror
import spec

PASS = []
FAIL = []


def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  PASS " if cond else "  FAIL ") + msg)


# ----------------------------------------------------------------- fake firestore

class FakeDoc:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return copy.deepcopy(self._data)


class FakeCollection:
    def __init__(self, node):
        self._node = node

    def stream(self):
        return [FakeDoc(k, v) for k, v in self._node.items()]

    def document(self, doc_id):
        return FakeDocRef(self._node, doc_id)


class FakeDocRef:
    def __init__(self, parent, doc_id):
        self._parent = parent
        self._id = doc_id

    def collection(self, name):
        return FakeCollection(self._parent.setdefault(self._id, {}).setdefault(name, {}))

    def get(self):
        return FakeDoc(self._id, self._parent.get(self._id))


class FakeFirestore:
    def __init__(self, data):
        self.data = data

    def collection(self, name):
        return FakeCollection(self.data.setdefault(name, {}))


def seed():
    return {
        "registry": {"LAYER01": {"name": "Test Farm", "code": "LAYER01"}},
        "farms": {
            "LAYER01": {
                "lt_farm_v1": {"config": {"data": {
                    "name": "Test Farm",
                    "pens": [{
                        "id": "pen1", "name": "Pen A",
                        "flockStartDate": "2026-01-05", "flockAgeAtArrival": 16,
                        "lines": [{
                            "id": "line1", "name": "Line 1",
                            "stands": [{"id": "st1", "name": "Stand 1", "tiers": 3, "cells": 8}],
                        }],
                    }],
                }}},
                "lt_cols_v1": {
                    "c1": {"id": "c1", "date": "2026-08-01", "penId": "pen1", "penName": "Pen A",
                           "lineId": "line1", "lineName": "Line 1", "side": "A", "round": 1,
                           "roundLabel": "Round 1", "exp": 88, "warn": 70, "notes": "",
                           "entries": [
                               {"standId": "st1", "tier": "T1", "cellNum": 1, "birds": 10,
                                "eggs": 9, "broken": 1, "ts": "2026-08-01T07:10:00.000Z"},
                               {"standId": "st1", "tier": "T1", "cellNum": 2, "birds": 10,
                                "eggs": 8, "broken": 0, "ts": "2026-08-01T07:12:00.000Z"},
                           ]},
                    "c2": {"id": "c2", "date": "2026-08-02", "penId": "pen1", "penName": "Pen A",
                           "lineId": "line1", "lineName": "Line 1", "side": "A", "round": 1,
                           "roundLabel": "Round 1", "exp": 88, "warn": 70, "notes": "",
                           "entries": [
                               {"standId": "st1", "tier": "T1", "cellNum": 1, "birds": 10,
                                "eggs": 10, "broken": 0, "ts": "2026-08-02T07:05:00.000Z"},
                           ]},
                },
                "lt_sales_v1": {
                    "s%d" % i: {
                        "id": "s%d" % i, "date": "2026-08-%02d" % (i + 1), "product": "Eggs",
                        "quantity": 10 + i, "unit_price_ngn": 3500,
                        "total_amount_ngn": 3500 * (10 + i),
                        "payment_type": "credit" if i % 2 else "cash",
                        "paid": i % 2 == 0, "customer": "Buyer %d" % i,
                        "customer_id": "cust1", "due_date": "2026-09-01", "notes": "",
                    } for i in range(40)
                },
                "lt_payments_v1": {
                    "p1": {"id": "p1", "sale_id": "s1", "date": "2026-08-10",
                           "amount_ngn": 20000, "method": "Cash", "kind": "sale_payment"},
                },
                "lt_customers_v1": {
                    "cust1": {"id": "cust1", "name": "Buyer 1", "name_normalized": "buyer 1",
                              "phone": "0800", "customer_type": "Retailer",
                              "created_at": "2026-01-02T09:00:00.000Z"},
                },
                "bt_farm_v1": {"config": {"data": {"name": "Test Brood"}}},
                "bt_batches_v1": {
                    "b1": {"id": "b1", "name": "Batch 1", "bird_type": "Pullet",
                           "breed": "ISA Brown", "arrival_date": "2026-03-01",
                           "doc_count": 500, "price_per_bird_ngn": 950,
                           "target_sale_age_weeks": 16, "supplier": "CHI",
                           "status": "Active", "notes": ""},
                },
            }
        },
    }


def run_mirror(data, argv):
    fake = FakeFirestore(data)
    mirror.firestore_client = lambda: fake
    old = sys.argv
    sys.argv = ["mirror.py"] + argv
    try:
        return mirror.main()
    finally:
        sys.argv = old


def pg(dsn):
    """Connect with search_path pinned the same way mirror.py pins it."""
    conn = psycopg.connect(dsn)
    conn.execute('set search_path to "%s"' % spec.schema_name())
    return conn


def q(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()


def one(cur, sql, params=()):
    return q(cur, sql, params)[0][0]


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("set DATABASE_URL to a throwaway Postgres")
    os.environ.setdefault("FIREBASE_SERVICE_ACCOUNT", "unused-because-client-is-faked")

    # Drop objects rather than the schema: mirror_writer owns its tables but not
    # the schema itself, which is exactly how the real Neon setup is arranged.
    schema = spec.schema_name()
    with psycopg.connect(dsn, autocommit=True) as c, c.cursor() as cur:
        cur.execute("select table_name, table_type from information_schema.tables "
                    "where table_schema = %s", (schema,))
        for name, kind in cur.fetchall():
            cur.execute('drop %s if exists "%s"."%s" cascade'
                        % ("view" if kind == "VIEW" else "table", schema, name))

    data = seed()

    print("\n--- run 1: initial load ---")
    ok(run_mirror(data, []) == 0, "first run exits 0")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select count(*) from lt_sales where deleted_at is null") == 40,
           "40 sales mirrored")
        ok(one(cur, "select count(*) from lt_egg_sessions") == 2, "2 egg sessions mirrored")
        ok(one(cur, "select count(*) from lt_egg_entries") == 3,
           "3 nested egg entries flattened into their own table")
        ok(one(cur, "select eggs from lt_egg_entries where source_id = 'c1:0'") == 9,
           "egg entry value landed in a typed integer column")
        ok(str(one(cur, "select date from lt_egg_entries where source_id = 'c1:0'")) == "2026-08-01",
           "child row inherited its parent session date")
        ok(one(cur, "select count(*) from lt_pens") == 1 and
           one(cur, "select count(*) from lt_lines") == 1 and
           one(cur, "select count(*) from lt_stands") == 1,
           "pen / line / stand tree flattened out of the farm config")
        ok(one(cur, "select name from lt_pens where source_id = 'pen1'") == "Pen A",
           "pen name mirrored")
        ok(one(cur, "select count(*) from bt_batches") == 1, "BroodTrack batch mirrored")
        ok(one(cur, "select doc_count from bt_batches where source_id = 'b1'") == 500,
           "batch DOC count typed as integer")
        ok(one(cur, "select count(*) from farm_config") == 2,
           "both app config documents mirrored")
        ok(one(cur, "select count(*) from mirror_snapshots") >= 10,
           "raw snapshots written for the run")
        ok(one(cur, "select status from mirror_runs order by started_at desc limit 1") == "ok",
           "run recorded as ok")
        ok(one(cur, "select raw->>'penName' from lt_egg_sessions where source_id='c1'") == "Pen A",
           "raw jsonb keeps the untyped original")
        ok(one(cur, "select count(*) from v_lt_daily_production") == 2,
           "daily production view returns a row per day")
        ok(one(cur, "select eggs_collected from v_lt_daily_production where date='2026-08-01'") == 17,
           "production view sums entries correctly")

    print("\n--- run 2: no changes (idempotency) ---")
    ok(run_mirror(data, []) == 0, "second run exits 0")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select count(*) from lt_sales") == 40, "still 40 sale rows, no duplicates")
        ok(one(cur, "select count(*) from lt_sales where deleted_at is not null") == 0,
           "nothing soft-deleted by an unchanged run")

    print("\n--- run 3: one record deleted in the app (below tripwire) ---")
    removed = data["farms"]["LAYER01"]["lt_sales_v1"].pop("s7")
    ok(run_mirror(data, []) == 0, "run exits 0 for a small deletion")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select count(*) from lt_sales") == 40, "row kept, not dropped")
        ok(one(cur, "select deleted_at is not null from lt_sales where source_id='s7'"),
           "vanished record was soft-deleted")
        ok(one(cur, "select count(*) from lt_sales where deleted_at is null") == 39,
           "39 live sales remain")
        ok(one(cur, "select raw->>'customer' from lt_sales where source_id='s7'") == "Buyer 7",
           "soft-deleted row still holds its full original data")

    print("\n--- run 4: record restored in the app ---")
    data["farms"]["LAYER01"]["lt_sales_v1"]["s7"] = removed
    ok(run_mirror(data, []) == 0, "run exits 0")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select deleted_at is null from lt_sales where source_id='s7'"),
           "restored record is live again (deleted_at cleared)")

    print("\n--- run 5: Danger Zone wipe -> tripwire must fire ---")
    wiped = data["farms"]["LAYER01"]["lt_sales_v1"]
    data["farms"]["LAYER01"]["lt_sales_v1"] = {}
    ok(run_mirror(data, []) == 1, "run exits non-zero so the Action fails loudly")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select count(*) from lt_sales where deleted_at is null") == 40,
           "all 40 sales still live -- the wipe did NOT propagate")
        ok(one(cur, "select status from mirror_runs order by started_at desc limit 1") == "failed",
           "failure recorded in mirror_runs")
        ok("tripwire" in (one(cur, "select error from mirror_runs where status='failed' "
                               "order by started_at desc limit 1") or ""),
           "failure reason names the tripwire")
        ok(one(cur, "select count(*) from bt_batches where deleted_at is null") == 1,
           "the aborted run rolled back cleanly, other tables untouched")

    print("\n--- run 6: same wipe, confirmed with --force ---")
    ok(run_mirror(data, ["--force"]) == 0, "forced run exits 0")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select count(*) from lt_sales where deleted_at is null") == 0,
           "sales now soft-deleted")
        ok(one(cur, "select count(*) from lt_sales") == 40,
           "but all 40 rows and their data survive in Postgres")
        ok(one(cur, "select count(*) from mirror_snapshots "
                    "where collection='lt_sales_v1' and doc_count=40") >= 1,
           "an earlier snapshot still holds the 40 pre-wipe sales for restore.py")

    print("\n--- run 7: dry run writes nothing ---")
    data["farms"]["LAYER01"]["lt_sales_v1"] = wiped
    ok(run_mirror(data, ["--dry-run"]) == 0, "dry run exits 0")
    with pg(dsn) as c, c.cursor() as cur:
        ok(one(cur, "select count(*) from lt_sales where deleted_at is null") == 0,
           "dry run rolled back -- nothing restored in Postgres")

    print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
