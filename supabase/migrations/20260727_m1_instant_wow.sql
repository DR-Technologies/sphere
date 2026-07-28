alter table if exists public.reports
  add column if not exists presentation jsonb;

create table if not exists public.public_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  report_id uuid null references public.reports(id) on delete set null,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text null,
  template_id text not null default 'modern',
  widgets jsonb not null default '[]'::jsonb,
  widget_results jsonb not null default '[]'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default timezone('utc'::text, now()),
  revoked_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists public_report_snapshots_report_id_idx
  on public.public_report_snapshots(report_id);

create index if not exists public_report_snapshots_dataset_id_idx
  on public.public_report_snapshots(dataset_id);

create index if not exists public_report_snapshots_user_id_idx
  on public.public_report_snapshots(user_id);

alter table if exists public.public_report_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_report_snapshots'
      and policyname = 'public_report_snapshots_select_public'
  ) then
    create policy public_report_snapshots_select_public
      on public.public_report_snapshots
      for select
      to anon, authenticated
      using (revoked_at is null);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_report_snapshots'
      and policyname = 'public_report_snapshots_insert_own'
  ) then
    create policy public_report_snapshots_insert_own
      on public.public_report_snapshots
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_report_snapshots'
      and policyname = 'public_report_snapshots_update_own'
  ) then
    create policy public_report_snapshots_update_own
      on public.public_report_snapshots
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_report_snapshots'
      and policyname = 'public_report_snapshots_delete_own'
  ) then
    create policy public_report_snapshots_delete_own
      on public.public_report_snapshots
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
