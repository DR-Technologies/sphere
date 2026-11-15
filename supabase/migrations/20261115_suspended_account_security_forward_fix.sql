begin;

-- This migration must only run after the Package 5 security hardening. It is a
-- forward fix: no grants are reopened and no product rows are changed.
do $$
begin
  if to_regprocedure('public.is_current_account_active()') is null
    or to_regprocedure('public.enforce_active_account_request()') is null
    or to_regprocedure('public.get_public_report_snapshot(text)') is null
    or to_regprocedure('public.run_dataset_query(uuid,text)') is null then
    raise exception 'SECURITY_HARDENING_PREREQUISITE_MISSING'
      using errcode = '55000';
  end if;

  if not exists (
    select 1 from storage.buckets where id = 'files' and public = false
  ) then
    raise exception 'PRIVATE_FILES_BUCKET_PREREQUISITE_MISSING'
      using errcode = '55000';
  end if;
end
$$;

-- PostgREST already invokes enforce_active_account_request before each API
-- request. Restrictive policies provide the same protection at the data layer,
-- including for a JWT issued before an account was suspended.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'datasets',
    'reports',
    'stories',
    'public_report_snapshots',
    'public_story_snapshots',
    'story_export_jobs',
    'user_roles'
  ]
  loop
    execute format(
      'drop policy if exists sphere_active_account_guard on public.%I',
      table_name
    );
    execute format(
      'create policy sphere_active_account_guard on public.%I as restrictive for all to authenticated using (public.is_current_account_active()) with check (public.is_current_account_active())',
      table_name
    );
  end loop;
end
$$;

-- SECURITY DEFINER mutation RPCs can bypass RLS. A trigger guard makes their
-- writes fail transactionally for suspended authenticated callers while still
-- allowing service_role lifecycle and administration operations.
create or replace function public.enforce_active_account_private_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    perform public.enforce_active_account_request();
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_active_account_private_mutation()
from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'datasets',
    'reports',
    'stories',
    'public_report_snapshots',
    'public_story_snapshots',
    'story_export_jobs',
    'normalized_dataset_sync_sessions',
    'normalized_dataset_sync_chunks'
  ]
  loop
    execute format(
      'drop trigger if exists sphere_active_account_mutation_guard on public.%I',
      table_name
    );
    execute format(
      'create trigger sphere_active_account_mutation_guard before insert or update or delete on public.%I for each row execute function public.enforce_active_account_private_mutation()',
      table_name
    );
  end loop;
end
$$;

