begin;

alter table public.normalized_dataset_sync_sessions
  add column if not exists staging_immutable boolean not null default false;

create or replace function public.reject_normalized_dataset_staging_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Normalized dataset staging rows are immutable after persistence'
    using errcode = '55000';
end;
$$;

revoke all on function public.reject_normalized_dataset_staging_mutation() from public, anon, authenticated;

create or replace function public.begin_normalized_dataset_sync(
  p_dataset_id uuid,
  p_chunk_size integer default 5000
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  dataset_record public.datasets%rowtype;
  session_id uuid := gen_random_uuid();
  staging_name text;
  create_columns_sql text;
  expected_rows_min bigint;
  expected_rows_max bigint;
  stats_count integer;
  expected_chunks integer;
  columns_checksum text;
  column_count integer;
  distinct_column_count integer;
begin
  if auth.uid() is null then raise exception 'Authenticated session required'; end if;
  if p_chunk_size < 1 or p_chunk_size > 10000 then raise exception 'Invalid normalized dataset chunk size'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_dataset_id::text, 0));
  select * into dataset_record
  from public.datasets
  where id = p_dataset_id and user_id = auth.uid()
  for update;
  if not found then raise exception 'Dataset not found or not owned by current user'; end if;
  if jsonb_typeof(dataset_record.columns) <> 'array' or jsonb_array_length(dataset_record.columns) = 0 then
    raise exception 'Dataset columns are missing or invalid';
  end if;

  select count(*), count(distinct column_def->>'name')
  into column_count, distinct_column_count
  from jsonb_array_elements(dataset_record.columns) with ordinality as column_entry(column_def, ordinal);
  if column_count <> distinct_column_count
    or exists (
      select 1
      from jsonb_array_elements(dataset_record.columns) with ordinality as column_entry(column_def, ordinal)
      where nullif(btrim(column_def->>'name'), '') is null
        or column_def->>'name' in ('_sphere_chunk_index', '_sphere_row_index')
    ) then
    raise exception 'Dataset columns contain duplicate, blank, or reserved names';
  end if;

  select min((stat->>'total')::bigint), max((stat->>'total')::bigint), count(*)
  into expected_rows_min, expected_rows_max, stats_count
  from jsonb_array_elements(coalesce(dataset_record.stats, '[]'::jsonb)) as stat
  where stat ? 'total';
  if stats_count <> column_count
    or expected_rows_min is null
    or expected_rows_min <> expected_rows_max
    or expected_rows_min < 0 then
    raise exception 'Dataset profile row totals are missing or inconsistent';
  end if;

  expected_chunks := case when expected_rows_min = 0 then 0 else ceil(expected_rows_min::numeric / p_chunk_size)::integer end;
  columns_checksum := md5(dataset_record.columns::text);
  staging_name := public.normalized_dataset_staging_table_name(session_id);

  select string_agg(
    format('%I %s', column_def->>'name', public.map_dataset_type_to_pg(column_def->>'type')),
    ', ' order by ordinal
  ) into create_columns_sql
  from jsonb_array_elements(dataset_record.columns) with ordinality as column_entry(column_def, ordinal);

  execute format(
    'create table public.%I (' ||
    '"_sphere_chunk_index" integer not null, ' ||
    '"_sphere_row_index" integer not null, %s, ' ||
    'primary key ("_sphere_chunk_index", "_sphere_row_index"))',
    staging_name, create_columns_sql
  );
  execute format('revoke all on table public.%I from public, anon, authenticated', staging_name);
  execute format(
    'create trigger normalized_staging_reject_mutation ' ||
    'before update or delete or truncate on public.%I ' ||
    'for each statement execute function public.reject_normalized_dataset_staging_mutation()',
    staging_name
  );

  insert into public.normalized_dataset_sync_sessions (
    id, dataset_id, user_id, staging_table_name, base_generation,
    expected_rows, expected_chunks, chunk_size, columns_snapshot, columns_checksum,
    staging_immutable
  ) values (
    session_id, p_dataset_id, auth.uid(), staging_name, dataset_record.normalized_sync_generation,
    expected_rows_min, expected_chunks, p_chunk_size, dataset_record.columns, columns_checksum,
    true
  );

  return jsonb_build_object(
    'session_id', session_id, 'staging_table_name', staging_name,
    'expected_rows', expected_rows_min, 'expected_chunks', expected_chunks,
    'chunk_size', p_chunk_size, 'base_generation', dataset_record.normalized_sync_generation,
    'columns_checksum', columns_checksum
  );
