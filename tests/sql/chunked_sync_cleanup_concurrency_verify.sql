\set ON_ERROR_STOP on

set request.jwt.claim.sub = '12000000-0000-0000-0000-000000000001';

do $$
declare
  test_dataset_id constant uuid := '22000000-0000-0000-0000-000000000001';
  sync_session public.normalized_dataset_sync_sessions%rowtype;
  replay jsonb;
  completed jsonb;
  persisted_values jsonb;
begin
  select * into strict sync_session
  from public.normalized_dataset_sync_sessions
  where dataset_id = test_dataset_id;

  if sync_session.status <> 'active'
    or sync_session.staging_cleaned_at is not null
    or to_regclass(format('public.%I', sync_session.staging_table_name)) is null then
    raise exception 'Cleanup removed or changed a session refreshed while waiting for the lock';
  end if;
  if (select count(*) from public.normalized_dataset_sync_cleanup_log
      where session_id = sync_session.id and result = 'skipped_recent_activity') <> 1 then
    raise exception 'Concurrent cleanup did not record its revalidation result';
  end if;

  perform public.append_normalized_dataset_rows(
    sync_session.id, 0,
    '[{"label":"race-1","amount":1},{"label":"race-2","amount":2}]'::jsonb
  );
  replay := public.append_normalized_dataset_rows(
    sync_session.id, 0,
    '[{"label":"race-1","amount":1},{"label":"race-2","amount":2}]'::jsonb
  );
  if coalesce((replay->>'replayed')::boolean, false) is not true then
    raise exception 'Retry after concurrent cleanup was not idempotent';
  end if;
  perform public.append_normalized_dataset_rows(
    sync_session.id, 1,
    '[{"label":"race-3","amount":3},{"label":"race-4","amount":4}]'::jsonb
  );
  completed := public.complete_normalized_dataset_sync(sync_session.id);
  if (completed->>'row_count')::integer <> 4 then
    raise exception 'Recovered concurrent session did not complete';
  end if;

  execute format(
    'select jsonb_agg(jsonb_build_array("label", "amount") order by "amount") from public.%I',
    public.normalized_dataset_table_name(test_dataset_id)
  ) into persisted_values;
  if persisted_values <> '[["race-1",1],["race-2",2],["race-3",3],["race-4",4]]'::jsonb then
    raise exception 'Concurrent recovery persisted incorrect values: %', persisted_values;
  end if;
end;
$$;

delete from public.datasets where id = '22000000-0000-0000-0000-000000000001';
delete from auth.users where id = '12000000-0000-0000-0000-000000000001';

select 'chunked sync cleanup concurrency passed' as result;
