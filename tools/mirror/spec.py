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

    # Feed store movements: purchases in, physical counts as anchors. kind tells
    # them apart, and variance_kg on a count is the only record of shrinkage the
    # farm has -- worth a typed column rather than leaving it in raw.
    Table("lt_feed_stock", "layertrack", "lt_feedstock_v1", {
        "date":        (D, "date"),
        "kind":        (X, "kind"),
        "feed_type":   (X, "feed_type"),
        "bags":        (N, "bags"),
        "loose_kg":    (N, "loose_kg"),
        "kg":          (N, "kg"),
        "bag_kg":      (N, "bag_kg"),
        "cost_ngn":    (N, "cost_ngn"),
        "supplier":    (X, "supplier"),
        "counted_by":  (X, "counted_by"),
        "variance_kg": (N, "variance_kg"),
        "expense_id":  (X, "expense_id"),
        "notes":       (X, "notes"),
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
        # Uniformity is the figure a pullet buyer actually asks for, and it is
        # only computable where individual birds were weighed. Null means not
        # measured, which is a different thing from measured badly -- the
        # individual weights stay in raw->'weights'.
        "sd_g":            (N, "sd_g"),
        "cv_pct":          (N, "cv_pct"),
        "uniformity_pct":  (N, "uniformity_pct"),
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
        "customer_id":        (X, "customer_id"),
        "order_id":           (X, "order_id"),
        "seller":             (X, "seller"),
        "doc_ref":            (X, "doc_ref"),
        "doc_issued_at":      (TS, "doc_issued_at"),
        "notes":              (X, "notes"),
    }),

    Table("bt_payments", "broodtrack", "bt_payments_v1", {
        "sale_id":    (X, "sale_id"),
        # A deposit is taken against an order months before the sale exists, so
        # exactly one of these two is set. On fulfilment the row keeps its
        # order_id and gains a sale_id, which is what makes the handover
        # traceable from either end.
        "order_id":   (X, "order_id"),
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

    Table("bt_customers", "broodtrack", "bt_customers_v1", {
        "name":            (X, "name"),
        "name_normalized": (X, "name_normalized"),
        "phone":           (X, "phone"),
        "customer_type":   (X, "customer_type"),
        "location":        (X, "location"),
        "created_at":      (TS, "created_at"),
        "notes":           (X, "notes"),
    }),

    # The order book. Declined rows are the point of keeping this table: a sale
    # that never happened leaves no trace anywhere else, so turned-away demand
    # is the only evidence the farm is undersupplied, and it is what a capacity
    # decision gets argued from later.
    Table("bt_orders", "broodtrack", "bt_orders_v1", {
        "ref":                   (X, "ref"),
        "date":                  (D, "date"),
        "customer_id":           (X, "customer_id"),
        "customer_name":         (X, "customer_name"),
        "bird_type":             (X, "bird_type"),
        "breed":                 (X, "breed"),
        "quantity":              (I, "quantity"),
        "age_weeks_at_delivery": (N, "age_weeks_at_delivery"),
        "needed_from":           (D, "needed_from"),
        "needed_to":             (D, "needed_to"),
        "price_per_bird_ngn":    (N, "price_per_bird_ngn"),
        "status":                (X, "status"),
        "batch_id":              (X, "batch_id"),
        "sale_id":               (X, "sale_id"),
        "decline_reason":        (X, "decline_reason"),
        "notes":                 (X, "notes"),
    }),

    Table("bt_feed_stock", "broodtrack", "bt_feedstock_v1", {
        "date":        (D, "date"),
        "kind":        (X, "kind"),
        "feed_type":   (X, "feed_type"),
        "batch_id":    (X, "batch_id"),
        "batch_name":  (X, "batch_name"),
        "bags":        (N, "bags"),
        "loose_kg":    (N, "loose_kg"),
        "kg":          (N, "kg"),
        "bag_kg":      (N, "bag_kg"),
        "cost_ngn":    (N, "cost_ngn"),
        "supplier":    (X, "supplier"),
        "counted_by":  (X, "counted_by"),
        "variance_kg": (N, "variance_kg"),
        "expense_id":  (X, "expense_id"),
        "notes":       (X, "notes"),
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

-- Feed stock on hand per feed type, mirroring the rule the apps use: the most
-- recent physical count is an anchor that discards everything before it, then
-- purchases are added and usage subtracted from that date onwards. Same-day
-- order is count, then delivery, then feeding, which is why the anchor date
-- itself is included in both sums. With no count on record it falls back to
-- purchases minus usage over all time.
-- The order book with the money attached: deposits held while the order is
-- open, and what it is worth. Open orders only -- fulfilled ones are sales.
create or replace view v_bt_open_orders as
select o.farm_code, o.source_id as order_id, o.ref, o.date as placed_on,
       o.customer_id, o.customer_name, o.bird_type, o.breed,
       o.quantity, o.age_weeks_at_delivery, o.needed_from, o.needed_to,
       o.status, o.batch_id,
       o.quantity * coalesce(o.price_per_bird_ngn, 0) as order_value_ngn,
       coalesce(sum(p.amount_ngn), 0)                 as deposits_ngn
from bt_orders o
left join bt_payments p
  on p.farm_code = o.farm_code and p.order_id = o.source_id
 and p.sale_id is null and p.deleted_at is null
where o.deleted_at is null and o.status in ('enquiry', 'confirmed')
group by o.farm_code, o.source_id, o.ref, o.date, o.customer_id, o.customer_name,
         o.bird_type, o.breed, o.quantity, o.age_weeks_at_delivery,
         o.needed_from, o.needed_to, o.status, o.batch_id,
         o.price_per_bird_ngn;

-- Demand that walked away, by month. The sentence "we turned away N birds last
-- year" is what justifies more cages, and nothing else in the schema records it.
create or replace view v_bt_turned_away as
select o.farm_code,
       to_char(o.date, 'YYYY-MM')                      as month,
       count(*)                                      as orders,
       sum(o.quantity)                                   as birds,
       sum(o.quantity * coalesce(o.price_per_bird_ngn,0)) as value_ngn,
       string_agg(distinct o.decline_reason, '; ')       as reasons
from bt_orders o
where o.deleted_at is null and o.status = 'declined'
group by o.farm_code, to_char(o.date, 'YYYY-MM');

-- What each customer is worth, in birds as much as in naira. A supply business
-- is judged on repeat buyers, and until now the buyer was free text.
create or replace view v_bt_customer_value as
select c.farm_code, c.source_id as customer_id, c.name, c.customer_type,
       c.phone, c.location,
       count(s.source_id)                        as sales,
       coalesce(sum(s.quantity), 0)              as birds_supplied,
       coalesce(sum(s.total_amount_ngn), 0)      as lifetime_ngn,
       max(s.date)                               as last_sale
from bt_customers c
left join bt_sales s
  on s.farm_code = c.farm_code and s.customer_id = c.source_id and s.deleted_at is null
where c.deleted_at is null
group by c.farm_code, c.source_id, c.name, c.customer_type, c.phone, c.location;

create or replace view v_lt_feed_stock_on_hand as
with anchor as (
  select farm_code, feed_type, max(date) as anchor_date
  from lt_feed_stock
  where deleted_at is null and kind = 'count'
  group by farm_code, feed_type
),
anchor_kg as (
  select s.farm_code, s.feed_type, a.anchor_date, sum(s.kg) as counted_kg
  from lt_feed_stock s
  join anchor a
    on a.farm_code = s.farm_code and a.feed_type = s.feed_type and a.anchor_date = s.date
  where s.deleted_at is null and s.kind = 'count'
  group by s.farm_code, s.feed_type, a.anchor_date
),
types as (
  select distinct farm_code, feed_type from lt_feed_stock where deleted_at is null and feed_type is not null
  union
  select distinct farm_code, feed_type from lt_feed_log   where deleted_at is null and feed_type is not null
)
select t.farm_code, t.feed_type,
       k.anchor_date as last_count_date,
       coalesce(k.counted_kg, 0)
         + coalesce((select sum(p.kg) from lt_feed_stock p
                     where p.deleted_at is null and p.farm_code = t.farm_code
                       and p.feed_type = t.feed_type and p.kind = 'purchase'
                       and (k.anchor_date is null or p.date >= k.anchor_date)), 0)
         - coalesce((select sum(u.feed_kg_used) from lt_feed_log u
                     where u.deleted_at is null and u.farm_code = t.farm_code
                       and u.feed_type = t.feed_type
                       and (k.anchor_date is null or u.date >= k.anchor_date)), 0)
       as kg_on_hand
from types t
left join anchor_kg k on k.farm_code = t.farm_code and k.feed_type = t.feed_type;
"""


def all_tables():
    return TABLES + STRUCTURE_TABLES + [LT_EGG_ENTRIES, FARM_CONFIG]


def schema_sql():
    # search_path is pinned first so every unqualified name below, and every query
    # the mirror runs afterwards on that connection, resolves to one known schema.
    return (use_schema_sql() + "\n\n"
            + "\n\n".join(t.ddl() for t in all_tables())
            + "\n" + BOOKKEEPING + VIEWS)
