do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_report_snapshots'
      and policyname = 'public_report_snapshots_select_own'
  ) then
    create policy public_report_snapshots_select_own
      on public.public_report_snapshots
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_story_snapshots'
      and policyname = 'public_story_snapshots_select_own'
  ) then
    create policy public_story_snapshots_select_own
      on public.public_story_snapshots
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
