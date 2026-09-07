"""Single source of truth for the Firestore -> Postgres mapping.

Every mirrored table carries the same bookkeeping columns plus a jsonb "raw" copy
of the original Firestore document. The typed columns exist so ordinary SQL is
pleasant; raw exists so a field the apps add later is never lost before someone
gets round to giving it a column -- query it as raw->>'new_field'.

Nothing here ever hard-deletes. A record that disappears from Firestore gets
deleted_at stamped and keeps its row, which is what makes this archive a recovery
tool rather than just a reporting copy.
"""

import os


def schema_name():
    """Schema everything lives in. Postgres calls it public where SQL Server says dbo.

    Set PGSCHEMA to keep the mirror in a schema of its own. This is pinned rather
    than left to search_path: the default path is "$user", public, so a schema
    named after the connecting role would silently swallow every table.
    """
    return os.environ.get("PGSCHEMA", "public").strip() or "public"


def use_schema_sql():
    # Deliberately does not create the schema. CREATE SCHEMA IF NOT EXISTS needs
    # CREATE on the database even when the schema already exists, which the write
    # role has no business holding. Creating a non-default schema is a one-time
    # admin step in roles.sql; mirror.py checks it exists and says so if it does not.
    return 'set search_path to "%s";' % schema_name()


class Table:
    def __init__(self, name, app, collection, columns, child=None):
        self.name = name
        self.app = app
        self.collection = collection    # Firestore subcollection under farms/{code}/
        self.columns = columns          # {col: (pgtype, firestore_field)}
        self.child = child              # optional (array_field, Table) for nested rows

    def ddl(self):
        cols = ",\n  ".join('"%s" %s' % (c, t) for c, (t, _) in self.columns.items())
        return (
            'create table if not exists "%s" (\n'
            "  farm_code     text not null,\n"
            "  source_id     text not null,\n"
            "  %s,\n"
            "  raw           jsonb not null,\n"
            "  first_seen_at timestamptz not null default now(),\n"
            "  synced_at     timestamptz not null,\n"
            "  deleted_at    timestamptz,\n"
            "  primary key (farm_code, source_id)\n"
            ");\n"
            'create index if not exists "%s_live_idx" on "%s" (farm_code) where deleted_at is null;'
            % (self.name, cols, self.name, self.name)
        )


D, N, I, B, TS, X = "date", "numeric", "integer", "boolean", "timestamptz", "text"

LT_EGG_ENTRIES = Table("lt_egg_entries", "layertrack", None, {
    "session_id":  (X, "_parent"),
    "date":        (D, "_parent_date"),
    "stand_id":    (X, "standId"),
    "tier":        (X, "tier"),
    "cell_num":    (I, "cellNum"),
    "birds":       (I, "birds"),
    "eggs":        (I, "eggs"),
    "broken":      (I, "broken"),
    "recorded_at": (TS, "ts"),
})

