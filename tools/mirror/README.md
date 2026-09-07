# Firestore → Postgres mirror

A nightly GitHub Actions job that copies every farm's data out of Firestore into
plain Postgres tables. It exists for two reasons: so the data can be queried with
ordinary SQL from pgAdmin or anything else, and so there is a copy of the farm's
history living somewhere Firestore cannot reach.

Nothing here ever hard-deletes. A record that disappears from Firestore gets
`deleted_at` stamped and keeps its row and its raw JSON.

## What you need to set up (one time)

Five steps. Steps 1–3 need you; the rest is already in the repo.

### 1. Create the database (Neon)

1. Sign up at <https://neon.tech> and create a project — the free tier is far more
   than this farm needs.
2. Copy the connection string it shows you. It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### 2. Create two roles

Do this in Neon's SQL editor. The mirror job writes; you read. That way a mistyped
`DELETE` in a SQL editor cannot damage the archive.

```sql
-- the role GitHub Actions uses
create role mirror_writer login password 'pick-a-strong-one';
grant all on schema public to mirror_writer;
alter default privileges in schema public grant all on tables to mirror_writer;

-- the role you use from pgAdmin
create role farm_reader login password 'pick-another-one';
grant usage on schema public to farm_reader;
grant select on all tables in schema public to farm_reader;
alter default privileges in schema public grant select on tables to farm_reader;
```

Take the connection string from step 1 and swap the username/password for
`mirror_writer` — that is the one that goes into GitHub. Keep the `farm_reader`
one for yourself.

### 3. Create a Firebase service account

1. Firebase console → your `siloforgeagro` project → ⚙ → Project settings →
   **Service accounts** → **Generate new private key**. A JSON file downloads.
2. That file is a credential with full database access. Do not commit it.

### 4. Add both as GitHub secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | the `mirror_writer` connection string from step 2 |
| `FIREBASE_SERVICE_ACCOUNT` | the entire contents of the JSON file from step 3 |

Action secrets are not exposed to forked pull requests, so this is safe even
though the repo is public.

### 5. Run it once by hand

Repo → Actions → **Mirror Firestore to Postgres** → Run workflow. Tick *dry run*
the first time: it fetches everything and reports what it would write without
touching the database. If the numbers look right, run it again without the tick.

After that it runs itself at 01:00 UTC (02:00 WAT) every night.

## Connecting with pgAdmin

*Register → Server*, then:

- **Connection tab** — Host: the `ep-xxxx...neon.tech` part of your string,
  Port `5432`, Maintenance database `neondb`, Username `farm_reader`, and the
  password you chose.
- **SSL tab** — SSL mode: `require`.

Neon suspends the database after a few minutes idle on the free tier, so the first
connection after a quiet spell takes a few seconds to wake up. That is normal.

To pull data out: right-click any table → *Import/Export* → CSV. Or from `psql`:

```sql
\copy (select * from lt_sales where deleted_at is null) to 'sales.csv' csv header
```

For a full local copy of everything, worth doing monthly:

```bash
pg_dump "postgresql://farm_reader:...@ep-xxxx.neon.tech/neondb?sslmode=require" \
  --no-owner --no-acl -f siloforge_$(date +%F).sql
```

## Which schema it writes to

Everything goes into one schema — `public` by default, which is what Postgres
calls the default schema where SQL Server says `dbo`. Nothing is written anywhere
else, and no other schema is touched.

This is pinned explicitly rather than left to chance. Postgres resolves unqualified
table names through `search_path`, which defaults to `"$user", public` — so if a
schema happened to share a name with the connecting role, every table would
silently land there instead. The mirror sets `search_path` to exactly one schema on
each connection, so where the data lives is never in question.

To keep the mirror in a schema of its own instead, create it once as an admin (see
the bottom of `roles.sql`) and set a repo **variable** — Settings → Secrets and
variables → Actions → *Variables* tab — named `PGSCHEMA`, e.g. `siloforge`. It is a
variable, not a secret; the workflows already pass it through. The mirror will not
create the schema itself, because doing so would need `CREATE` on the database and
the write role has no business holding that. If `PGSCHEMA` names a schema that does
not exist, the run stops with a clear message rather than half-writing.

## The tables

Every table has `farm_code`, `source_id` (the Firestore document id), the typed
columns, a `raw` jsonb copy of the original document, `synced_at`, and
`deleted_at`.

**Always filter on `deleted_at is null`** unless you specifically want deleted
history — that is the whole point of the archive.

| LayerTrack | BroodTrack | Bookkeeping |
| --- | --- | --- |
| `lt_egg_sessions` | `bt_batches` | `mirror_runs` |
| `lt_egg_entries` | `bt_daily_log` | `mirror_snapshots` |
| `lt_bird_days` | `bt_weights` | `farm_config` |
| `lt_feed_log` | `bt_health_log` | `lt_pens` |
| `lt_health_log` | `bt_expenses` | `lt_lines` |
| `lt_expenses` | `bt_sales` | `lt_stands` |
| `lt_sales` | `bt_payments` | |
| `lt_customers` | `bt_feed_log` | |
| `lt_payments` | | |
| `lt_receivables` | | |

Two views are provided: `v_lt_daily_production` (eggs and cracks per day) and
`v_lt_open_receivables` (unpaid credit sales with balances).

If the apps gain a field that has no column yet, it is still there —
`select raw->>'new_field' from lt_sales`. Add it to `spec.py` when you want a real
column; the schema is applied on every run, so a new column appears by itself.

## When the nightly job fails

Almost always this is the tripwire, and that is it doing its job.

The run aborts and rolls back — nothing is written — if a single run would
soft-delete more than 20% of a table, or if a collection comes back completely
empty while live rows exist. That is the signature of an accidental bulk delete or
a broken credential, and it means the damage does not get recorded into the
archive.

When you get the failure email:

1. Open the app and check whether the records are actually gone. If they are,
   Settings → Recently Deleted will still have them for 60 days — restore there
   and the next nightly run fixes itself.
2. If the deletion was genuinely intended, re-run the workflow with the **force**
   input ticked.

Thresholds are tunable with the `TRIPWIRE_PCT` and `TRIPWIRE_MIN` environment
variables.

## Restoring from Postgres into Firestore

`mirror_snapshots` holds the complete raw JSON of every collection for every run,
so a bad day is recoverable even if the typed tables were wrong.

```bash
export DATABASE_URL='postgresql://...'          # needs write access to nothing, read only
export FIREBASE_SERVICE_ACCOUNT=./service-account.json

python restore.py --list                                        # find the run you want
python restore.py --run-id <id> --farm LAYER01 --collection lt_sales_v1
python restore.py --run-id <id> --farm LAYER01 --collection lt_sales_v1 --confirm
```

Nothing is written without `--confirm`. The default `--mode merge` only creates
documents that are currently missing and never overwrites one that already exists,
so a restore cannot clobber newer work. Use `--mode replace` when you do want the
snapshot to win.

Omit `--collection` to restore every collection in that run.

## Running the tests

The tests use a throwaway Postgres in Docker and a faked Firestore, so they touch
neither the real database nor the real farm data.

```bash
docker run -d --name sf_pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=siloforge \
  -p 55432:5432 postgres:16
export DATABASE_URL=postgresql://postgres:test@127.0.0.1:55432/siloforge
python test_mirror.py && python test_restore.py
docker rm -f sf_pg
```

`test_mirror.py` covers the shaping, soft deletes, the tripwire firing and rolling
back, `--force`, and dry runs. `test_restore.py` covers the restore path itself,
including that merge mode will not clobber newer data.
