\set ON_ERROR_STOP on
set request.jwt.claim.role = 'service_role';

do $$ begin
  if (select admin_plan_override from public.user_roles where user_id = '10000000-0000-0000-0000-000000000001') <> 'pro' then
    raise exception 'Administrative plan backfill failed';
  end if;
  if (select is_nullable from information_schema.columns where table_schema='public' and table_name='admin_audit_log' and column_name='actor_user_id') <> 'NO' then
    raise exception 'Audit actor unexpectedly became nullable';
  end if;
  if exists(select 1 from auth.users where id='10000000-0000-0000-0000-000000000004')
    and (select admin_plan_override from public.user_roles where user_id='10000000-0000-0000-0000-000000000004') is not null then
    raise exception 'Existing Stripe subscription was converted to an administrative override';
  end if;
end $$;

insert into public.datasets(id,user_id,name,file_url,normalized_table_name) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner','qa://owner',public.normalized_dataset_table_name('20000000-0000-0000-0000-000000000001')),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','other','qa://other',public.normalized_dataset_table_name('20000000-0000-0000-0000-000000000002')),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','bad','qa://bad','dataset_20000000_0000_0000_0000_000000000002');
create table public.dataset_20000000_0000_0000_0000_000000000001(value integer);
create table public.dataset_20000000_0000_0000_0000_000000000002(value integer);
insert into public.dataset_20000000_0000_0000_0000_000000000001 values (1);
insert into public.dataset_20000000_0000_0000_0000_000000000002 values (2);

do $$
declare failed boolean := false;
begin
  begin
    perform public.begin_account_deletion('10000000-0000-0000-0000-000000000003', 'hash-bad');
  exception when others then
    failed := sqlerrm = 'DATASET_TABLE_NAME_MISMATCH';
  end;
  if not failed then raise exception 'Inconsistent table name was accepted'; end if;
  if (select status from public.user_roles where user_id='10000000-0000-0000-0000-000000000003') <> 'active' then
    raise exception 'Bad account was partially suspended';
  end if;
  if not exists(select 1 from public.datasets where id='20000000-0000-0000-0000-000000000003') then
    raise exception 'Bad dataset was partially deleted';
  end if;
  if to_regclass('public.dataset_20000000_0000_0000_0000_000000000002') is null then
    raise exception 'Another user table was removed';
  end if;
end $$;

-- Missing metadata must also fail before changing account state when the
-- canonical relation exists, otherwise account deletion would orphan it.
insert into public.datasets(id,user_id,name,file_url,normalized_table_name)
values ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005','Missing metadata','qa://missing',null);
create table public.dataset_20000000_0000_0000_0000_000000000004(value text);
do $$ begin
  begin
    perform public.begin_account_deletion('10000000-0000-0000-0000-000000000005', 'hash-missing');
    raise exception 'Expected missing dataset table metadata rejection';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'DATASET_TABLE_METADATA_MISSING' then raise; end if;
  end;
end $$;
drop table public.dataset_20000000_0000_0000_0000_000000000004;
delete from public.datasets where id='20000000-0000-0000-0000-000000000004';

do $$
declare result jsonb;
begin
  result := public.claim_stripe_webhook_event('evt_1','customer.subscription.updated','2026-11-10T12:00:00Z','30000000-0000-0000-0000-000000000001',600);
  if not (result->>'claimed')::boolean then raise exception 'Initial claim failed'; end if;
  result := public.claim_stripe_webhook_event('evt_1','customer.subscription.updated','2026-11-10T12:00:00Z','30000000-0000-0000-0000-000000000002',600);
  if (result->>'claimed')::boolean or result->>'reason' <> 'in_progress' then raise exception 'Concurrent duplicate was accepted'; end if;
  update public.stripe_webhook_events set lease_expires_at=now()-interval '1 second' where event_id='evt_1';
  result := public.claim_stripe_webhook_event('evt_1','customer.subscription.updated','2026-11-10T12:00:00Z','30000000-0000-0000-0000-000000000002',600);
  if not (result->>'claimed')::boolean or result->>'reason' <> 'stale_recovery' then raise exception 'Stale claim did not recover'; end if;
  update public.stripe_webhook_events set status='failed', lease_expires_at=null where event_id='evt_1';
  result := public.claim_stripe_webhook_event('evt_1','customer.subscription.updated','2026-11-10T12:00:00Z','30000000-0000-0000-0000-000000000003',600);
  if not (result->>'claimed')::boolean or result->>'reason' <> 'retry' then raise exception 'Failed event did not retry'; end if;
  update public.stripe_webhook_events set status='completed', lease_expires_at=null where event_id='evt_1';
  result := public.claim_stripe_webhook_event('evt_1','customer.subscription.updated','2026-11-10T12:00:00Z','30000000-0000-0000-0000-000000000001',600);
  if (result->>'claimed')::boolean or result->>'reason' <> 'completed' then raise exception 'Completed duplicate was accepted'; end if;
  begin
    perform public.claim_stripe_webhook_event('evt_1','invoice.paid','2026-11-10T12:00:00Z','30000000-0000-0000-0000-000000000001',600);
    raise exception 'Event identity mismatch was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'STRIPE_EVENT_IDENTITY_MISMATCH' then raise; end if;
  end;
