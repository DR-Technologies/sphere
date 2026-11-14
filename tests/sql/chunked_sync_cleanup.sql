\set ON_ERROR_STOP on

set request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

insert into auth.users(id) values ('11000000-0000-0000-0000-000000000001');
insert into public.datasets(id, user_id, name, file_url, columns, stats)
values (
  '21000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  '__chunk_cleanup_local_qa__',
  'qa://local-cleanup',
  '[
    {"name":"label","type":"VARCHAR"},
    {"name":"amount","type":"INTEGER"}
  ]'::jsonb,
  '[
    {"column":"label","type":"VARCHAR","total":4,"nulls":0,"unique":4},
    {"column":"amount","type":"INTEGER","total":4,"nulls":0,"unique":4}
  ]'::jsonb
);

create temp table cleanup_test_sessions (
  kind text primary key,
  session_id uuid not null,
  staging_table_name text not null
);

do $$
declare
  dataset_id constant uuid := '21000000-0000-0000-0000-000000000001';
  sync jsonb;
begin
  -- Establish a definitive table that cleanup must never alter.
  sync := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (sync->>'session_id')::uuid, 0,
    '[{"label":"base-1","amount":1},{"label":"base-2","amount":2}]'::jsonb
  );
  perform public.append_normalized_dataset_rows(
    (sync->>'session_id')::uuid, 1,
    '[{"label":"base-3","amount":3},{"label":"base-4","amount":4}]'::jsonb
  );
  perform public.complete_normalized_dataset_sync((sync->>'session_id')::uuid);

  -- A recently active session has an old created_at on purpose. It must survive.
  sync := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (sync->>'session_id')::uuid, 0,
    '[{"label":"fresh-1","amount":11},{"label":"fresh-2","amount":12}]'::jsonb
  );
  insert into cleanup_test_sessions values ('fresh', (sync->>'session_id')::uuid, sync->>'staging_table_name');
  update public.normalized_dataset_sync_sessions
  set created_at = now() - interval '3 days', updated_at = now()
  where id = (sync->>'session_id')::uuid;

  sync := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (sync->>'session_id')::uuid, 0,
    '[{"label":"stale-active-1","amount":21},{"label":"stale-active-2","amount":22}]'::jsonb
  );
  insert into cleanup_test_sessions values ('stale_active', (sync->>'session_id')::uuid, sync->>'staging_table_name');
  update public.normalized_dataset_sync_sessions
  set created_at = now() - interval '3 days', updated_at = now() - interval '25 hours'
  where id = (sync->>'session_id')::uuid;

  sync := public.begin_normalized_dataset_sync(dataset_id, 2);
  insert into cleanup_test_sessions values ('stale_aborted', (sync->>'session_id')::uuid, sync->>'staging_table_name');
  update public.normalized_dataset_sync_sessions
  set status = 'aborted', aborted_at = now() - interval '25 hours',
      created_at = now() - interval '3 days', updated_at = now() - interval '25 hours'
  where id = (sync->>'session_id')::uuid;

  sync := public.begin_normalized_dataset_sync(dataset_id, 2);
  insert into cleanup_test_sessions values ('stale_superseded', (sync->>'session_id')::uuid, sync->>'staging_table_name');
  update public.normalized_dataset_sync_sessions
  set status = 'superseded', created_at = now() - interval '3 days',
      updated_at = now() - interval '25 hours'
  where id = (sync->>'session_id')::uuid;
end;
$$;

do $$
begin
  if has_function_privilege('anon', 'public.cleanup_abandoned_normalized_dataset_sync(integer)', 'execute')
    or has_function_privilege('authenticated', 'public.cleanup_abandoned_normalized_dataset_sync(integer)', 'execute') then
    raise exception 'Cleanup RPC is exposed to a frontend role';
  end if;
  if not has_function_privilege('service_role', 'public.cleanup_abandoned_normalized_dataset_sync(integer)', 'execute') then
    raise exception 'Cleanup RPC is unavailable to service_role';
  end if;
