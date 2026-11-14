\set ON_ERROR_STOP on
\timing on

set request.jwt.claim.sub = '13000000-0000-0000-0000-000000000001';

insert into auth.users(id) values ('13000000-0000-0000-0000-000000000001');
insert into public.datasets(id, user_id, name, file_url, columns, stats)
values (
  '23000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  '__chunk_large_finalize_local_qa__',
  'qa://local-large-finalize',
  '[
    {"name":"row_id","type":"INTEGER"},
    {"name":"event_date","type":"DATE"},
    {"name":"amount","type":"DOUBLE"},
    {"name":"active","type":"BOOLEAN"},
    {"name":"category","type":"VARCHAR"},
    {"name":"region","type":"VARCHAR"},
    {"name":"customer","type":"VARCHAR"},
    {"name":"contract","type":"VARCHAR"},
    {"name":"description","type":"VARCHAR"},
    {"name":"metric_b","type":"DOUBLE"},
    {"name":"metric_c","type":"INTEGER"},
    {"name":"status","type":"VARCHAR"},
    {"name":"owner","type":"VARCHAR"},
    {"name":"source","type":"VARCHAR"}
  ]'::jsonb,
  (
    select jsonb_agg(jsonb_build_object(
      'column', column_name,
      'type', column_type,
      'total', 514704,
      'nulls', 0,
      'unique', 514704
    ) order by ordinal)
    from (values
      (1, 'row_id', 'INTEGER'),
      (2, 'event_date', 'DATE'),
      (3, 'amount', 'DOUBLE'),
      (4, 'active', 'BOOLEAN'),
      (5, 'category', 'VARCHAR'),
      (6, 'region', 'VARCHAR'),
      (7, 'customer', 'VARCHAR'),
      (8, 'contract', 'VARCHAR'),
      (9, 'description', 'VARCHAR'),
      (10, 'metric_b', 'DOUBLE'),
      (11, 'metric_c', 'INTEGER'),
      (12, 'status', 'VARCHAR'),
      (13, 'owner', 'VARCHAR'),
      (14, 'source', 'VARCHAR')
    ) columns(ordinal, column_name, column_type)
  )
);

do $$
declare
  sync jsonb;
  sync_id uuid;
  chunk_rows jsonb;
  chunk_index integer;
  chunk_start integer;
  chunk_end integer;
  started_at timestamptz;
  completed jsonb;
begin
  sync := public.begin_normalized_dataset_sync('23000000-0000-0000-0000-000000000001', 5000);
  sync_id := (sync->>'session_id')::uuid;
  for chunk_index in 0..((sync->>'expected_chunks')::integer - 1) loop
    chunk_start := chunk_index * 5000 + 1;
    chunk_end := least(514704, chunk_start + 4999);
    select jsonb_agg(jsonb_build_object(
      'row_id', row_number,
      'event_date', to_char(date '2024-01-01' + (row_number % 730), 'YYYY-MM-DD'),
      'amount', row_number * 1.25,
      'active', row_number % 2 = 0,
      'category', 'Category ' || row_number % 31,
      'region', 'Region ' || row_number % 12,
      'customer', 'Customer-' || lpad(row_number::text, 12, '0'),
      'contract', 'Contract-' || row_number % 250,
      'description', repeat('normalized-data-', 5) || row_number,
      'metric_b', row_number * 2.5,
      'metric_c', row_number % 10000,
      'status', case when row_number % 3 = 0 then 'closed' else 'active' end,
      'owner', 'Owner ' || row_number % 50,
      'source', 'Ventas Mensual synthetic persistence'
    ) order by row_number)
    into chunk_rows
    from generate_series(chunk_start, chunk_end) row_number;
    perform public.append_normalized_dataset_rows(sync_id, chunk_index, chunk_rows);
  end loop;

  started_at := clock_timestamp();
  completed := public.complete_normalized_dataset_sync(sync_id);
  raise notice 'LARGE_FINALIZE_DURATION_MS=%',
    round(extract(epoch from (clock_timestamp() - started_at)) * 1000);
  raise notice 'LARGE_FINALIZE_TIMINGS=%', completed->'timings_ms';
  if (completed->>'row_count')::integer <> 514704 then
    raise exception 'Large completion row count mismatch';
  end if;
end;
$$;

delete from public.datasets where id = '23000000-0000-0000-0000-000000000001';
delete from auth.users where id = '13000000-0000-0000-0000-000000000001';

select 'chunked sync large finalize passed' as result;
