\set ON_ERROR_STOP on

begin;
select pg_advisory_xact_lock(hashtextextended(
  '12000000-0000-0000-0000-000000000001:22000000-0000-0000-0000-000000000001',
  0
));
update public.normalized_dataset_sync_sessions
set updated_at = now()
where dataset_id = '22000000-0000-0000-0000-000000000001'
  and status = 'active';
select pg_sleep(2);
commit;