TABLES = [
    Table("lt_egg_sessions", "layertrack", "lt_cols_v1", {
        "date":          (D, "date"),
        "pen_id":        (X, "penId"),
        "pen_name":      (X, "penName"),
        "line_id":       (X, "lineId"),
        "line_name":     (X, "lineName"),
        "side":          (X, "side"),
        "round":         (I, "round"),
        "round_label":   (X, "roundLabel"),
        "expected_rate": (N, "exp"),
        "warn_rate":     (N, "warn"),
        "notes":         (X, "notes"),
    }, child=("entries", LT_EGG_ENTRIES)),

    Table("lt_bird_days", "layertrack", "lt_birds_v1", {
        "date":          (D, "date"),
        "pen_id":        (X, "penId"),
        "age_weeks":     (N, "age_weeks"),
        "opening_birds": (I, "opening_birds"),
        "deaths":        (I, "deaths"),
        "culls":         (I, "culls"),
        "closing_birds": (I, "closing_birds"),
        "notes":         (X, "notes"),
    }),

    Table("lt_feed_log", "layertrack", "lt_feed_v1", {
        "date":         (D, "date"),
        "age_weeks":    (N, "age_weeks"),
        "feed_type":    (X, "feed_type"),
        "feed_kg_used": (N, "feed_kg_used"),
        "feed_req_kg":  (N, "feed_req_kg"),
        "notes":        (X, "notes"),
    }),

    Table("lt_health_log", "layertrack", "lt_health_v1", {
        "date":                      (D, "date"),
        "water_consumed_liters":     (N, "water_consumed_liters"),
        "droppings_observation":     (X, "droppings_observation"),
        "vaccination_or_medication": (X, "vaccination_or_medication"),
        "admin_method":              (X, "admin_method"),
        "notes":                     (X, "notes"),
    }),

    Table("lt_expenses", "layertrack", "lt_expenses_v1", {
        "date":       (D, "date"),
        "category":   (X, "category"),
        "amount_ngn": (N, "amount_ngn"),
        "amount_usd": (N, "amount_usd"),
        "notes":      (X, "notes"),
    }),

    Table("lt_sales", "layertrack", "lt_sales_v1", {
        "date":             (D, "date"),
        "product":          (X, "product"),
        "quantity":         (N, "quantity"),
        "unit_price_ngn":   (N, "unit_price_ngn"),
        "total_amount_ngn": (N, "total_amount_ngn"),
        "payment_type":     (X, "payment_type"),
        "paid":             (B, "paid"),
        "due_date":         (D, "due_date"),
        "customer":         (X, "customer"),
        "customer_id":      (X, "customer_id"),
        "seller":           (X, "seller"),
        "doc_ref":          (X, "doc_ref"),
        "doc_issued_at":    (TS, "doc_issued_at"),
        "notes":            (X, "notes"),
    }),

    Table("lt_customers", "layertrack", "lt_customers_v1", {
        "name":            (X, "name"),
        "name_normalized": (X, "name_normalized"),
        "phone":           (X, "phone"),
        "customer_type":   (X, "customer_type"),
        "created_at":      (TS, "created_at"),
        "notes":           (X, "notes"),
    }),

    Table("lt_payments", "layertrack", "lt_payments_v1", {
        "sale_id":    (X, "sale_id"),
        "date":       (D, "date"),
        "amount_ngn": (N, "amount_ngn"),
        "method":     (X, "method"),
        "kind":       (X, "kind"),
        "notes":      (X, "notes"),
    }),

    # The shape of the legacy receivables collection is not fully pinned down, so
    # this keeps only fields we can vouch for; the rest stays queryable in raw.
    Table("lt_receivables", "layertrack", "lt_recv_v1", {
        "date":       (D, "date"),
        "customer":   (X, "customer"),
        "amount_ngn": (N, "amount_ngn"),
        "due_date":   (D, "due_date"),
    }),

    Table("bt_batches", "broodtrack", "bt_batches_v1", {
        "name":                  (X, "name"),
        "bird_type":             (X, "bird_type"),
        "breed":                 (X, "breed"),
        "arrival_date":          (D, "arrival_date"),
        "doc_count":             (I, "doc_count"),
        "price_per_bird_ngn":    (N, "price_per_bird_ngn"),
        "target_sale_age_weeks": (I, "target_sale_age_weeks"),
        "supplier":              (X, "supplier"),
        "status":                (X, "status"),
        "notes":                 (X, "notes"),
    }),

    Table("bt_daily_log", "broodtrack", "bt_daily_v1", {
        "date":          (D, "date"),
        "batch_id":      (X, "batch_id"),
        "batch_name":    (X, "batch_name"),
        "age_days":      (I, "age_days"),
        "opening_birds": (I, "opening_birds"),
        "deaths":        (I, "deaths"),
        "culls":         (I, "culls"),
        "closing_birds": (I, "closing_birds"),
        "feed_kg_used":  (N, "feed_kg_used"),
        "feed_req_kg":   (N, "feed_req_kg"),
        "water_liters":  (N, "water_liters"),
        "temperature_c": (N, "temperature_c"),
        "humidity_pct":  (N, "humidity_pct"),
        "notes":         (X, "notes"),
    }),

    Table("bt_weights", "broodtrack", "bt_weight_v1", {
        "date":         (D, "date"),
        "batch_id":     (X, "batch_id"),
        "batch_name":   (X, "batch_name"),
        "breed":        (X, "breed"),
        "week_num":     (I, "week_num"),
        "sample_size":  (I, "sample_size"),
        "avg_weight_g": (N, "avg_weight_g"),
        "min_weight_g": (N, "min_weight_g"),
        "max_weight_g": (N, "max_weight_g"),
        "benchmark_g":  (N, "benchmark_g"),
        "notes":        (X, "notes"),
    }),

    Table("bt_health_log", "broodtrack", "bt_health_v1", {
        "date":       (D, "date"),
        "batch_id":   (X, "batch_id"),
        "batch_name": (X, "batch_name"),
        "notes":      (X, "notes"),
    }),

    Table("bt_expenses", "broodtrack", "bt_expenses_v1", {
        "date":       (D, "date"),
        "batch_id":   (X, "batch_id"),
        "batch_name": (X, "batch_name"),
        "category":   (X, "category"),
        "amount_ngn": (N, "amount_ngn"),
        "amount_usd": (N, "amount_usd"),
        "notes":      (X, "notes"),
    }),

    Table("bt_sales", "broodtrack", "bt_sales_v1", {
        "date":               (D, "date"),
        "batch_id":           (X, "batch_id"),
        "batch_name":         (X, "batch_name"),
        "breed":              (X, "breed"),
        "quantity":           (I, "quantity"),
        "age_weeks_at_sale":  (N, "age_weeks_at_sale"),
        "price_per_bird_ngn": (N, "price_per_bird_ngn"),
        "total_amount_ngn":   (N, "total_amount_ngn"),
        "payment_type":       (X, "payment_type"),
        "paid":               (B, "paid"),
        "due_date":           (D, "due_date"),
        "buyer":              (X, "buyer"),
        "seller":             (X, "seller"),
        "doc_ref":            (X, "doc_ref"),
        "doc_issued_at":      (TS, "doc_issued_at"),
        "notes":              (X, "notes"),
    }),

    Table("bt_payments", "broodtrack", "bt_payments_v1", {
        "sale_id":    (X, "sale_id"),
        "date":       (D, "date"),
        "amount_ngn": (N, "amount_ngn"),
        "method":     (X, "method"),
        "kind":       (X, "kind"),
        "notes":      (X, "notes"),
    }),

    Table("bt_feed_log", "broodtrack", "bt_feed_v1", {
        "date":         (D, "date"),
        "batch_id":     (X, "batch_id"),
        "feed_kg_used": (N, "feed_kg_used"),
        "notes":        (X, "notes"),
    }),
]

