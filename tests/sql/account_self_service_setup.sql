\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$$;

create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'standard',
  subscription_plan text not null default 'free',
  status text not null default 'active',
  suspended_at timestamptz,
  suspended_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.datasets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  file_url text not null,
  normalized_file_url text,
  analytics_manifest_url text,
  normalized_table_name text
);
create table public.reports (id uuid primary key, user_id uuid not null, dataset_id uuid not null);
create table public.stories (id uuid primary key, user_id uuid not null, dataset_id uuid not null);
create table public.story_export_jobs (id uuid primary key, user_id uuid not null, story_id uuid);
create table public.public_report_snapshots (id uuid primary key, user_id uuid not null);
create table public.public_story_snapshots (id uuid primary key, user_id uuid not null);

create or replace function public.normalized_dataset_table_name(p_dataset_id uuid)
returns text language sql immutable set search_path = pg_catalog as $$
  select 'dataset_' || replace(p_dataset_id::text, '-', '_')
$$;

insert into auth.users(id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000005');
insert into public.user_roles(user_id, role, subscription_plan) values
  ('10000000-0000-0000-0000-000000000001', 'standard', 'pro'),
  ('10000000-0000-0000-0000-000000000002', 'standard', 'free'),
  ('10000000-0000-0000-0000-000000000003', 'standard', 'free'),
  ('10000000-0000-0000-0000-000000000005', 'standard', 'free');