-- Keep future and existing analytical relations aligned with the same active
-- account contract. Public snapshots are intentionally not routed through this
-- helper and remain available only through their approved slug RPCs.
create or replace function public.secure_normalized_dataset_table(p_dataset_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  dataset_record record;
  expected_table_name text;
begin
  select id, user_id, normalized_table_name
  into dataset_record
  from public.datasets
  where id = p_dataset_id;

  if not found or dataset_record.normalized_table_name is null then
    return;
  end if;

  expected_table_name := 'dataset_' || replace(dataset_record.id::text, '-', '_');
  if dataset_record.normalized_table_name <> expected_table_name
    or to_regclass(format('public.%I', expected_table_name)) is null then
    raise exception 'NORMALIZED_DATASET_RELATION_MISMATCH'
      using errcode = '42P01';
  end if;

  execute format('alter table public.%I enable row level security', expected_table_name);
  execute format(
    'revoke all on table public.%I from public, anon, authenticated',
    expected_table_name
  );
  execute format('grant select on table public.%I to authenticated, service_role', expected_table_name);
  execute format('drop policy if exists normalized_dataset_owner_select on public.%I', expected_table_name);
  execute format('drop policy if exists normalized_dataset_active_account_guard on public.%I', expected_table_name);
  execute format(
    'create policy normalized_dataset_owner_select on public.%I for select to authenticated using (auth.uid() = %L::uuid)',
    expected_table_name,
    dataset_record.user_id::text
  );
  execute format(
    'create policy normalized_dataset_active_account_guard on public.%I as restrictive for select to authenticated using (public.is_current_account_active())',
    expected_table_name
  );
end;
$$;

revoke all on function public.secure_normalized_dataset_table(uuid)
from public, anon, authenticated;

do $$
declare
  dataset_record record;
begin
  for dataset_record in
    select id from public.datasets
    where normalized_table_name is not null
    order by id
  loop
    perform public.secure_normalized_dataset_table(dataset_record.id);
  end loop;
end
$$;

-- This read-only SECURITY DEFINER RPC exposes dependency names. Guard it
-- explicitly in addition to the PostgREST pre-request hook.
create or replace function public.get_dataset_delete_dependencies(p_dataset_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  report_names jsonb;
  story_names jsonb;
  report_count integer;
  story_count integer;
begin
  perform public.enforce_active_account_request();

  if not exists (
    select 1 from public.datasets
    where id = p_dataset_id and user_id = auth.uid()
  ) then
    return null;
  end if;

  select count(*), coalesce(jsonb_agg(name order by created_at), '[]'::jsonb)
  into report_count, report_names
  from public.reports
  where dataset_id = p_dataset_id and user_id = auth.uid();

  select count(*), coalesce(jsonb_agg(title order by created_at), '[]'::jsonb)
  into story_count, story_names
  from public.stories
  where dataset_id = p_dataset_id and user_id = auth.uid();

  return jsonb_build_object(
    'report_count', report_count,
    'report_names', report_names,
    'story_count', story_count,
    'story_names', story_names
  );
end;
$$;

revoke all on function public.get_dataset_delete_dependencies(uuid)
from public, anon;
grant execute on function public.get_dataset_delete_dependencies(uuid)
to authenticated, service_role;

-- Preserve the approved parser/rewrite contract and add an explicit suspended
-- account check before resolving a Dataset or executing generated SQL.
create or replace function public.run_dataset_query(
  p_dataset_id uuid,
  p_query text
)
returns table (row_data jsonb)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  table_name text;
  rewritten_query text;
  validation_query text;
  query_index integer := 1;
  query_length integer;
  query_char text;
  next_char text;
  in_string_literal boolean := false;
  in_quoted_identifier boolean := false;
  from_clause text;
  from_position integer;
  dataset_position integer;
  started_at timestamptz := clock_timestamp();
  duration_ms numeric;
  error_state text;
  error_message text;
  error_detail text;
  error_hint text;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authenticated session required' using errcode = '28000';
  end if;

  if auth.role() <> 'service_role'
    and not public.is_current_account_active() then
    raise exception 'ACCOUNT_SUSPENDED'
      using errcode = '42501', detail = 'This Sphere account is suspended.';
  end if;

  select normalized_table_name
  into table_name
  from public.datasets
  where id = p_dataset_id
    and (user_id = auth.uid() or auth.role() = 'service_role');

  if table_name is null then
    raise exception 'Normalized dataset table not found for dataset %', p_dataset_id
      using errcode = '42P01';
  end if;
  if table_name <> 'dataset_' || replace(p_dataset_id::text, '-', '_')
    or to_regclass(format('public.%I', table_name)) is null then
    raise exception 'Normalized dataset relation is invalid for dataset %', p_dataset_id
      using errcode = '42P01';
  end if;

  if p_query is null then
    raise exception 'Only one generated SELECT from dataset is supported'
      using errcode = '22023';
  end if;

  validation_query := '';
  query_length := char_length(p_query);
  while query_index <= query_length loop
    query_char := substr(p_query, query_index, 1);
    next_char := case
      when query_index < query_length then substr(p_query, query_index + 1, 1)
      else ''
    end;

    if in_string_literal then
      validation_query := validation_query || ' ';
      if query_char = '''' then
        if next_char = '''' then
          validation_query := validation_query || ' ';
          query_index := query_index + 2;
          continue;
        end if;
        in_string_literal := false;
      end if;
    elsif in_quoted_identifier then
      validation_query := validation_query || ' ';
      if query_char = '"' then
        if next_char = '"' then
          validation_query := validation_query || ' ';
          query_index := query_index + 2;
          continue;
        end if;
        in_quoted_identifier := false;
      end if;
    elsif query_char = '''' then
      in_string_literal := true;
      validation_query := validation_query || ' ';
    elsif query_char = '"' then
      in_quoted_identifier := true;
      validation_query := validation_query || ' ';
    else
      validation_query := validation_query || query_char;
    end if;

    query_index := query_index + 1;
  end loop;

  if in_string_literal or in_quoted_identifier then
    raise exception 'Generated dataset query contains an unterminated value or identifier'
      using errcode = '22023';
  end if;

  if validation_query !~* '^[[:space:]]*select[[:space:]]'
    or validation_query !~* '\mfrom[[:space:]]+dataset[[:space:]]*(where|group[[:space:]]+by|order[[:space:]]+by|limit|$)'
    or (select count(*) from regexp_matches(validation_query, '\mselect\M', 'gi')) <> 1
    or (select count(*) from regexp_matches(validation_query, '\mdataset\M', 'gi')) <> 1
    or validation_query ~ '(;|--|/\*|\*/|\$)'
    or validation_query ~* '\m(join|union|intersect|except|with|into|copy|insert|update|delete|alter|drop|create|grant|revoke|set|show|lateral|table|values|call|do|execute)\M'
    or validation_query ~* '\m(public|auth|storage|information_schema|pg_catalog)[[:space:]]*\.'
    or validation_query ~* '"column"[[:space:]]*\.'
    or validation_query ~* '\m(pg_sleep|set_config|current_setting|dblink|lo_import|lo_export)[[:space:]]*\('
  then
    raise exception 'Only one generated SELECT from dataset is supported'
      using errcode = '22023';
  end if;

  from_clause := substring(lower(validation_query) from '\mfrom[[:space:]]+dataset\M');
  from_position := strpos(lower(validation_query), from_clause);
  dataset_position := from_position + strpos(from_clause, 'dataset') - 1;
  if from_clause is null or from_position <= 0 or dataset_position <= 0 then
    raise exception 'Generated dataset query is missing its dataset source'
      using errcode = '22023';
  end if;

  rewritten_query := overlay(
    p_query placing format('public.%I', table_name)
    from dataset_position for char_length('dataset')
  );

  begin
    return query execute format(
      'select to_jsonb(q) from (%s) q limit 1000',
      rewritten_query
    );
  exception
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

revoke all on function public.run_dataset_query(uuid, text)
from public, anon, authenticated;
grant execute on function public.run_dataset_query(uuid, text)
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
