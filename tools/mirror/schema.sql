set search_path to "public";

create table if not exists "lt_egg_sessions" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "pen_id" text,
  "pen_name" text,
  "line_id" text,
  "line_name" text,
  "side" text,
  "round" integer,
  "round_label" text,
  "expected_rate" numeric,
  "warn_rate" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_egg_sessions_live_idx" on "lt_egg_sessions" (farm_code) where deleted_at is null;

create table if not exists "lt_bird_days" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "pen_id" text,
  "age_weeks" numeric,
  "opening_birds" integer,
  "deaths" integer,
  "culls" integer,
  "closing_birds" integer,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_bird_days_live_idx" on "lt_bird_days" (farm_code) where deleted_at is null;

create table if not exists "lt_feed_log" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "age_weeks" numeric,
  "feed_type" text,
  "feed_kg_used" numeric,
  "feed_req_kg" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_feed_log_live_idx" on "lt_feed_log" (farm_code) where deleted_at is null;

create table if not exists "lt_health_log" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "water_consumed_liters" numeric,
  "droppings_observation" text,
  "vaccination_or_medication" text,
  "admin_method" text,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_health_log_live_idx" on "lt_health_log" (farm_code) where deleted_at is null;

create table if not exists "lt_expenses" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "category" text,
  "amount_ngn" numeric,
  "amount_usd" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_expenses_live_idx" on "lt_expenses" (farm_code) where deleted_at is null;

create table if not exists "lt_sales" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "product" text,
  "quantity" numeric,
  "unit_price_ngn" numeric,
  "total_amount_ngn" numeric,
  "payment_type" text,
  "paid" boolean,
  "due_date" date,
  "customer" text,
  "customer_id" text,
  "seller" text,
  "doc_ref" text,
  "doc_issued_at" timestamptz,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_sales_live_idx" on "lt_sales" (farm_code) where deleted_at is null;

create table if not exists "lt_customers" (
  farm_code     text not null,
  source_id     text not null,
  "name" text,
  "name_normalized" text,
  "phone" text,
  "customer_type" text,
  "created_at" timestamptz,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_customers_live_idx" on "lt_customers" (farm_code) where deleted_at is null;

create table if not exists "lt_payments" (
  farm_code     text not null,
  source_id     text not null,
  "sale_id" text,
  "date" date,
  "amount_ngn" numeric,
  "method" text,
  "kind" text,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_payments_live_idx" on "lt_payments" (farm_code) where deleted_at is null;

create table if not exists "lt_receivables" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "customer" text,
  "amount_ngn" numeric,
  "due_date" date,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_receivables_live_idx" on "lt_receivables" (farm_code) where deleted_at is null;

create table if not exists "bt_batches" (
  farm_code     text not null,
  source_id     text not null,
  "name" text,
  "bird_type" text,
  "breed" text,
  "arrival_date" date,
  "doc_count" integer,
  "price_per_bird_ngn" numeric,
  "target_sale_age_weeks" integer,
  "supplier" text,
  "status" text,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_batches_live_idx" on "bt_batches" (farm_code) where deleted_at is null;

create table if not exists "bt_daily_log" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "batch_id" text,
  "batch_name" text,
  "age_days" integer,
  "opening_birds" integer,
  "deaths" integer,
  "culls" integer,
  "closing_birds" integer,
  "feed_kg_used" numeric,
  "feed_req_kg" numeric,
  "water_liters" numeric,
  "temperature_c" numeric,
  "humidity_pct" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_daily_log_live_idx" on "bt_daily_log" (farm_code) where deleted_at is null;

create table if not exists "bt_weights" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "batch_id" text,
  "batch_name" text,
  "breed" text,
  "week_num" integer,
  "sample_size" integer,
  "avg_weight_g" numeric,
  "min_weight_g" numeric,
  "max_weight_g" numeric,
  "benchmark_g" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_weights_live_idx" on "bt_weights" (farm_code) where deleted_at is null;

create table if not exists "bt_health_log" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "batch_id" text,
  "batch_name" text,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_health_log_live_idx" on "bt_health_log" (farm_code) where deleted_at is null;

create table if not exists "bt_expenses" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "batch_id" text,
  "batch_name" text,
  "category" text,
  "amount_ngn" numeric,
  "amount_usd" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_expenses_live_idx" on "bt_expenses" (farm_code) where deleted_at is null;

create table if not exists "bt_sales" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "batch_id" text,
  "batch_name" text,
  "breed" text,
  "quantity" integer,
  "age_weeks_at_sale" numeric,
  "price_per_bird_ngn" numeric,
  "total_amount_ngn" numeric,
  "payment_type" text,
  "paid" boolean,
  "due_date" date,
  "buyer" text,
  "seller" text,
  "doc_ref" text,
  "doc_issued_at" timestamptz,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_sales_live_idx" on "bt_sales" (farm_code) where deleted_at is null;

create table if not exists "bt_payments" (
  farm_code     text not null,
  source_id     text not null,
  "sale_id" text,
  "date" date,
  "amount_ngn" numeric,
  "method" text,
  "kind" text,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_payments_live_idx" on "bt_payments" (farm_code) where deleted_at is null;

create table if not exists "bt_feed_log" (
  farm_code     text not null,
  source_id     text not null,
  "date" date,
  "batch_id" text,
  "feed_kg_used" numeric,
  "notes" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "bt_feed_log_live_idx" on "bt_feed_log" (farm_code) where deleted_at is null;

create table if not exists "lt_pens" (
  farm_code     text not null,
  source_id     text not null,
  "pen_id" text,
  "name" text,
  "flock_start_date" date,
  "flock_age_at_arrival" numeric,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_pens_live_idx" on "lt_pens" (farm_code) where deleted_at is null;

create table if not exists "lt_lines" (
  farm_code     text not null,
  source_id     text not null,
  "line_id" text,
  "pen_id" text,
  "pen_name" text,
  "name" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_lines_live_idx" on "lt_lines" (farm_code) where deleted_at is null;

create table if not exists "lt_stands" (
  farm_code     text not null,
  source_id     text not null,
  "stand_id" text,
  "line_id" text,
  "pen_id" text,
  "name" text,
  "tiers" integer,
  "cells" integer,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_stands_live_idx" on "lt_stands" (farm_code) where deleted_at is null;

create table if not exists "lt_egg_entries" (
  farm_code     text not null,
  source_id     text not null,
  "session_id" text,
  "date" date,
  "stand_id" text,
  "tier" text,
  "cell_num" integer,
  "birds" integer,
  "eggs" integer,
  "broken" integer,
  "recorded_at" timestamptz,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "lt_egg_entries_live_idx" on "lt_egg_entries" (farm_code) where deleted_at is null;

create table if not exists "farm_config" (
  farm_code     text not null,
  source_id     text not null,
  "app" text,
  "name" text,
  raw           jsonb not null,
  first_seen_at timestamptz not null default now(),
  synced_at     timestamptz not null,
  deleted_at    timestamptz,
  primary key (farm_code, source_id)
);
create index if not exists "farm_config_live_idx" on "farm_config" (farm_code) where deleted_at is null;

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

