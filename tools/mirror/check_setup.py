#!/usr/bin/env python3
"""Preflight check for the mirror's two credentials.

Run this before the first real mirror. It checks the Postgres connection and the
Firebase service account independently and says which one is wrong and why, so a
typo in a secret does not turn into a confusing failure at 2am.

It reads only. It creates no tables and writes no data.

  python check_setup.py

Environment: DATABASE_URL, FIREBASE_SERVICE_ACCOUNT (same as mirror.py).
"""

import json
import os
import sys

import spec

RESULTS = []


def check(label, fn):
    try:
        detail = fn()
        RESULTS.append((True, label, detail))
        print("  PASS  %-38s %s" % (label, detail or ""))
        return True
    except Exception as exc:                                  # noqa: BLE001
        RESULTS.append((False, label, str(exc)))
        print("  FAIL  %-38s %s" % (label, exc))
        return False


def check_postgres():
    print("\nPostgres")
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("  FAIL  DATABASE_URL is not set")
        RESULTS.append((False, "DATABASE_URL set", "missing"))
        return
    import psycopg

    state = {}

    def connect():
        # Neon suspends when idle, so the first connect can take a few seconds.
        state["conn"] = psycopg.connect(dsn, connect_timeout=30)
        return "connected"

    if not check("connect to the database", connect):
        print("\n  Hint: check the password, and that the string ends with "
              "?sslmode=require for Neon.")
        return

    conn = state["conn"]
    schema = spec.schema_name()
    try:
        check("server version",
              lambda: conn.execute("select version()").fetchone()[0].split(",")[0])
        check("connected as role",
              lambda: conn.execute("select current_user").fetchone()[0])
        check("database name",
              lambda: conn.execute("select current_database()").fetchone()[0])
        def target_schema():
            found = conn.execute(
                "select 1 from information_schema.schemata where schema_name = %s",
                (schema,)).fetchone()
            if not found:
                raise ValueError("schema %r does not exist -- create it once as an "
                                 "admin (see roles.sql), or unset PGSCHEMA" % schema)
            return "%s%s" % (schema, "" if schema != "public"
                             else " (the default; set PGSCHEMA to change it)")

        if not check("target schema", target_schema):
            return

        def can_write():
            # A real table in the target schema, not a temporary one: TEMP is
            # granted to everyone by default, so a temp table would let the
            # read-only role pass a check it should fail. Rolled back either way.
            with conn.transaction():
                conn.execute('create table "%s"._mirror_preflight_check (x int)' % schema)
                raise psycopg.Rollback()
            return "yes -- this role can create tables in %s" % schema

        if not check("write permission", can_write):
            print("  Hint: the mirror needs the mirror_writer role, not farm_reader.")

        def existing():
            rows = conn.execute(
                "select count(*) from information_schema.tables "
                "where table_schema = %s and table_name like %s",
                (schema, "%mirror%")).fetchone()[0]
            return ("already present in %s" % schema if rows
                    else "none in %s yet -- first run will create them" % schema)

        check("mirror tables", existing)
    finally:
        conn.close()


def check_firebase():
    print("\nFirebase")
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not raw:
        print("  FAIL  FIREBASE_SERVICE_ACCOUNT is not set")
        RESULTS.append((False, "FIREBASE_SERVICE_ACCOUNT set", "missing"))
        return

    state = {}

    def parse():
        if os.path.exists(raw):
            with open(raw, encoding="utf-8") as fh:
                info = json.load(fh)
        else:
            info = json.loads(raw)
        missing = [k for k in ("type", "project_id", "private_key", "client_email")
                   if k not in info]
        if missing:
            raise ValueError("JSON is missing %s -- did the whole file get copied?"
                             % ", ".join(missing))
        state["info"] = info
        return "valid service account JSON"

    if not check("parse the credential", parse):
        print("  Hint: paste the entire file including the opening and closing braces.")
        return

    info = state["info"]
    check("project", lambda: info["project_id"])
    check("service account", lambda: info["client_email"])
    if info.get("project_id") != "siloforgeagro":
        print("  NOTE  project is %r, expected 'siloforgeagro' -- is this the right "
              "Firebase project?" % info.get("project_id"))

    def connect():
        from mirror import firestore_client
        state["fs"] = firestore_client()
        return "Admin SDK initialised"

    if not check("connect to Firestore", connect):
        return

    fs = state["fs"]

    def farms():
        codes = sorted(d.id for d in fs.collection("registry").stream())
        if not codes:
            raise ValueError("registry is empty -- no farms would be mirrored")
        state["codes"] = codes
        return "%d farm(s): %s" % (len(codes), ", ".join(codes))

    if not check("read the farm registry", farms):
        return

    import spec
    print("\nWhat the first run would copy")
    total = 0
    for code in state["codes"]:
        for table in spec.TABLES:
            n = sum(1 for _ in fs.collection("farms").document(code)
                    .collection(table.collection).stream())
            total += n
            if n:
                print("  %-10s %-18s %5d docs" % (code, table.collection, n))
    print("  %d documents in total" % total)


def main():
    print("SiloForge mirror -- preflight check")
    check_postgres()
    check_firebase()

    failed = [r for r in RESULTS if not r[0]]
    print("\n%d checks passed, %d failed" % (len(RESULTS) - len(failed), len(failed)))
    if failed:
        print("\nFix the failures above, then run this again. Nothing was written.")
        return 1
    print("\nBoth credentials work. Next: run the mirror with --dry-run, check the "
          "numbers, then run it for real.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
