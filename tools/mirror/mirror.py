#!/usr/bin/env python3
"""Mirror SiloForge's Firestore data into Postgres.

Runs nightly from GitHub Actions. Reads every farm under /farms/{code}/ with the
Firebase Admin SDK and upserts it into the typed tables described in spec.py.

Two properties make this a recovery system rather than just an analytics copy:

  1. Soft delete only. A record that vanishes from Firestore gets deleted_at
     stamped; its row and its raw JSON stay. A Danger Zone wipe cannot propagate.

  2. A tripwire. If one run would soft-delete more than TRIPWIRE_PCT of a table
     (or any rows at all from a collection that came back completely empty), the
     whole run aborts and rolls back rather than recording the damage. The Action
     then fails, which is the alarm that something deleted a lot of data. Inspect,
     then re-run with --force once you are satisfied the deletion was intentional.

Usage:
  python mirror.py                     # normal nightly run
  python mirror.py --dry-run           # fetch and report, write nothing
  python mirror.py --print-schema      # emit DDL, e.g. to hand to pgAdmin
  python mirror.py --force             # allow a run that trips the safety check
  python mirror.py --farm LAYER01      # restrict to one farm code

Environment:
  DATABASE_URL                Postgres connection string (write role)
  FIREBASE_SERVICE_ACCOUNT    service account JSON, inline or a path to a file
  FARM_CODES                  optional comma-separated override for discovery
  TRIPWIRE_PCT                default 0.20
  TRIPWIRE_MIN                default 25
"""

import argparse
import datetime as dt
import json
import os
import sys
import uuid

import spec

TRIPWIRE_PCT = float(os.environ.get("TRIPWIRE_PCT", "0.20"))
TRIPWIRE_MIN = int(os.environ.get("TRIPWIRE_MIN", "25"))


# ---------------------------------------------------------------- value coercion

def _s(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return str(v)


def _num(v):
    if isinstance(v, bool) or v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _int(v):
    n = _num(v)
    return None if n is None else int(round(n))


def _bool(v):
    if isinstance(v, bool):
        return v
    if v in (None, ""):
        return None
    if isinstance(v, str):
        return v.strip().lower() in ("true", "yes", "1", "y")
    return bool(v)


def _date(v):
    s = _s(v)
    if not s:
        return None
    try:
        return dt.date.fromisoformat(s[:10])
    except ValueError:
        return None


def _ts(v):
    if isinstance(v, dt.datetime):
        return v if v.tzinfo else v.replace(tzinfo=dt.timezone.utc)
    s = _s(v)
    if not s:
        return None
    try:
        parsed = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)


COERCE = {"text": _s, "numeric": _num, "integer": _int,
          "boolean": _bool, "date": _date, "timestamptz": _ts}


