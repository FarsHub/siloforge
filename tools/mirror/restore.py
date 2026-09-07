#!/usr/bin/env python3
"""Push a Postgres snapshot back into Firestore.

This is the other half of mirror.py and the reason the archive is worth having.
A backup nobody has ever restored is not a backup, so test it at least once:

  python restore.py --list
  python restore.py --run-id <id> --farm LAYER01 --collection lt_sales_v1
  python restore.py --run-id <id> --farm LAYER01 --collection lt_sales_v1 --confirm

Nothing is written without --confirm. The default mode is "merge", which only
creates documents that are currently missing and never touches a document that
already exists -- so a restore cannot clobber newer work. Use --mode replace only
when you genuinely want the snapshot to win.

Environment: DATABASE_URL, FIREBASE_SERVICE_ACCOUNT (same as mirror.py).
"""

import argparse
import json
import os
import sys

import spec
from mirror import firestore_client


def list_snapshots(cur, farm=None, limit=40):
    sql = ("select run_id, farm_code, app, collection, taken_at, doc_count "
           "from mirror_snapshots")
    params = []
    if farm:
        sql += " where farm_code = %s"
        params.append(farm)
    sql += " order by taken_at desc, collection limit %s"
    params.append(limit)
    cur.execute(sql, params)
    rows = cur.fetchall()
    if not rows:
        print("no snapshots found -- has mirror.py run yet?")
        return
    print("%-28s %-10s %-16s %-22s %s" % ("RUN ID", "FARM", "COLLECTION", "TAKEN AT", "DOCS"))
    for run_id, fc, _app, coll, taken, count in rows:
        print("%-28s %-10s %-16s %-22s %d"
              % (run_id, fc, coll, taken.strftime("%Y-%m-%d %H:%M:%SZ"), count))


def load_snapshot(cur, run_id, farm, collection):
    cur.execute(
        "select payload from mirror_snapshots "
        "where run_id = %s and farm_code = %s and collection = %s",
        (run_id, farm, collection))
    row = cur.fetchone()
    if not row:
        sys.exit("no snapshot for run %s / farm %s / collection %s"
                 % (run_id, farm, collection))
    payload = row[0]
    return json.loads(payload) if isinstance(payload, str) else payload


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="show recent snapshots and exit")
    ap.add_argument("--run-id")
    ap.add_argument("--farm")
    ap.add_argument("--collection", help="omit to restore every collection in the run")
    ap.add_argument("--mode", choices=("merge", "replace"), default="merge")
    ap.add_argument("--confirm", action="store_true", help="actually write to Firestore")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL is not set")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute('set search_path to "%s"' % spec.schema_name())
        if args.list:
            list_snapshots(cur, args.farm)
            return 0
        if not (args.run_id and args.farm):
            sys.exit("--run-id and --farm are required (or use --list)")

        if args.collection:
            collections = [args.collection]
        else:
            cur.execute("select collection from mirror_snapshots "
                        "where run_id = %s and farm_code = %s order by collection",
                        (args.run_id, args.farm))
            collections = [r[0] for r in cur.fetchall()]
            if not collections:
                sys.exit("no snapshots for that run and farm")

        payloads = {c: load_snapshot(cur, args.run_id, args.farm, c) for c in collections}

    fs = firestore_client()
    created = skipped = replaced = 0

    for collection, docs in payloads.items():
        if not isinstance(docs, dict):
            print("  %-16s skipped (config document, restore by hand)" % collection)
            continue
        ref = fs.collection("farms").document(args.farm).collection(collection)
        existing = {d.id for d in ref.stream()}
        batch, pending = fs.batch(), 0
        for doc_id, doc in docs.items():
            if args.mode == "merge" and doc_id in existing:
                skipped += 1
                continue
            if args.confirm:
                batch.set(ref.document(doc_id), doc)
                pending += 1
                if pending >= 400:
                    batch.commit()
                    batch, pending = fs.batch(), 0
            if doc_id in existing:
                replaced += 1
            else:
                created += 1
        if args.confirm and pending:
            batch.commit()
        print("  %-16s %d docs in snapshot" % (collection, len(docs)))

    verb = "restored" if args.confirm else "would restore"
    print("\n%s %d document(s); %d replaced; %d left alone (already present)"
          % (verb, created, replaced, skipped))
    if not args.confirm:
        print("Dry run -- nothing was written. Re-run with --confirm to apply.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
