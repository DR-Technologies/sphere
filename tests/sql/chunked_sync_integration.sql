\set ON_ERROR_STOP on

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  insecure_function_count integer;
begin
  if has_table_privilege('authenticated', 'public.normalized_dataset_sync_sessions', 'select')
    or has_table_privilege('authenticated', 'public.normalized_dataset_sync_chunks', 'select') then
    raise exception 'Authenticated role can read private sync metadata tables';
  end if;
  if has_function_privilege('anon', 'public.begin_normalized_dataset_sync(uuid,integer)', 'execute')
    or has_function_privilege('anon', 'public.append_normalized_dataset_rows(uuid,integer,jsonb)', 'execute')
    or has_function_privilege('anon', 'public.complete_normalized_dataset_sync(uuid)', 'execute')
    or has_function_privilege('anon', 'public.abort_normalized_dataset_sync(uuid)', 'execute') then
    raise exception 'Anonymous role can execute normalized sync RPCs';
  end if;
  if not has_function_privilege('authenticated', 'public.begin_normalized_dataset_sync(uuid,integer)', 'execute')
    or not has_function_privilege('authenticated', 'public.append_normalized_dataset_rows(uuid,integer,jsonb)', 'execute')
    or not has_function_privilege('authenticated', 'public.complete_normalized_dataset_sync(uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.abort_normalized_dataset_sync(uuid)', 'execute') then
    raise exception 'Authenticated role is missing an operational normalized sync RPC';
  end if;

  select count(*) into insecure_function_count
  from pg_proc function_definition
  join pg_namespace function_schema on function_schema.oid = function_definition.pronamespace
  where function_schema.nspname = 'public'
    and function_definition.proname in (
      'begin_normalized_dataset_sync',
      'append_normalized_dataset_rows',
      'complete_normalized_dataset_sync',
      'abort_normalized_dataset_sync'
    )
    and (
      not function_definition.prosecdef
      or not coalesce(function_definition.proconfig, '{}'::text[]) @> array['search_path=pg_catalog']
    );
  if insecure_function_count <> 0 then
    raise exception 'Normalized sync RPCs are missing SECURITY DEFINER or a safe search_path';
  end if;
end;
$$;

insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001');
insert into public.datasets(id, user_id, name, file_url, columns, stats)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '__chunk_sync_local_qa__',
  'qa://local',
  '[
    {"name":"z_text","type":"VARCHAR"},
    {"name":"a_int","type":"INTEGER"},
    {"name":"m_date","type":"DATE"},
    {"name":"b_bool","type":"BOOLEAN"},
    {"name":"c_double","type":"DOUBLE"}
  ]'::jsonb,
  '[
    {"column":"z_text","type":"VARCHAR","total":4,"nulls":0,"unique":4},
    {"column":"a_int","type":"INTEGER","total":4,"nulls":0,"unique":4},
    {"column":"m_date","type":"DATE","total":4,"nulls":0,"unique":4},
    {"column":"b_bool","type":"BOOLEAN","total":4,"nulls":0,"unique":2},
    {"column":"c_double","type":"DOUBLE","total":4,"nulls":0,"unique":4}
  ]'::jsonb
);

do $$
declare
  dataset_id constant uuid := '20000000-0000-0000-0000-000000000001';
  session_a jsonb;
  session_b jsonb;
  session_c jsonb;
  session_d jsonb;
  session_e jsonb;
  session_f jsonb;
  completion jsonb;
  replay jsonb;
  target_name text;
  staging_name text;
  actual_values jsonb;
  actual_columns text[];
  target_oid oid;
  target_oid_after oid;
  failed_as_expected boolean;
