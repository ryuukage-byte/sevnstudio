-- stage_runs: stored status per stage within a run. LOCKED/READY are derived (never stored).
-- stage_id refers to a stage id inside runs.snapshot (the live stage may since have changed), hence no FK.
create table public.stage_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  stage_id uuid not null,
  status text not null check (status in ('TODO','DOING','DONE','RUNNING','REVIEW','APPROVED','REJECTED','FAILED','STALE')),
  attempt integer not null default 0 check (attempt >= 0),
  -- exact artifact versions used as input; populated from Phase 4 onward.
  input_refs jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, stage_id)
);
create trigger stage_runs_updated_at before update on public.stage_runs
  for each row execute function public.set_updated_at();

alter table public.stage_runs enable row level security;
create policy stage_runs_select on public.stage_runs for select to authenticated
  using (public.owns_run(run_id));
create policy stage_runs_insert on public.stage_runs for insert to authenticated
  with check (public.owns_run(run_id));
create policy stage_runs_update on public.stage_runs for update to authenticated
  using (public.owns_run(run_id)) with check (public.owns_run(run_id));
create policy stage_runs_delete on public.stage_runs for delete to authenticated
  using (public.owns_run(run_id));