end;
$$;

set role service_role;
select public.cleanup_abandoned_normalized_dataset_sync(100) as cleanup_result \gset
reset role;
create temp table cleanup_test_result(result jsonb not null);
insert into cleanup_test_result values (:'cleanup_result'::jsonb);

do $$
declare
  test_dataset_id constant uuid := '21000000-0000-0000-0000-000000000001';
  target_name text := public.normalized_dataset_table_name(test_dataset_id);
  test_session record;
  session_status text;
  values_after_cleanup jsonb;
  cleanup_result jsonb;
  target_oid oid;
  target_oid_after oid;
  replay jsonb;
begin
  select result into cleanup_result from cleanup_test_result;
  if (cleanup_result->>'cleaned')::integer <> 3
    or (cleanup_result->>'failed')::integer <> 0 then
    raise exception 'Unexpected cleanup result: %', cleanup_result;
  end if;

  select to_regclass(format('public.%I', target_name))::oid into target_oid;
  execute format('select jsonb_agg(jsonb_build_array("label", "amount") order by "amount") from public.%I', target_name)
  into values_after_cleanup;
  if values_after_cleanup <> '[["base-1",1],["base-2",2],["base-3",3],["base-4",4]]'::jsonb then
    raise exception 'Cleanup changed definitive dataset values: %', values_after_cleanup;
  end if;

  for test_session in select * from cleanup_test_sessions loop
    if test_session.kind = 'fresh' then
      if to_regclass(format('public.%I', test_session.staging_table_name)) is null then
        raise exception 'Fresh active staging table was removed';
      end if;
      select status into session_status
      from public.normalized_dataset_sync_sessions where id = test_session.session_id;
      if session_status <> 'active' then raise exception 'Fresh session state changed'; end if;
    else
      if to_regclass(format('public.%I', test_session.staging_table_name)) is not null then
        raise exception 'Abandoned staging table remains for %', test_session.kind;
      end if;
      select status into session_status
      from public.normalized_dataset_sync_sessions where id = test_session.session_id;
      if test_session.kind = 'stale_active' and session_status <> 'aborted' then
        raise exception 'Stale active session was not aborted';
      end if;
    end if;
  end loop;

  if (select count(*) from public.normalized_dataset_sync_cleanup_log cleanup_log
      where cleanup_log.dataset_id = test_dataset_id
        and cleanup_log.result in ('dropped', 'already_missing')) <> 3 then
    raise exception 'Cleanup audit log does not contain all cleaned sessions';
  end if;

  select session_id into test_session
  from cleanup_test_sessions where kind = 'fresh';
  replay := public.append_normalized_dataset_rows(
    test_session.session_id, 0,
    '[{"label":"fresh-1","amount":11},{"label":"fresh-2","amount":12}]'::jsonb
  );
  if coalesce((replay->>'replayed')::boolean, false) is not true then
    raise exception 'Fresh session retry stopped being idempotent after cleanup';
  end if;
  perform public.append_normalized_dataset_rows(
    test_session.session_id, 1,
    '[{"label":"fresh-3","amount":13},{"label":"fresh-4","amount":14}]'::jsonb
  );
  perform public.complete_normalized_dataset_sync(test_session.session_id);

  select to_regclass(format('public.%I', target_name))::oid into target_oid_after;
  if target_oid_after <> target_oid then
    raise exception 'Recovery changed definitive table identity';
  end if;
  execute format('select jsonb_agg(jsonb_build_array("label", "amount") order by "amount") from public.%I', target_name)
  into values_after_cleanup;
  if values_after_cleanup <> '[["fresh-1",11],["fresh-2",12],["fresh-3",13],["fresh-4",14]]'::jsonb then
    raise exception 'Recovered session values are incorrect: %', values_after_cleanup;
  end if;
end;
$$;

delete from public.datasets where id = '21000000-0000-0000-0000-000000000001';
delete from auth.users where id = '11000000-0000-0000-0000-000000000001';

select 'chunked sync cleanup passed' as result;
