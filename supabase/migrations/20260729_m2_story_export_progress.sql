alter table if exists public.story_export_jobs
  add column if not exists phase text not null default 'queued',
  add column if not exists progress double precision null,
  add column if not exists current_frame integer null,
  add column if not exists current_time_ms integer null,
  add column if not exists frame_render_time_ms integer null,
  add column if not exists encoding_time_ms integer null,
  add column if not exists heartbeat_at timestamptz null;

create index if not exists story_export_jobs_phase_idx
  on public.story_export_jobs(phase);

create index if not exists story_export_jobs_heartbeat_idx
  on public.story_export_jobs(heartbeat_at);
