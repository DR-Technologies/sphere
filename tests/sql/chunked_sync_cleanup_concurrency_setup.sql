\set ON_ERROR_STOP on

set request.jwt.claim.sub = '12000000-0000-0000-0000-000000000001';

insert into auth.users(id) values ('12000000-0000-0000-0000-000000000001');
insert into public.datasets(id, user_id, name, file_url, columns, stats)
values (
  '22000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '__chunk_cleanup_concurrency_qa__',
  'qa://local-cleanup-concurrency',
  '[{"name":"label","type":"VARCHAR"},{"name":"amount","type":"INTEGER"}]'::jsonb,
  '[
    {"column":"label","type":"VARCHAR","total":4,"nulls":0,"unique":4},
    {"column":"amount","type":"INTEGER","total":4,"nulls":0,"unique":4}
  ]'::jsonb
);

do $$
declare
  sync jsonb;
begin
  sync := public.begin_normalized_dataset_sync('22000000-0000-0000-0000-000000000001', 2);
  update public.normalized_dataset_sync_sessions
  set created_at = now() - interval '3 days',
      updated_at = now() - interval '25 hours'
  where id = (sync->>'session_id')::uuid;
end;
$$;