# Pen/line/stand structure lives inside the single farm config document rather than
# in collections of its own, so mirror.py flattens it into these separately.
STRUCTURE_TABLES = [
    Table("lt_pens", "layertrack", None, {
        "pen_id":               (X, "id"),
        "name":                 (X, "name"),
        "flock_start_date":     (D, "flockStartDate"),
        "flock_age_at_arrival": (N, "flockAgeAtArrival"),
    }),
    Table("lt_lines", "layertrack", None, {
        "line_id":  (X, "id"),
        "pen_id":   (X, "_pen_id"),
        "pen_name": (X, "_pen_name"),
        "name":     (X, "name"),
    }),
    Table("lt_stands", "layertrack", None, {
        "stand_id": (X, "id"),
        "line_id":  (X, "_line_id"),
        "pen_id":   (X, "_pen_id"),
        "name":     (X, "name"),
        "tiers":    (I, "tiers"),
        "cells":    (I, "cells"),
    }),
]

FARM_CONFIG = Table("farm_config", None, None, {
    "app":  (X, "_app"),
    "name": (X, "name"),
})

BOOKKEEPING = """
create table if not exists mirror_runs (
  run_id        text primary key,
  started_at    timestamptz not null,
  finished_at   timestamptz,
  status        text not null,
  farms         text[],
  rows_upserted integer not null default 0,
  rows_deleted  integer not null default 0,
  error         text
);
-- Raw per-collection JSON for every run: the belt to the typed tables braces.
-- If the normaliser ever has a bug, everything is still rebuildable from here,
-- and restore.py reads exactly these rows.
create table if not exists mirror_snapshots (
  run_id     text not null,
  farm_code  text not null,
  app        text not null,
  collection text not null,
  taken_at   timestamptz not null,
  doc_count  integer not null,
  payload    jsonb not null,
  primary key (run_id, farm_code, collection)
);
create index if not exists mirror_snapshots_farm_idx on mirror_snapshots (farm_code, taken_at desc);
"""

VIEWS = """
create or replace view v_lt_daily_production as
select s.farm_code, s.date,
       sum(e.eggs)   as eggs_collected,
       sum(e.broken) as cracked_eggs,
       count(distinct s.source_id) as sessions
from lt_egg_sessions s
join lt_egg_entries e on e.farm_code = s.farm_code and e.session_id = s.source_id
where s.deleted_at is null and e.deleted_at is null
group by s.farm_code, s.date;

create or replace view v_lt_open_receivables as
select s.farm_code, s.source_id as sale_id, s.date as sale_date, s.customer, s.customer_id,
       s.product, s.quantity, s.total_amount_ngn, s.due_date,
       coalesce(sum(p.amount_ngn), 0) as paid_ngn,
       s.total_amount_ngn - coalesce(sum(p.amount_ngn), 0) as balance_ngn
from lt_sales s
left join lt_payments p
  on p.farm_code = s.farm_code and p.sale_id = s.source_id and p.deleted_at is null
where s.deleted_at is null and s.payment_type = 'credit'
group by s.farm_code, s.source_id, s.date, s.customer, s.customer_id,
         s.product, s.quantity, s.total_amount_ngn, s.due_date
having s.total_amount_ngn - coalesce(sum(p.amount_ngn), 0) > 0;
"""


def all_tables():
    return TABLES + STRUCTURE_TABLES + [LT_EGG_ENTRIES, FARM_CONFIG]


def schema_sql():
    # search_path is pinned first so every unqualified name below, and every query
    # the mirror runs afterwards on that connection, resolves to one known schema.
    return (use_schema_sql() + "\n\n"
            + "\n\n".join(t.ddl() for t in all_tables())
            + "\n" + BOOKKEEPING + VIEWS)
