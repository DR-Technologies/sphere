begin;

alter table public.datasets
  add column if not exists normalized_sync_generation bigint not null default 0,
  add column if not exists normalized_row_count bigint,
  add column if not exists normalized_content_checksum text;

create table if not exists public.normalized_dataset_sync_sessions (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staging_table_name text not null unique,
  status text not null default 'active'
    check (status in ('active', 'completed', 'aborted', 'superseded')),
  base_generation bigint not null,
  expected_rows bigint not null check (expected_rows >= 0),
  expected_chunks integer not null check (expected_chunks >= 0),
  chunk_size integer not null check (chunk_size between 1 and 10000),
  columns_snapshot jsonb not null,
  columns_checksum text not null,
  appended_rows bigint not null default 0,
  appended_chunks integer not null default 0,
  content_checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  aborted_at timestamptz,
  staging_cleaned_at timestamptz,
  staging_cleanup_result text
);

create table if not exists public.normalized_dataset_sync_chunks (
  session_id uuid not null references public.normalized_dataset_sync_sessions(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  row_count integer not null check (row_count > 0),
  payload_checksum text not null,
  persisted_checksum text not null,
  created_at timestamptz not null default now(),
  primary key (session_id, chunk_index),
  check (payload_checksum = persisted_checksum)
);

create table if not exists public.normalized_dataset_sync_cleanup_log (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  dataset_id uuid not null,
  user_id uuid not null,
  previous_status text not null,
  staging_table_name text not null,
  result text not null
    check (result in (
      'dropped',
      'already_missing',
      'skipped_recent_activity',
      'skipped_state_changed',
      'rejected_invalid_staging_name',
      'failed'
    )),
  details text,
  attempted_at timestamptz not null default now()
);

create index if not exists normalized_dataset_sync_sessions_dataset_status_idx
  on public.normalized_dataset_sync_sessions(dataset_id, status, updated_at desc);
create index if not exists normalized_dataset_sync_sessions_cleanup_idx
  on public.normalized_dataset_sync_sessions(status, updated_at)
  where staging_cleaned_at is null and status in ('active', 'aborted', 'superseded');
create index if not exists normalized_dataset_sync_cleanup_log_session_idx
  on public.normalized_dataset_sync_cleanup_log(session_id, attempted_at desc);

alter table public.normalized_dataset_sync_sessions enable row level security;
alter table public.normalized_dataset_sync_chunks enable row level security;
alter table public.normalized_dataset_sync_cleanup_log enable row level security;
revoke all on table public.normalized_dataset_sync_sessions from public, anon, authenticated;
revoke all on table public.normalized_dataset_sync_chunks from public, anon, authenticated;
revoke all on table public.normalized_dataset_sync_cleanup_log from public, anon, authenticated;
grant select, insert, update, delete on table public.normalized_dataset_sync_sessions to service_role;
grant select, insert, update, delete on table public.normalized_dataset_sync_chunks to service_role;
grant select on table public.normalized_dataset_sync_cleanup_log to service_role;

-- Remove the unsafe prototype signatures if this file is reapplied only in an
-- isolated development database. This migration has not shipped to production.
drop function if exists public.begin_normalized_dataset_sync(uuid);
drop function if exists public.append_normalized_dataset_rows(uuid, jsonb);
drop function if exists public.complete_normalized_dataset_sync(uuid, integer);
drop function if exists public.abort_normalized_dataset_sync(uuid);
drop function if exists public.normalized_dataset_table_name(uuid, boolean);

create or replace function public.normalized_dataset_table_name(p_dataset_id uuid)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select 'dataset_' || replace(p_dataset_id::text, '-', '_')
$$;

create or replace function public.normalized_dataset_staging_table_name(p_session_id uuid)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select 'dataset_staging_' || md5(p_session_id::text)
$$;

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

  insert into public.normalized_dataset_sync_sessions (
    id, dataset_id, user_id, staging_table_name, base_generation,
    expected_rows, expected_chunks, chunk_size, columns_snapshot, columns_checksum
  ) values (
    session_id, p_dataset_id, auth.uid(), staging_name, dataset_record.normalized_sync_generation,
    expected_rows_min, expected_chunks, p_chunk_size, dataset_record.columns, columns_checksum
  );

  return jsonb_build_object(
    'session_id', session_id, 'staging_table_name', staging_name,
    'expected_rows', expected_rows_min, 'expected_chunks', expected_chunks,
    'chunk_size', p_chunk_size, 'base_generation', dataset_record.normalized_sync_generation,
    'columns_checksum', columns_checksum
  );
end;
$$;

create or replace function public.append_normalized_dataset_rows(
  p_session_id uuid,
  p_chunk_index integer,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  session_record public.normalized_dataset_sync_sessions%rowtype;
  existing_chunk public.normalized_dataset_sync_chunks%rowtype;
  expected_chunk_rows integer;
  received_rows integer;
  insert_columns_sql text;
  typed_select_columns_sql text;
  expected_checksum text;
  actual_checksum text;
  actual_chunk_rows bigint;
begin
  if auth.uid() is null then raise exception 'Authenticated session required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Chunk rows must be a JSON array'; end if;

  select * into session_record
  from public.normalized_dataset_sync_sessions
  where id = p_session_id and user_id = auth.uid();
  if not found then raise exception 'Normalized dataset sync session not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || session_record.dataset_id::text, 0));
  select * into session_record
  from public.normalized_dataset_sync_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;
  if session_record.status <> 'active' then
    raise exception 'Normalized dataset sync session is not active: %', session_record.status;
  end if;
  if md5(session_record.columns_snapshot::text) <> session_record.columns_checksum then
    raise exception 'Normalized dataset sync column contract was corrupted';
  end if;
  if p_chunk_index < 0 or p_chunk_index >= session_record.expected_chunks then
    raise exception 'Chunk index % is outside expected range 0..%', p_chunk_index, session_record.expected_chunks - 1;
  end if;

  expected_chunk_rows := least(
    session_record.chunk_size,
    session_record.expected_rows - (p_chunk_index::bigint * session_record.chunk_size)
  )::integer;
  received_rows := jsonb_array_length(p_rows);
  if received_rows <> expected_chunk_rows then
    raise exception 'Chunk % row count mismatch: expected %, received %', p_chunk_index, expected_chunk_rows, received_rows;
  end if;
  if to_regclass(format('public.%I', session_record.staging_table_name)) is null then
    raise exception 'Normalized dataset staging table is missing for session %', p_session_id;
  end if;

  select
    string_agg(format('%I', column_def->>'name'), ', ' order by ordinal),
    string_agg(
      case public.map_dataset_type_to_pg(column_def->>'type')
        when 'bigint' then format('nullif(source.elem->>%L, '''')::bigint as %I', column_def->>'name', column_def->>'name')
        when 'double precision' then format('nullif(source.elem->>%L, '''')::double precision as %I', column_def->>'name', column_def->>'name')
        when 'boolean' then format('nullif(source.elem->>%L, '''')::boolean as %I', column_def->>'name', column_def->>'name')
        when 'date' then format('nullif(source.elem->>%L, '''')::date as %I', column_def->>'name', column_def->>'name')
        when 'timestamptz' then format('nullif(source.elem->>%L, '''')::timestamptz as %I', column_def->>'name', column_def->>'name')
        else format('nullif(source.elem->>%L, '''') as %I', column_def->>'name', column_def->>'name')
      end,
      ', ' order by ordinal
    )
  into insert_columns_sql, typed_select_columns_sql
  from jsonb_array_elements(session_record.columns_snapshot) with ordinality as column_entry(column_def, ordinal);

  execute format(
    'select md5(coalesce(string_agg((to_jsonb(typed_row) - ''_sphere_ordinal'')::text, '''' order by typed_row."_sphere_ordinal"), '''')) ' ||
    'from (select %s, source.row_ordinal::bigint as "_sphere_ordinal" ' ||
    'from jsonb_array_elements($1) with ordinality as source(elem, row_ordinal)) typed_row',
    typed_select_columns_sql
  ) into expected_checksum using p_rows;

  select * into existing_chunk
  from public.normalized_dataset_sync_chunks
  where session_id = p_session_id and chunk_index = p_chunk_index;
  if found then
    if existing_chunk.payload_checksum <> expected_checksum or existing_chunk.row_count <> received_rows then
      raise exception 'Chunk % was already confirmed with different data', p_chunk_index;
    end if;
    execute format(
      'select count(*), md5(coalesce(string_agg((to_jsonb(staging_row) - ''_sphere_chunk_index'' - ''_sphere_row_index'')::text, '''' order by "_sphere_row_index"), '''')) ' ||
      'from public.%I staging_row where "_sphere_chunk_index" = $1',
      session_record.staging_table_name
    ) into actual_chunk_rows, actual_checksum using p_chunk_index;
    if actual_chunk_rows <> existing_chunk.row_count or actual_checksum <> existing_chunk.persisted_checksum then
      raise exception 'Previously confirmed chunk % failed persisted integrity validation', p_chunk_index;
    end if;
    return jsonb_build_object(
      'session_id', p_session_id, 'chunk_index', p_chunk_index,
      'row_count', existing_chunk.row_count, 'checksum', existing_chunk.persisted_checksum,
      'replayed', true
    );
  end if;

  execute format(
    'insert into public.%I ("_sphere_chunk_index", "_sphere_row_index", %s) ' ||
    'select $2, (source.row_ordinal - 1)::integer, %s ' ||
    'from jsonb_array_elements($1) with ordinality as source(elem, row_ordinal)',
    session_record.staging_table_name, insert_columns_sql, typed_select_columns_sql
  ) using p_rows, p_chunk_index;

  execute format(
    'select count(*), md5(coalesce(string_agg((to_jsonb(staging_row) - ''_sphere_chunk_index'' - ''_sphere_row_index'')::text, '''' order by "_sphere_row_index"), '''')) ' ||
    'from public.%I staging_row where "_sphere_chunk_index" = $1',
    session_record.staging_table_name
  ) into actual_chunk_rows, actual_checksum using p_chunk_index;
  if actual_chunk_rows <> received_rows or actual_checksum <> expected_checksum then
    raise exception 'Chunk % failed all-column persistence integrity validation', p_chunk_index;
  end if;

  insert into public.normalized_dataset_sync_chunks (
    session_id, chunk_index, row_count, payload_checksum, persisted_checksum
  ) values (p_session_id, p_chunk_index, received_rows, expected_checksum, actual_checksum);
  update public.normalized_dataset_sync_sessions
  set appended_rows = appended_rows + received_rows,
      appended_chunks = appended_chunks + 1,
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'session_id', p_session_id, 'chunk_index', p_chunk_index,
    'row_count', received_rows, 'checksum', actual_checksum, 'replayed', false
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
  chunk_count integer;
  chunk_rows bigint;
  min_chunk integer;
  max_chunk integer;
  chunk_record public.normalized_dataset_sync_chunks%rowtype;
  actual_chunk_rows bigint;
  actual_chunk_checksum text;
  final_content_checksum text;
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

  select count(*), coalesce(sum(row_count), 0), min(chunk_index), max(chunk_index)
  into chunk_count, chunk_rows, min_chunk, max_chunk
  from public.normalized_dataset_sync_chunks
  where session_id = p_session_id;
  if chunk_count <> session_record.expected_chunks
    or chunk_rows <> session_record.expected_rows
    or session_record.appended_chunks <> session_record.expected_chunks
    or session_record.appended_rows <> session_record.expected_rows
    or (session_record.expected_chunks > 0 and (min_chunk <> 0 or max_chunk <> session_record.expected_chunks - 1)) then
    raise exception 'Normalized dataset sync is incomplete: expected % rows in % chunks, confirmed % rows in % chunks',
      session_record.expected_rows, session_record.expected_chunks, chunk_rows, chunk_count;
  end if;

  execute format('select count(*) from public.%I', session_record.staging_table_name) into actual_rows;
  if actual_rows <> session_record.expected_rows then
    raise exception 'Normalized dataset staging row count mismatch: expected %, persisted %', session_record.expected_rows, actual_rows;
  end if;

  for chunk_record in
    select * from public.normalized_dataset_sync_chunks
    where session_id = p_session_id order by chunk_index
  loop
    execute format(
      'select count(*), md5(coalesce(string_agg((to_jsonb(staging_row) - ''_sphere_chunk_index'' - ''_sphere_row_index'')::text, '''' order by "_sphere_row_index"), '''')) ' ||
      'from public.%I staging_row where "_sphere_chunk_index" = $1',
      session_record.staging_table_name
    ) into actual_chunk_rows, actual_chunk_checksum using chunk_record.chunk_index;
    if actual_chunk_rows <> chunk_record.row_count
      or actual_chunk_checksum <> chunk_record.persisted_checksum
      or chunk_record.payload_checksum <> chunk_record.persisted_checksum then
      raise exception 'Normalized dataset chunk % failed final integrity validation', chunk_record.chunk_index;
    end if;
  end loop;

  select md5(coalesce(string_agg(
    format('%s:%s:%s', chunk_index, row_count, persisted_checksum),
    '|' order by chunk_index
  ), '')) into final_content_checksum
  from public.normalized_dataset_sync_chunks
  where session_id = p_session_id;

  select string_agg(format('%I', column_def->>'name'), ', ' order by ordinal)
  into insert_columns_sql
  from jsonb_array_elements(session_record.columns_snapshot) with ordinality as column_entry(column_def, ordinal);

  target_name := public.normalized_dataset_table_name(session_record.dataset_id);
  if dataset_record.normalized_table_name is not null
    and dataset_record.normalized_table_name <> target_name then
    raise exception 'Dataset references an unexpected normalized table; refusing replacement';
  end if;

  if to_regclass(format('public.%I', target_name)) is null then
    execute format('alter table public.%I drop column "_sphere_chunk_index", drop column "_sphere_row_index"', session_record.staging_table_name);
    execute format('alter table public.%I rename to %I', session_record.staging_table_name, target_name);
  else
    execute format('lock table public.%I in access exclusive mode', target_name);
    execute format('truncate table public.%I', target_name);
    execute format(
      'insert into public.%I (%s) select %s from public.%I order by "_sphere_chunk_index", "_sphere_row_index"',
      target_name, insert_columns_sql, insert_columns_sql, session_record.staging_table_name
    );
    execute format('drop table public.%I', session_record.staging_table_name);
  end if;
  execute format('revoke all on table public.%I from public, anon, authenticated', target_name);

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

  return jsonb_build_object(
    'session_id', p_session_id, 'table_name', target_name,
    'row_count', session_record.expected_rows, 'chunk_count', session_record.expected_chunks,
    'content_checksum', final_content_checksum, 'generation', session_record.base_generation + 1
  );
end;
$$;

create or replace function public.abort_normalized_dataset_sync(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  session_record public.normalized_dataset_sync_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authenticated session required'; end if;
  select * into session_record
  from public.normalized_dataset_sync_sessions
  where id = p_session_id and user_id = auth.uid();
  if not found then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || session_record.dataset_id::text, 0));
  select * into session_record
  from public.normalized_dataset_sync_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;
  if session_record.status = 'completed' then return false; end if;
  if session_record.status = 'aborted' then return true; end if;
  if session_record.staging_table_name !~ '^dataset_staging_[0-9a-f]{32}$' then
    raise exception 'Invalid normalized dataset staging table name';
  end if;

  execute format('drop table if exists public.%I', session_record.staging_table_name);
  update public.normalized_dataset_sync_sessions
  set status = 'aborted', aborted_at = now(), updated_at = now()
  where id = p_session_id;
  return true;
end;
$$;

create or replace function public.cleanup_abandoned_normalized_dataset_sync(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  stale_before constant timestamptz := now() - interval '24 hours';
  candidate record;
  session_record public.normalized_dataset_sync_sessions%rowtype;
  expected_staging_name text;
  staging_exists boolean;
  cleanup_result text;
  cleanup_details text;
  inspected_count integer := 0;
  cleaned_count integer := 0;
  skipped_count integer := 0;
  failed_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'Cleanup limit must be between 1 and 1000';
  end if;

  for candidate in
    select id, dataset_id, user_id
    from public.normalized_dataset_sync_sessions
    where status in ('active', 'aborted', 'superseded')
      and staging_cleaned_at is null
      and updated_at < stale_before
    order by updated_at, id
    limit p_limit
  loop
    inspected_count := inspected_count + 1;
    perform pg_advisory_xact_lock(hashtextextended(candidate.user_id::text || ':' || candidate.dataset_id::text, 0));

    select * into session_record
    from public.normalized_dataset_sync_sessions
    where id = candidate.id
    for update;
    if not found then
      continue;
    end if;

    if session_record.status not in ('active', 'aborted', 'superseded')
      or session_record.staging_cleaned_at is not null then
      insert into public.normalized_dataset_sync_cleanup_log (
        session_id, dataset_id, user_id, previous_status,
        staging_table_name, result, details
      ) values (
        session_record.id, session_record.dataset_id, session_record.user_id, session_record.status,
        session_record.staging_table_name, 'skipped_state_changed',
        'Session state changed after candidate selection.'
      );
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if session_record.updated_at >= stale_before then
      insert into public.normalized_dataset_sync_cleanup_log (
        session_id, dataset_id, user_id, previous_status,
        staging_table_name, result, details
      ) values (
        session_record.id, session_record.dataset_id, session_record.user_id, session_record.status,
        session_record.staging_table_name, 'skipped_recent_activity',
        'Session activity was refreshed while cleanup waited for its lock.'
      );
      skipped_count := skipped_count + 1;
      continue;
    end if;

    expected_staging_name := public.normalized_dataset_staging_table_name(session_record.id);
    if session_record.staging_table_name <> expected_staging_name
      or session_record.staging_table_name !~ '^dataset_staging_[0-9a-f]{32}$'
      or session_record.staging_table_name = public.normalized_dataset_table_name(session_record.dataset_id) then
      insert into public.normalized_dataset_sync_cleanup_log (
        session_id, dataset_id, user_id, previous_status,
        staging_table_name, result, details
      ) values (
        session_record.id, session_record.dataset_id, session_record.user_id, session_record.status,
        session_record.staging_table_name, 'rejected_invalid_staging_name',
        'Stored table name does not match the staging table derived from the session id.'
      );
      skipped_count := skipped_count + 1;
      continue;
    end if;

    staging_exists := to_regclass(format('public.%I', session_record.staging_table_name)) is not null;
    cleanup_result := case when staging_exists then 'dropped' else 'already_missing' end;
    cleanup_details := case
      when staging_exists then 'Abandoned staging table dropped.'
      else 'Staging table was already absent; session metadata reconciled.'
    end;

    begin
      if staging_exists then
        execute format('drop table public.%I', session_record.staging_table_name);
      end if;

      update public.normalized_dataset_sync_sessions
      set status = case when status = 'active' then 'aborted' else status end,
          aborted_at = case when status = 'active' then coalesce(aborted_at, now()) else aborted_at end,
          updated_at = case when status = 'active' then now() else updated_at end,
          staging_cleaned_at = now(),
          staging_cleanup_result = cleanup_result
      where id = session_record.id;
      insert into public.normalized_dataset_sync_cleanup_log (
        session_id, dataset_id, user_id, previous_status,
        staging_table_name, result, details
      ) values (
        session_record.id, session_record.dataset_id, session_record.user_id, session_record.status,
        session_record.staging_table_name, cleanup_result, cleanup_details
      );
      cleaned_count := cleaned_count + 1;
    exception when others then
      insert into public.normalized_dataset_sync_cleanup_log (
        session_id, dataset_id, user_id, previous_status,
        staging_table_name, result, details
      ) values (
        session_record.id, session_record.dataset_id, session_record.user_id, session_record.status,
        session_record.staging_table_name, 'failed',
        format('SQLSTATE %s: %s', sqlstate, sqlerrm)
      );
      failed_count := failed_count + 1;
    end;
  end loop;

  return jsonb_build_object(
    'stale_before', stale_before,
    'inspected', inspected_count,
    'cleaned', cleaned_count,
    'skipped', skipped_count,
    'failed', failed_count
  );
end;
$$;

create or replace function public.cleanup_normalized_sync_before_dataset_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  sync_session record;
begin
  perform pg_advisory_xact_lock(hashtextextended(old.user_id::text || ':' || old.id::text, 0));
  for sync_session in
    select staging_table_name
    from public.normalized_dataset_sync_sessions
    where dataset_id = old.id
      and status in ('active', 'superseded')
      and staging_cleaned_at is null
  loop
    if sync_session.staging_table_name !~ '^dataset_staging_[0-9a-f]{32}$' then
      raise exception 'Invalid normalized dataset staging table name';
    end if;
    execute format('drop table if exists public.%I', sync_session.staging_table_name);
  end loop;
  return old;
end;
$$;

drop trigger if exists cleanup_normalized_sync_before_dataset_delete on public.datasets;
create trigger cleanup_normalized_sync_before_dataset_delete
  before delete on public.datasets
  for each row execute function public.cleanup_normalized_sync_before_dataset_delete();

revoke all on function public.normalized_dataset_table_name(uuid) from public, anon, authenticated;
revoke all on function public.normalized_dataset_staging_table_name(uuid) from public, anon, authenticated;
revoke all on function public.begin_normalized_dataset_sync(uuid, integer) from public, anon;
revoke all on function public.append_normalized_dataset_rows(uuid, integer, jsonb) from public, anon;
revoke all on function public.complete_normalized_dataset_sync(uuid) from public, anon;
revoke all on function public.abort_normalized_dataset_sync(uuid) from public, anon;
revoke all on function public.cleanup_abandoned_normalized_dataset_sync(integer) from public, anon, authenticated;
revoke all on function public.cleanup_normalized_sync_before_dataset_delete() from public, anon, authenticated;
grant execute on function public.begin_normalized_dataset_sync(uuid, integer) to authenticated;
grant execute on function public.append_normalized_dataset_rows(uuid, integer, jsonb) to authenticated;
grant execute on function public.complete_normalized_dataset_sync(uuid) to authenticated;
grant execute on function public.abort_normalized_dataset_sync(uuid) to authenticated;
grant execute on function public.cleanup_abandoned_normalized_dataset_sync(integer) to service_role;

-- Supabase Cron runs this database maintenance job without embedding a service
-- key. The RPC remains unavailable to frontend roles; the database owner is the
-- internal executor for the scheduled SQL command.
do $schedule_cleanup$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute $cron$
      select cron.schedule(
        'sphere-cleanup-abandoned-normalized-sync',
        '17 * * * *',
        'select public.cleanup_abandoned_normalized_dataset_sync(100)'
      )
    $cron$;
  else
    raise notice 'pg_cron is unavailable; schedule cleanup_abandoned_normalized_dataset_sync from an authorized backend';
  end if;
end;
$schedule_cleanup$;

commit;