end;
$$;

create or replace function public.complete_normalized_dataset_sync(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  session_record public.normalized_dataset_sync_sessions%rowtype;
  dataset_record public.datasets%rowtype;
  target_name text;
  insert_columns_sql text;
  actual_rows bigint;
  actual_chunks integer;
  confirmed_rows bigint;
  confirmed_chunks integer;
  min_chunk integer;
  max_chunk integer;
  integrity_mismatches integer;
  final_content_checksum text;
  total_started_at timestamptz := clock_timestamp();
  phase_started_at timestamptz;
  reconciliation_ms numeric := 0;
  checksum_ms numeric := 0;
  replacement_ms numeric := 0;
  metadata_ms numeric := 0;
  total_ms numeric := 0;
begin
  if auth.uid() is null then raise exception 'Authenticated session required'; end if;

  select * into session_record
  from public.normalized_dataset_sync_sessions
  where id = p_session_id and user_id = auth.uid();
  if not found then raise exception 'Normalized dataset sync session not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || session_record.dataset_id::text, 0));
  select * into session_record
  from public.normalized_dataset_sync_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;

  if session_record.status = 'completed' then
    select * into dataset_record
    from public.datasets
    where id = session_record.dataset_id and user_id = auth.uid();
    return jsonb_build_object(
      'session_id', p_session_id,
      'table_name', dataset_record.normalized_table_name,
      'row_count', session_record.expected_rows,
      'chunk_count', session_record.expected_chunks,
      'content_checksum', session_record.content_checksum,
      'generation', dataset_record.normalized_sync_generation,
      'replayed', true,
      'timings_ms', jsonb_build_object(
        'reconciliation', 0,
        'checksum', 0,
        'replacement', 0,
        'metadata', 0,
        'total', round(extract(epoch from (clock_timestamp() - total_started_at)) * 1000, 3)
      )
    );
  end if;
  if session_record.status <> 'active' then
    raise exception 'Normalized dataset sync session is not active: %', session_record.status;
  end if;

  select * into dataset_record
  from public.datasets
  where id = session_record.dataset_id and user_id = auth.uid()
  for update;
  if not found then raise exception 'Dataset not found or not owned by current user'; end if;
  if dataset_record.normalized_sync_generation <> session_record.base_generation then
    raise exception 'Normalized dataset sync session is stale; a newer session already completed';
  end if;
  if md5(dataset_record.columns::text) <> session_record.columns_checksum
    or md5(session_record.columns_snapshot::text) <> session_record.columns_checksum then
    raise exception 'Dataset columns changed during normalized sync';
  end if;
  if to_regclass(format('public.%I', session_record.staging_table_name)) is null then
    raise exception 'Normalized dataset staging table is missing for session %', p_session_id;
  end if;

  raise log 'sphere normalized finalize session=% phase=reconciliation_start expected_rows=% expected_chunks=%',
    p_session_id, session_record.expected_rows, session_record.expected_chunks;
  phase_started_at := clock_timestamp();

  if session_record.staging_immutable then
    -- Every append already hashes all typed values after persistence. New staging
    -- tables reject UPDATE/DELETE/TRUNCATE, so finalization only needs to reconcile
    -- physical row positions with the immutable chunk ledger.
    execute format(
      'select ' ||
      'count(actual.chunk_index)::integer, ' ||
      'coalesce(sum(actual.row_count), 0)::bigint, ' ||
      'count(confirmed.chunk_index)::integer, ' ||
      'coalesce(sum(confirmed.row_count), 0)::bigint, ' ||
      'min(actual.chunk_index)::integer, max(actual.chunk_index)::integer, ' ||
      'count(*) filter (where actual.chunk_index is null ' ||
        'or confirmed.chunk_index is null ' ||
        'or actual.row_count <> confirmed.row_count ' ||
        'or actual.min_row_index <> 0 ' ||
        'or actual.max_row_index <> confirmed.row_count - 1 ' ||
        'or confirmed.payload_checksum <> confirmed.persisted_checksum)::integer ' ||
      'from (' ||
        'select "_sphere_chunk_index" as chunk_index, count(*)::bigint as row_count, ' ||
          'min("_sphere_row_index")::integer as min_row_index, ' ||
          'max("_sphere_row_index")::integer as max_row_index ' ||
        'from public.%I group by "_sphere_chunk_index"' ||
      ') actual ' ||
      'full join (' ||
        'select chunk_index, row_count, payload_checksum, persisted_checksum ' ||
        'from public.normalized_dataset_sync_chunks where session_id = $1' ||
      ') confirmed using (chunk_index)',
      session_record.staging_table_name
    ) into
      actual_chunks, actual_rows, confirmed_chunks, confirmed_rows,
      min_chunk, max_chunk, integrity_mismatches
    using p_session_id;
  else
    -- Sessions started before this migration were mutable. Preserve the previous
    -- all-column reconciliation for those sessions rather than weakening their
    -- integrity contract retroactively.
    execute format(
      'select ' ||
      'count(actual.chunk_index)::integer, ' ||
      'coalesce(sum(actual.row_count), 0)::bigint, ' ||
      'count(confirmed.chunk_index)::integer, ' ||
      'coalesce(sum(confirmed.row_count), 0)::bigint, ' ||
      'min(actual.chunk_index)::integer, max(actual.chunk_index)::integer, ' ||
      'count(*) filter (where actual.chunk_index is null ' ||
        'or confirmed.chunk_index is null ' ||
        'or actual.row_count <> confirmed.row_count ' ||
        'or actual.persisted_checksum <> confirmed.persisted_checksum ' ||
        'or confirmed.payload_checksum <> confirmed.persisted_checksum)::integer ' ||
      'from (' ||
        'select staging_row."_sphere_chunk_index" as chunk_index, ' ||
          'count(*)::bigint as row_count, ' ||
          'md5(coalesce(string_agg(' ||
            '(to_jsonb(staging_row) - ''_sphere_chunk_index'' - ''_sphere_row_index'')::text, ' ||
            ''''' order by staging_row."_sphere_row_index"), '''')) as persisted_checksum ' ||
        'from public.%I staging_row ' ||
        'group by staging_row."_sphere_chunk_index"' ||
      ') actual ' ||
      'full join (' ||
        'select chunk_index, row_count, payload_checksum, persisted_checksum ' ||
        'from public.normalized_dataset_sync_chunks where session_id = $1' ||
      ') confirmed using (chunk_index)',
      session_record.staging_table_name
    ) into
      actual_chunks, actual_rows, confirmed_chunks, confirmed_rows,
      min_chunk, max_chunk, integrity_mismatches
    using p_session_id;
  end if;

  if actual_chunks <> session_record.expected_chunks
    or confirmed_chunks <> session_record.expected_chunks
    or actual_rows <> session_record.expected_rows
    or confirmed_rows <> session_record.expected_rows
    or session_record.appended_chunks <> session_record.expected_chunks
    or session_record.appended_rows <> session_record.expected_rows
    or integrity_mismatches <> 0
    or (session_record.expected_chunks > 0
      and (min_chunk <> 0 or max_chunk <> session_record.expected_chunks - 1)) then
    raise exception 'Normalized dataset sync integrity mismatch: expected % rows in % chunks, staging %/% confirmed %/%, mismatches %',
      session_record.expected_rows, session_record.expected_chunks,
      actual_rows, actual_chunks, confirmed_rows, confirmed_chunks, integrity_mismatches;
  end if;

  reconciliation_ms := round(extract(epoch from (clock_timestamp() - phase_started_at)) * 1000, 3);
  raise log 'sphere normalized finalize session=% phase=reconciliation_done duration_ms=%',
    p_session_id, reconciliation_ms;

  phase_started_at := clock_timestamp();
  select md5(coalesce(string_agg(
    format('%s:%s:%s', chunk_index, row_count, persisted_checksum),
    '|' order by chunk_index
  ), '')) into final_content_checksum
  from public.normalized_dataset_sync_chunks
  where session_id = p_session_id;
  checksum_ms := round(extract(epoch from (clock_timestamp() - phase_started_at)) * 1000, 3);
  raise log 'sphere normalized finalize session=% phase=checksum_done duration_ms=% checksum=%',
    p_session_id, checksum_ms, final_content_checksum;

  select string_agg(format('%I', column_def->>'name'), ', ' order by ordinal)
  into insert_columns_sql
  from jsonb_array_elements(session_record.columns_snapshot)
    with ordinality as column_entry(column_def, ordinal);

  target_name := public.normalized_dataset_table_name(session_record.dataset_id);
  if dataset_record.normalized_table_name is not null
    and dataset_record.normalized_table_name <> target_name then
    raise exception 'Dataset references an unexpected normalized table; refusing replacement';
  end if;

  raise log 'sphere normalized finalize session=% phase=replacement_start target=%', p_session_id, target_name;
  phase_started_at := clock_timestamp();
  if to_regclass(format('public.%I', target_name)) is null then
    if session_record.staging_immutable then
      execute format(
        'drop trigger normalized_staging_reject_mutation on public.%I',
        session_record.staging_table_name
      );
    end if;
    execute format(
      'alter table public.%I drop column "_sphere_chunk_index", drop column "_sphere_row_index"',
      session_record.staging_table_name
    );
    execute format('alter table public.%I rename to %I', session_record.staging_table_name, target_name);
  else
    -- Preserve the definitive table identity and any valid dependencies. The
    -- replacement remains atomic because TRUNCATE and INSERT share this transaction.
    execute format('lock table public.%I in access exclusive mode', target_name);
    execute format('truncate table public.%I', target_name);
    execute format(
      'insert into public.%I (%s) select %s from public.%I',
      target_name, insert_columns_sql, insert_columns_sql, session_record.staging_table_name
    );
    execute format('drop table public.%I', session_record.staging_table_name);
  end if;
  execute format('revoke all on table public.%I from public, anon, authenticated', target_name);
  replacement_ms := round(extract(epoch from (clock_timestamp() - phase_started_at)) * 1000, 3);
  raise log 'sphere normalized finalize session=% phase=replacement_done duration_ms=%',
    p_session_id, replacement_ms;

  phase_started_at := clock_timestamp();
  update public.datasets
  set normalized_table_name = target_name,
      normalized_sync_generation = normalized_sync_generation + 1,
      normalized_row_count = session_record.expected_rows,
      normalized_content_checksum = final_content_checksum
  where id = session_record.dataset_id and user_id = auth.uid();
  update public.normalized_dataset_sync_sessions
  set status = 'completed', content_checksum = final_content_checksum,
      completed_at = now(), updated_at = now()
  where id = p_session_id;
  update public.normalized_dataset_sync_sessions
  set status = 'superseded', updated_at = now()
  where dataset_id = session_record.dataset_id and id <> p_session_id and status = 'active';
  metadata_ms := round(extract(epoch from (clock_timestamp() - phase_started_at)) * 1000, 3);
  total_ms := round(extract(epoch from (clock_timestamp() - total_started_at)) * 1000, 3);
  raise log 'sphere normalized finalize session=% phase=completed metadata_ms=% total_ms=%',
    p_session_id, metadata_ms, total_ms;

  return jsonb_build_object(
    'session_id', p_session_id,
    'table_name', target_name,
    'row_count', session_record.expected_rows,
    'chunk_count', session_record.expected_chunks,
    'content_checksum', final_content_checksum,
    'generation', session_record.base_generation + 1,
    'replayed', false,
    'timings_ms', jsonb_build_object(
      'reconciliation', reconciliation_ms,
      'checksum', checksum_ms,
      'replacement', replacement_ms,
      'metadata', metadata_ms,
      'total', total_ms
    )
  );
end;
$$;

-- Remove the temporary per-function timeout override. The optimized function
-- must complete under the normal API budget; no role/database timeout is raised.
alter function public.complete_normalized_dataset_sync(uuid) reset statement_timeout;

revoke all on function public.complete_normalized_dataset_sync(uuid) from public, anon;
revoke all on function public.begin_normalized_dataset_sync(uuid, integer) from public, anon;
grant execute on function public.complete_normalized_dataset_sync(uuid) to authenticated;
grant execute on function public.begin_normalized_dataset_sync(uuid, integer) to authenticated;

commit;
