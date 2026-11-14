\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table public.datasets (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  file_url text not null,
  columns jsonb not null,
  stats jsonb not null,
  normalized_table_name text
);

create or replace function public.map_dataset_type_to_pg(input_type text)
returns text
language sql
immutable
as $$
  select case upper(input_type)
    when 'INTEGER' then 'bigint'
    when 'BIGINT' then 'bigint'
    when 'DOUBLE' then 'double precision'
    when 'DECIMAL' then 'double precision'
    when 'BOOLEAN' then 'boolean'
    when 'DATE' then 'date'
    when 'TIMESTAMP' then 'timestamptz'
    else 'text'
  end
$$;