def jsonable(v):
    """Firestore hands back datetimes and refs; make them JSON-safe for jsonb."""
    if isinstance(v, dict):
        return {k: jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    if isinstance(v, (dt.datetime, dt.date)):
        return v.isoformat()
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    return str(v)


def row_for(table, doc, source_id):
    vals = {}
    for col, (pgtype, field) in table.columns.items():
        vals[col] = COERCE[pgtype](doc.get(field))
    return source_id, vals, jsonable(doc)


# ---------------------------------------------------------------- firestore side

def firestore_client():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not raw:
        sys.exit("FIREBASE_SERVICE_ACCOUNT is not set")
    if os.path.exists(raw):
        with open(raw, encoding="utf-8") as fh:
            info = json.load(fh)
    else:
        info = json.loads(raw)
    import firebase_admin
    from firebase_admin import credentials, firestore
    firebase_admin.initialize_app(credentials.Certificate(info))
    return firestore.client()


def discover_farms(fs, only=None):
    if only:
        return [only]
    env = os.environ.get("FARM_CODES", "").strip()
    if env:
        return [c.strip().upper() for c in env.split(",") if c.strip()]
    return sorted(d.id for d in fs.collection("registry").stream())


def fetch_collection(fs, farm, collection):
    ref = fs.collection("farms").document(farm).collection(collection)
    return {d.id: (d.to_dict() or {}) for d in ref.stream()}


def fetch_config(fs, farm, collection):
    snap = fs.collection("farms").document(farm).collection(collection).document("config").get()
    if not snap.exists:
        return None
    return (snap.to_dict() or {}).get("data")


# ---------------------------------------------------------------- shaping

def build_rows(fs, farm, snapshots):
    """Return {table_name: {source_id: (vals, raw)}} plus fill `snapshots`."""
    out = {t.name: {} for t in spec.all_tables()}

    for table in spec.TABLES:
        docs = fetch_collection(fs, farm, table.collection)
        snapshots.append((farm, table.app, table.collection, jsonable(docs)))
        for doc_id, doc in docs.items():
            sid, vals, raw = row_for(table, doc, doc_id)
            out[table.name][sid] = (vals, raw)
            if table.child:
                field, child = table.child
                for idx, item in enumerate(doc.get(field) or []):
                    item = dict(item)
                    item["_parent"] = doc_id
                    item["_parent_date"] = doc.get("date")
                    csid = "%s:%d" % (doc_id, idx)
                    _, cvals, craw = row_for(child, item, csid)
                    out[child.name][csid] = (cvals, craw)

    # Farm config documents, and the pen/line/stand tree nested inside LayerTrack's.
    for app, coll in (("layertrack", "lt_farm_v1"), ("broodtrack", "bt_farm_v1")):
        cfg = fetch_config(fs, farm, coll)
        snapshots.append((farm, app, coll, jsonable(cfg) if cfg is not None else {}))
        if cfg is None:
            continue
        cfg_doc = dict(cfg)
        cfg_doc["_app"] = app
        _, vals, raw = row_for(spec.FARM_CONFIG, cfg_doc, app)
        out[spec.FARM_CONFIG.name][app] = (vals, raw)
        if app != "layertrack":
            continue
        pens, lines, stands = spec.STRUCTURE_TABLES
        for pen in cfg.get("pens") or []:
            _, v, r = row_for(pens, pen, pen.get("id"))
            out[pens.name][pen.get("id")] = (v, r)
            for line in pen.get("lines") or []:
                ld = dict(line, _pen_id=pen.get("id"), _pen_name=pen.get("name"))
                _, v, r = row_for(lines, ld, line.get("id"))
                out[lines.name][line.get("id")] = (v, r)
                for stand in line.get("stands") or []:
                    sd = dict(stand, _pen_id=pen.get("id"), _line_id=line.get("id"))
                    _, v, r = row_for(stands, sd, stand.get("id"))
                    out[stands.name][stand.get("id")] = (v, r)
    return out


# ---------------------------------------------------------------- postgres side

def apply_schema(cur):
    schema = spec.schema_name()
    cur.execute("select 1 from information_schema.schemata where schema_name = %s",
                (schema,))
    if not cur.fetchone():
        raise RuntimeError(
            "schema %r does not exist. Create it once as an admin "
            "(see roles.sql), or unset PGSCHEMA to use public." % schema)
    cur.execute(spec.schema_sql())


def check_tripwire(cur, farm, table_name, keep_ids, force):
    """Return (live_before, would_delete, tripped_reason_or_None)."""
    cur.execute(
        'select count(*) from "%s" where farm_code = %%s and deleted_at is null' % table_name,
        (farm,))
    live_before = cur.fetchone()[0]
    if live_before == 0:
        return live_before, 0, None
    cur.execute(
        'select count(*) from "%s" where farm_code = %%s and deleted_at is null '
        "and source_id <> all(%%s)" % table_name,
        (farm, list(keep_ids)))
    would_delete = cur.fetchone()[0]
    if would_delete == 0 or force:
        return live_before, would_delete, None
    if not keep_ids:
        return live_before, would_delete, (
            "collection came back empty but %d live rows exist" % live_before)
    limit = max(TRIPWIRE_MIN, live_before * TRIPWIRE_PCT)
    if would_delete > limit:
        return live_before, would_delete, (
            "%d of %d rows would be soft-deleted (limit %.0f)"
            % (would_delete, live_before, limit))
    return live_before, would_delete, None


def upsert(cur, table, farm, rows, now):
    if not rows:
        return 0
    cols = list(table.columns.keys())
    collist = ", ".join('"%s"' % c for c in ["farm_code", "source_id"] + cols
                        + ["raw", "synced_at", "deleted_at"])
    holders = ", ".join(["%s"] * (len(cols) + 5))
    updates = ", ".join('"%s" = excluded."%s"' % (c, c) for c in cols + ["raw", "synced_at"])
    sql = (
        'insert into "%s" (%s) values (%s) '
        "on conflict (farm_code, source_id) do update set %s, deleted_at = null"
        % (table.name, collist, holders, updates))
    data = []
    for sid, (vals, raw) in rows.items():
        data.append([farm, sid] + [vals[c] for c in cols] + [json.dumps(raw), now, None])
    cur.executemany(sql, data)
    return len(data)


def soft_delete(cur, table_name, farm, keep_ids, now):
    cur.execute(
        'update "%s" set deleted_at = %%s where farm_code = %%s and deleted_at is null '
        "and source_id <> all(%%s)" % table_name,
        (now, farm, list(keep_ids)))
    return cur.rowcount


def save_snapshots(cur, run_id, snapshots, now):
    cur.executemany(
        "insert into mirror_snapshots (run_id, farm_code, app, collection, taken_at, "
        "doc_count, payload) values (%s, %s, %s, %s, %s, %s, %s) "
        "on conflict (run_id, farm_code, collection) do nothing",
        [(run_id, farm, app, coll, now,
          len(payload) if isinstance(payload, dict) else 0, json.dumps(payload))
         for farm, app, coll, payload in snapshots])


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--print-schema", action="store_true")
    ap.add_argument("--force", action="store_true",
                    help="proceed even if the delete tripwire fires")
    ap.add_argument("--farm", help="mirror a single farm code")
    args = ap.parse_args()

    if args.print_schema:
        print(spec.schema_sql())
        return 0

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL is not set")
    import psycopg

    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ-") + uuid.uuid4().hex[:6]
    now = dt.datetime.now(dt.timezone.utc)
    fs = firestore_client()
    farms = discover_farms(fs, args.farm)
    if not farms:
        sys.exit("no farm codes found in /registry (set FARM_CODES to override)")
    print("run %s -- farms: %s" % (run_id, ", ".join(farms)))

    conn = psycopg.connect(dsn, autocommit=False)
    upserted = deleted = 0
    trips = []
    try:
        with conn.cursor() as cur:
            apply_schema(cur)
            cur.execute(
                "insert into mirror_runs (run_id, started_at, status, farms) "
                "values (%s, %s, 'running', %s)", (run_id, now, farms))

            snapshots = []
            for farm in farms:
                rows = build_rows(fs, farm, snapshots)
                for table in spec.all_tables():
                    keep = set(rows[table.name].keys())
                    live, would, reason = check_tripwire(cur, farm, table.name, keep, args.force)
                    if reason:
                        trips.append("%s/%s: %s" % (farm, table.name, reason))
                        continue
                    upserted += upsert(cur, table, farm, rows[table.name], now)
                    if would:
                        deleted += soft_delete(cur, table.name, farm, keep, now)
                    print("  %-18s %-16s upsert %4d  soft-delete %3d"
                          % (farm, table.name, len(rows[table.name]), would))

            if trips:
                raise RuntimeError("delete tripwire fired:\n  - " + "\n  - ".join(trips))

            save_snapshots(cur, run_id, snapshots, now)
            cur.execute(
                "update mirror_runs set finished_at = %s, status = %s, "
                "rows_upserted = %s, rows_deleted = %s where run_id = %s",
                (dt.datetime.now(dt.timezone.utc), "dry-run" if args.dry_run else "ok",
                 upserted, deleted, run_id))

        if args.dry_run:
            conn.rollback()
            print("dry run: rolled back. %d rows would be upserted, %d soft-deleted"
                  % (upserted, deleted))
        else:
            conn.commit()
            print("committed: %d rows upserted, %d soft-deleted" % (upserted, deleted))
        return 0

    except Exception as exc:                                  # noqa: BLE001
        conn.rollback()
        # Recorded on a fresh transaction so the failure survives the rollback.
        try:
            with conn.cursor() as cur:
                # search_path is transactional, so the rollback above discarded it.
                # Without re-pinning, this insert misses the mirror's schema.
                cur.execute(spec.use_schema_sql())
                cur.execute(
                    "insert into mirror_runs (run_id, started_at, finished_at, status, "
                    "farms, error) values (%s, %s, %s, 'failed', %s, %s) "
                    "on conflict (run_id) do update set status = 'failed', "
                    "finished_at = excluded.finished_at, error = excluded.error",
                    (run_id, now, dt.datetime.now(dt.timezone.utc), farms, str(exc)))
            conn.commit()
        except Exception as log_exc:                          # noqa: BLE001
            print("warning: could not record the failure in mirror_runs: %s" % log_exc,
                  file=sys.stderr)
        print("MIRROR FAILED -- nothing was written.\n%s" % exc, file=sys.stderr)
        if trips:
            print("\nIf these deletions were intentional, re-run with --force.",
                  file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