begin
  session_a := public.begin_normalized_dataset_sync(dataset_id, 2);
  session_b := public.begin_normalized_dataset_sync(dataset_id, 2);
  if session_a->>'session_id' = session_b->>'session_id'
    or session_a->>'staging_table_name' = session_b->>'staging_table_name' then
    raise exception 'Concurrent sessions were not isolated';
  end if;

  perform public.append_normalized_dataset_rows(
    (session_a->>'session_id')::uuid, 0,
    '[
      {"z_text":"a-1","a_int":1,"m_date":"2026-01-01","b_bool":true,"c_double":1.25},
      {"z_text":"a-2","a_int":2,"m_date":"2026-01-02","b_bool":false,"c_double":2.5}
    ]'::jsonb
  );
  replay := public.append_normalized_dataset_rows(
    (session_a->>'session_id')::uuid, 0,
    '[
      {"z_text":"a-1","a_int":1,"m_date":"2026-01-01","b_bool":true,"c_double":1.25},
      {"z_text":"a-2","a_int":2,"m_date":"2026-01-02","b_bool":false,"c_double":2.5}
    ]'::jsonb
  );
  if coalesce((replay->>'replayed')::boolean, false) is not true then
    raise exception 'Identical chunk retry was not idempotent';
  end if;

  perform public.append_normalized_dataset_rows(
    (session_b->>'session_id')::uuid, 0,
    '[
      {"z_text":"b-1","a_int":11,"m_date":"2026-02-01","b_bool":false,"c_double":11.25},
      {"z_text":"b-2","a_int":12,"m_date":"2026-02-02","b_bool":true,"c_double":12.5}
    ]'::jsonb
  );
  perform public.append_normalized_dataset_rows(
    (session_b->>'session_id')::uuid, 1,
    '[
      {"z_text":"b-3","a_int":13,"m_date":"2026-02-03","b_bool":false,"c_double":13.75},
      {"z_text":"b-4","a_int":14,"m_date":"2026-02-04","b_bool":true,"c_double":14.0}
    ]'::jsonb
  );
  perform public.append_normalized_dataset_rows(
    (session_a->>'session_id')::uuid, 1,
    '[
      {"z_text":"a-3","a_int":3,"m_date":"2026-01-03","b_bool":true,"c_double":3.75},
      {"z_text":"a-4","a_int":4,"m_date":"2026-01-04","b_bool":false,"c_double":4.0}
    ]'::jsonb
  );

  completion := public.complete_normalized_dataset_sync((session_a->>'session_id')::uuid);
  if (completion->>'row_count')::integer <> 4 or nullif(completion->>'content_checksum', '') is null then
    raise exception 'Session A completion did not return integrity evidence';
  end if;
  failed_as_expected := false;
  begin
    perform public.complete_normalized_dataset_sync((session_b->>'session_id')::uuid);
  exception when others then
    failed_as_expected := true;
  end;
  if not failed_as_expected then raise exception 'Superseded concurrent session completed unexpectedly'; end if;

  target_name := public.normalized_dataset_table_name(dataset_id);
  select array_agg(column_name order by ordinal_position)
  into actual_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = target_name;
  if actual_columns <> array['z_text','a_int','m_date','b_bool','c_double']::text[] then
    raise exception 'Persisted column order mismatch: %', actual_columns;
  end if;
  execute format(
    'select jsonb_agg(jsonb_build_array("z_text","a_int","m_date","b_bool","c_double") order by "a_int") from public.%I',
    target_name
  ) into actual_values;
  if actual_values <> '[
    ["a-1",1,"2026-01-01",true,1.25],
    ["a-2",2,"2026-01-02",false,2.5],
    ["a-3",3,"2026-01-03",true,3.75],
    ["a-4",4,"2026-01-04",false,4]
  ]'::jsonb then
    raise exception 'All-column persisted values differ after session A: %', actual_values;
  end if;
  select to_regclass(format('public.%I', target_name))::oid into target_oid;

  -- Interrupted completion must preserve the previous target, then allow resume.
  session_c := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (session_c->>'session_id')::uuid, 0,
    '[
      {"z_text":"c-1","a_int":21,"m_date":"2026-03-01","b_bool":true,"c_double":21.25},
      {"z_text":"c-2","a_int":22,"m_date":"2026-03-02","b_bool":false,"c_double":22.5}
    ]'::jsonb
  );
  failed_as_expected := false;
  begin
    perform public.complete_normalized_dataset_sync((session_c->>'session_id')::uuid);
  exception when others then
    failed_as_expected := true;
  end;
  if not failed_as_expected then raise exception 'Partial session completed unexpectedly'; end if;
  execute format('select jsonb_agg("z_text" order by "a_int") from public.%I', target_name) into actual_values;
  if actual_values <> '["a-1","a-2","a-3","a-4"]'::jsonb then
    raise exception 'Partial completion modified the valid target';
  end if;

  perform public.append_normalized_dataset_rows(
    (session_c->>'session_id')::uuid, 1,
    '[
      {"z_text":"c-3","a_int":23,"m_date":"2026-03-03","b_bool":true,"c_double":23.75},
      {"z_text":"c-4","a_int":24,"m_date":"2026-03-04","b_bool":false,"c_double":24.0}
    ]'::jsonb
  );
  perform public.complete_normalized_dataset_sync((session_c->>'session_id')::uuid);
  select to_regclass(format('public.%I', target_name))::oid into target_oid_after;
  if target_oid_after <> target_oid then
    raise exception 'Target table identity changed during transactional replacement';
  end if;

  -- Abort targets only its own table and cannot be resumed.
  session_d := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (session_d->>'session_id')::uuid, 0,
    '[
      {"z_text":"d-1","a_int":31,"m_date":"2026-04-01","b_bool":true,"c_double":31.25},
      {"z_text":"d-2","a_int":32,"m_date":"2026-04-02","b_bool":false,"c_double":32.5}
    ]'::jsonb
  );
  if not public.abort_normalized_dataset_sync((session_d->>'session_id')::uuid) then
    raise exception 'Abort did not confirm';
  end if;
  failed_as_expected := false;
  begin
    perform public.append_normalized_dataset_rows((session_d->>'session_id')::uuid, 1, '[]'::jsonb);
  exception when others then
    failed_as_expected := true;
  end;
  if not failed_as_expected then raise exception 'Aborted session accepted another chunk'; end if;

  -- New staging tables are immutable after append, so confirmed checksums cannot
  -- be invalidated between chunk persistence and finalization.
  session_e := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (session_e->>'session_id')::uuid, 0,
    '[
      {"z_text":"e-1","a_int":41,"m_date":"2026-05-01","b_bool":true,"c_double":41.25},
      {"z_text":"e-2","a_int":42,"m_date":"2026-05-02","b_bool":false,"c_double":42.5}
    ]'::jsonb
  );
  perform public.append_normalized_dataset_rows(
    (session_e->>'session_id')::uuid, 1,
    '[
      {"z_text":"e-3","a_int":43,"m_date":"2026-05-03","b_bool":true,"c_double":43.75},
      {"z_text":"e-4","a_int":44,"m_date":"2026-05-04","b_bool":false,"c_double":44.0}
    ]'::jsonb
  );
  staging_name := session_e->>'staging_table_name';
  failed_as_expected := false;
  begin
    execute format('update public.%I set "z_text" = ''tampered'' where "_sphere_chunk_index" = 1 and "_sphere_row_index" = 0', staging_name);
  exception when others then
    failed_as_expected := true;
  end;
  if not failed_as_expected then raise exception 'Immutable staging accepted an update'; end if;
  perform public.abort_normalized_dataset_sync((session_e->>'session_id')::uuid);

  -- Sessions that predate immutable staging retain the slower all-column final
  -- reconciliation and still detect modified values.
  session_f := public.begin_normalized_dataset_sync(dataset_id, 2);
  perform public.append_normalized_dataset_rows(
    (session_f->>'session_id')::uuid, 0,
    '[
      {"z_text":"f-1","a_int":51,"m_date":"2026-06-01","b_bool":true,"c_double":51.25},
      {"z_text":"f-2","a_int":52,"m_date":"2026-06-02","b_bool":false,"c_double":52.5}
    ]'::jsonb
  );
  perform public.append_normalized_dataset_rows(
    (session_f->>'session_id')::uuid, 1,
    '[
      {"z_text":"f-3","a_int":53,"m_date":"2026-06-03","b_bool":true,"c_double":53.75},
      {"z_text":"f-4","a_int":54,"m_date":"2026-06-04","b_bool":false,"c_double":54.0}
    ]'::jsonb
  );
  staging_name := session_f->>'staging_table_name';
  execute format('drop trigger normalized_staging_reject_mutation on public.%I', staging_name);
  update public.normalized_dataset_sync_sessions
  set staging_immutable = false
  where id = (session_f->>'session_id')::uuid;
  execute format('update public.%I set "z_text" = ''tampered'' where "_sphere_chunk_index" = 1 and "_sphere_row_index" = 0', staging_name);
  failed_as_expected := false;
  begin
    perform public.complete_normalized_dataset_sync((session_f->>'session_id')::uuid);
  exception when others then
    failed_as_expected := true;
  end;
  if not failed_as_expected then raise exception 'Legacy mutable staging bypassed all-column reconciliation'; end if;
  perform public.abort_normalized_dataset_sync((session_f->>'session_id')::uuid);

  execute format('select jsonb_agg("z_text" order by "a_int") from public.%I', target_name) into actual_values;
  if actual_values <> '["c-1","c-2","c-3","c-4"]'::jsonb then
    raise exception 'Failed/aborted sessions modified the recovered target';
  end if;
end;
$$;

delete from public.datasets where id = '20000000-0000-0000-0000-000000000001';
delete from auth.users where id = '10000000-0000-0000-0000-000000000001';

select 'chunked sync integration passed' as result;