end $$;

create extension if not exists dblink;
select dblink_connect('stripe_claim_a', format(
  'dbname=%s host=%s port=%s user=%s', current_database(), current_setting('unix_socket_directories'),
  current_setting('port'), current_user
));
select dblink_connect('stripe_claim_b', format(
  'dbname=%s host=%s port=%s user=%s', current_database(), current_setting('unix_socket_directories'),
  current_setting('port'), current_user
));
select dblink_exec('stripe_claim_a', $$set request.jwt.claim.role = 'service_role'$$);
select dblink_exec('stripe_claim_b', $$set request.jwt.claim.role = 'service_role'$$);
select dblink_send_query('stripe_claim_a', $$
  select public.claim_stripe_webhook_event(
    'evt_concurrent','customer.subscription.updated','2026-11-10T14:00:00Z',
    '31000000-0000-0000-0000-000000000001',600
  )
$$);
select dblink_send_query('stripe_claim_b', $$
  select public.claim_stripe_webhook_event(
    'evt_concurrent','customer.subscription.updated','2026-11-10T14:00:00Z',
    '31000000-0000-0000-0000-000000000002',600
  )
$$);
create temp table concurrent_claim_results(result jsonb);
insert into concurrent_claim_results select result from dblink_get_result('stripe_claim_a') as response(result jsonb);
insert into concurrent_claim_results select result from dblink_get_result('stripe_claim_b') as response(result jsonb);
do $$ begin
  if (select count(*) from concurrent_claim_results where (result->>'claimed')::boolean) <> 1 then
    raise exception 'Concurrent webhook claims were not exclusive';
  end if;
end $$;
select dblink_disconnect('stripe_claim_a');
select dblink_disconnect('stripe_claim_b');

select public.apply_stripe_subscription_state(
  '10000000-0000-0000-0000-000000000002','cus_2','sub_2','price_pro','pro','active',
  '2026-12-10T00:00:00Z',false,'2026-11-10T13:00:00Z','evt_new'
);
do $$
declare applied boolean;
begin
  applied := public.apply_stripe_subscription_state(
    '10000000-0000-0000-0000-000000000002','cus_2','sub_2','price_pro','pro','canceled',
    '2026-12-10T00:00:00Z',false,'2026-11-10T12:00:00Z','evt_old'
  );
  if applied then raise exception 'Out-of-order subscription event applied'; end if;
  if (select status from public.account_subscriptions where user_id='10000000-0000-0000-0000-000000000002') <> 'active' then
    raise exception 'Subscription rolled back';
  end if;
  perform public.apply_stripe_invoice_status('cus_2','paid','2026-11-10T13:00:00Z');
  if public.apply_stripe_invoice_status('cus_2','payment_failed','2026-11-10T12:00:00Z') then
    raise exception 'Out-of-order invoice event applied';
  end if;
  if (select latest_invoice_status from public.account_subscriptions where user_id='10000000-0000-0000-0000-000000000002') <> 'paid' then
    raise exception 'Invoice state rolled back';
  end if;
end $$;

do $$
declare started jsonb;
begin
  started := public.begin_account_deletion('10000000-0000-0000-0000-000000000001','hash-owner');
  perform public.delete_account_product_data('10000000-0000-0000-0000-000000000001',(started->>'request_id')::uuid);
  if to_regclass('public.dataset_20000000_0000_0000_0000_000000000001') is not null then raise exception 'Owned table remains'; end if;
  if to_regclass('public.dataset_20000000_0000_0000_0000_000000000002') is null then raise exception 'Other table was removed'; end if;
  if exists(select 1 from public.datasets where user_id='10000000-0000-0000-0000-000000000001') then raise exception 'Owned metadata remains'; end if;
  if not exists(select 1 from public.datasets where user_id='10000000-0000-0000-0000-000000000002') then raise exception 'Other metadata was removed'; end if;
end $$;

select 'account self service integration passed' as result;
