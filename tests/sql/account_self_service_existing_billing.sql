\set ON_ERROR_STOP on

create table public.account_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_status text,
  stripe_event_created_at timestamptz,
  stripe_event_id text,
  latest_invoice_event_created_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000004');
insert into public.user_roles(user_id, role, subscription_plan)
values ('10000000-0000-0000-0000-000000000004','standard','pro');
insert into public.account_subscriptions(
  user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,plan,status
) values (
  '10000000-0000-0000-0000-000000000004','cus_existing','sub_existing','price_pro','pro','active'
);
