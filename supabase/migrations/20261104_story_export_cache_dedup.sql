create unique index if not exists story_export_jobs_active_cache_key_unique
  on public.story_export_jobs (
    story_id,
    orientation,
    ((technical_metadata ->> 'cacheKey'))
  )
  where status in ('queued', 'processing')
    and technical_metadata ? 'cacheKey';

create index if not exists story_export_jobs_cache_lookup_idx
  on public.story_export_jobs (
    story_id,
    orientation,
    status,
    ((technical_metadata ->> 'cacheKey')),
    completed_at desc
  )
  where technical_metadata ? 'cacheKey';
