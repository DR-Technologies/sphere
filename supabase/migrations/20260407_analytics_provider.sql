alter table if exists public.datasets
  add column if not exists normalized_file_url text,
  add column if not exists analytics_manifest_url text,
  add column if not exists normalized_table_name text;

alter table if exists public.datasets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'datasets'
      and policyname = 'datasets_select_own'
  ) then
    create policy datasets_select_own
      on public.datasets
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'datasets'
      and policyname = 'datasets_insert_own'
  ) then
    create policy datasets_insert_own
      on public.datasets
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'datasets'
      and policyname = 'datasets_update_own'
  ) then
    create policy datasets_update_own
      on public.datasets
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'datasets'
      and policyname = 'datasets_delete_own'
  ) then
    create policy datasets_delete_own
      on public.datasets
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

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

revoke all on function public.map_dataset_type_to_pg(text) from public;
revoke all on function public.map_dataset_type_to_pg(text) from anon;
grant execute on function public.map_dataset_type_to_pg(text) to authenticated, service_role;

create or replace function public.sync_normalized_dataset(
  p_dataset_id uuid,
  p_columns jsonb,
  p_rows jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  table_name text;
  create_columns_sql text;
  insert_columns_sql text;
  select_columns_sql text;
begin
  if not exists (
    select 1
    from public.datasets
    where id = p_dataset_id
      and user_id = auth.uid()
  ) then
    raise exception 'Dataset not found or not owned by current user';
  end if;

  table_name := 'dataset_' || replace(p_dataset_id::text, '-', '_');

  select string_agg(
    format('%I %s', column_def->>'name', public.map_dataset_type_to_pg(column_def->>'type')),
    ', '
  )
  into create_columns_sql
  from jsonb_array_elements(p_columns) as column_def;

  execute format('create table if not exists public.%I (%s)', table_name, create_columns_sql);
  execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
  execute format('truncate table public.%I', table_name);

  select string_agg(format('%I', column_def->>'name'), ', ')
  into insert_columns_sql
  from jsonb_array_elements(p_columns) as column_def;

  select string_agg(
    case public.map_dataset_type_to_pg(column_def->>'type')
      when 'bigint' then format('nullif(elem->>%L, '''')::bigint', column_def->>'name')
      when 'double precision' then format('nullif(elem->>%L, '''')::double precision', column_def->>'name')
      when 'boolean' then format('nullif(elem->>%L, '''')::boolean', column_def->>'name')
      when 'date' then format('nullif(elem->>%L, '''')::date', column_def->>'name')
      when 'timestamptz' then format('nullif(elem->>%L, '''')::timestamptz', column_def->>'name')
      else format('nullif(elem->>%L, '''')', column_def->>'name')
    end,
    ', '
  )
  into select_columns_sql
  from jsonb_array_elements(p_columns) as column_def;

  execute format(
    'insert into public.%I (%s) select %s from jsonb_array_elements($1) elem',
    table_name,
    insert_columns_sql,
    select_columns_sql
  )
  using p_rows;

  update public.datasets
  set normalized_table_name = table_name
  where id = p_dataset_id;

  return table_name;
end;
$$;

revoke all on function public.sync_normalized_dataset(uuid, jsonb, jsonb) from public;
revoke all on function public.sync_normalized_dataset(uuid, jsonb, jsonb) from anon;
grant execute on function public.sync_normalized_dataset(uuid, jsonb, jsonb) to authenticated, service_role;

create or replace function public.run_dataset_query(
  p_dataset_id uuid,
  p_query text
)
returns table (row_data jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  table_name text;
  rewritten_query text;
begin
  select normalized_table_name
  into table_name
  from public.datasets
  where id = p_dataset_id
    and user_id = auth.uid();

  if table_name is null then
    raise exception 'Normalized dataset table not found for dataset %', p_dataset_id;
  end if;

  rewritten_query := regexp_replace(p_query, '\mdataset\M', format('public.%I', table_name), 'g');

  return query execute format('select to_jsonb(q) from (%s) q', rewritten_query);
end;
$$;

revoke all on function public.run_dataset_query(uuid, text) from public;
revoke all on function public.run_dataset_query(uuid, text) from anon;
grant execute on function public.run_dataset_query(uuid, text) to authenticated, service_role;

drop function if exists public.map_duckdb_type_to_pg(text);

