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
