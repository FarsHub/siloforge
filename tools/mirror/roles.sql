-- Run this once in Neon's SQL editor, after creating the project.
--
-- Two roles, on purpose: the nightly job writes, you read. A mistyped DELETE in a
-- SQL editor then cannot damage the archive, which is the point of having it.
--
-- Replace both passwords before running. Use something long; you will paste these
-- into GitHub secrets and pgAdmin once and then forget them.

-- Safe to run more than once: existing roles have their password reset rather
-- than erroring out.

-- ── the role GitHub Actions uses (writes) ────────────────────────────────────
do $$ begin
  if exists (select from pg_roles where rolname = 'mirror_writer') then
    alter role mirror_writer login password 'CHANGE-ME-WRITER';
  else
    create role mirror_writer login password 'CHANGE-ME-WRITER';
  end if;
end $$;
grant all on schema public to mirror_writer;
grant all on all tables in schema public to mirror_writer;
grant all on all sequences in schema public to mirror_writer;
alter default privileges in schema public grant all on tables to mirror_writer;
alter default privileges in schema public grant all on sequences to mirror_writer;

-- ── the role you use from pgAdmin (reads only) ───────────────────────────────
do $$ begin
  if exists (select from pg_roles where rolname = 'farm_reader') then
    alter role farm_reader login password 'CHANGE-ME-READER';
  else
    create role farm_reader login password 'CHANGE-ME-READER';
  end if;
end $$;
grant usage on schema public to farm_reader;
grant select on all tables in schema public to farm_reader;
alter default privileges in schema public grant select on tables to farm_reader;

-- The mirror creates its tables as mirror_writer, so farm_reader needs to be
-- granted select on anything made later. Run this again after the first mirror,
-- or just rely on the default privileges above.
alter default privileges for role mirror_writer in schema public
  grant select on tables to farm_reader;

-- ── using a schema other than public ─────────────────────────────────────────
-- Everything above targets "public", which is where the mirror writes by default
-- (Postgres calls it public where SQL Server says dbo). To keep the mirror in a
-- schema of its own instead, set PGSCHEMA=siloforge as a repo variable in GitHub,
-- and run this first, replacing public with siloforge in the grants above:
--
--   create schema if not exists siloforge authorization mirror_writer;
--   grant usage on schema siloforge to farm_reader;
--   alter default privileges for role mirror_writer in schema siloforge
--     grant select on tables to farm_reader;
