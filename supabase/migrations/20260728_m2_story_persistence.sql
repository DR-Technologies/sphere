create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  source_report_id uuid null references public.reports(id) on delete set null,
  title text not null,
  subtitle text not null default '',
  template_id text not null default 'modern',
  motion_preset_id text not null default 'smooth',
  pacing_preset_id text not null default 'standard',
  orientation text not null default 'landscape',
  definition_version integer not null default 1,
  story_definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists stories_user_id_idx
  on public.stories(user_id);

create index if not exists stories_dataset_id_idx
  on public.stories(dataset_id);

create index if not exists stories_source_report_id_idx
  on public.stories(source_report_id);

alter table if exists public.stories enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stories'
      and policyname = 'stories_select_own'
  ) then
    create policy stories_select_own
      on public.stories
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stories'
      and policyname = 'stories_insert_own'
  ) then
    create policy stories_insert_own
      on public.stories
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stories'
      and policyname = 'stories_update_own'
  ) then
    create policy stories_update_own
      on public.stories
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stories'
      and policyname = 'stories_delete_own'
  ) then
    create policy stories_delete_own
      on public.stories
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

create table if not exists public.public_story_snapshots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  story_id uuid null references public.stories(id) on delete set null,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  template_id text not null default 'modern',
  motion_preset_id text not null default 'smooth',
  pacing_preset_id text not null default 'standard',
  orientation text not null default 'landscape',
  definition_version integer not null default 1,
  render_model_version integer not null default 1,
  story_definition jsonb not null default '{}'::jsonb,
  materialized_story jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default timezone('utc'::text, now()),
  revoked_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists public_story_snapshots_story_id_idx
  on public.public_story_snapshots(story_id);

create index if not exists public_story_snapshots_user_id_idx
  on public.public_story_snapshots(user_id);

create index if not exists public_story_snapshots_dataset_id_idx
  on public.public_story_snapshots(dataset_id);

alter table if exists public.public_story_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_story_snapshots'
      and policyname = 'public_story_snapshots_select_public'
  ) then
    create policy public_story_snapshots_select_public
      on public.public_story_snapshots
      for select
      to anon, authenticated
      using (revoked_at is null);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_story_snapshots'
      and policyname = 'public_story_snapshots_insert_own'
  ) then
    create policy public_story_snapshots_insert_own
      on public.public_story_snapshots
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_story_snapshots'
      and policyname = 'public_story_snapshots_update_own'
  ) then
    create policy public_story_snapshots_update_own
      on public.public_story_snapshots
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_story_snapshots'
      and policyname = 'public_story_snapshots_delete_own'
  ) then
    create policy public_story_snapshots_delete_own
      on public.public_story_snapshots
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

create table if not exists public.story_export_jobs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  orientation text not null default 'landscape',
  render_token text not null,
  file_name text null,
  output_path text null,
  output_size_bytes bigint null,
  duration_ms integer null,
  frame_count integer null,
  fps integer not null default 24,
  render_time_ms integer null,
  error text null,
  technical_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists story_export_jobs_render_token_idx
  on public.story_export_jobs(render_token);

create index if not exists story_export_jobs_story_id_idx
  on public.story_export_jobs(story_id);

create index if not exists story_export_jobs_user_id_idx
  on public.story_export_jobs(user_id);

create index if not exists story_export_jobs_status_idx
  on public.story_export_jobs(status);

alter table if exists public.story_export_jobs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'story_export_jobs'
      and policyname = 'story_export_jobs_select_own'
  ) then
    create policy story_export_jobs_select_own
      on public.story_export_jobs
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'story_export_jobs'
      and policyname = 'story_export_jobs_insert_own'
  ) then
    create policy story_export_jobs_insert_own
      on public.story_export_jobs
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'story_export_jobs'
      and policyname = 'story_export_jobs_update_own'
  ) then
    create policy story_export_jobs_update_own
      on public.story_export_jobs
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'story_export_jobs'
      and policyname = 'story_export_jobs_delete_own'
  ) then
    create policy story_export_jobs_delete_own
      on public.story_export_jobs
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
