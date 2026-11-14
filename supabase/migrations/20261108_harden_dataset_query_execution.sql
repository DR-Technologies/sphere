begin;

create or replace function public.run_dataset_query(
  p_dataset_id uuid,
  p_query text
)
returns table (row_data jsonb)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  table_name text;
  rewritten_query text;
  started_at timestamptz := clock_timestamp();
  duration_ms numeric;
  error_state text;
  error_message text;
  error_detail text;
  error_hint text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required' using errcode = '28000';
  end if;

  select normalized_table_name
  into table_name
  from public.datasets
  where id = p_dataset_id
    and user_id = auth.uid();

  if table_name is null then
    raise exception 'Normalized dataset table not found for dataset %', p_dataset_id
      using errcode = '42P01';
  end if;
  if to_regclass(format('public.%I', table_name)) is null then
    raise exception 'Normalized dataset relation % is missing', table_name
      using errcode = '42P01';
  end if;
  if p_query is null or p_query !~* '^[[:space:]]*select[[:space:]]' then
    raise exception 'Only generated SELECT dataset queries are supported'
      using errcode = '22023';
  end if;

  rewritten_query := regexp_replace(p_query, '\mdataset\M', format('public.%I', table_name), 'g');

  begin
    return query execute format('select to_jsonb(q) from (%s) q', rewritten_query);
  exception
    when sqlstate '57014' then
      get stacked diagnostics
        error_state = returned_sqlstate,
        error_message = message_text,
        error_detail = pg_exception_detail,
        error_hint = pg_exception_hint;
      raise log 'sphere dataset query failed dataset=% table=% query_hash=% duration_ms=% code=% message=% detail=% hint=%',
        p_dataset_id, table_name, md5(p_query),
        round(extract(epoch from (clock_timestamp() - started_at)) * 1000, 3),
        error_state, error_message, error_detail, error_hint;
      raise;
    when others then
      get stacked diagnostics
        error_state = returned_sqlstate,
        error_message = message_text,
        error_detail = pg_exception_detail,
        error_hint = pg_exception_hint;
      raise log 'sphere dataset query failed dataset=% table=% query_hash=% duration_ms=% code=% message=% detail=% hint=%',
        p_dataset_id, table_name, md5(p_query),
        round(extract(epoch from (clock_timestamp() - started_at)) * 1000, 3),
        error_state, error_message, error_detail, error_hint;
      raise;
  end;

  duration_ms := round(extract(epoch from (clock_timestamp() - started_at)) * 1000, 3);
  if duration_ms >= 500 then
    raise log 'sphere dataset query slow dataset=% table=% query_hash=% duration_ms=%',
      p_dataset_id, table_name, md5(p_query), duration_ms;
  end if;
end;
$$;

revoke all on function public.run_dataset_query(uuid, text) from public, anon;
grant execute on function public.run_dataset_query(uuid, text) to authenticated, service_role;

commit;
