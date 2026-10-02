-- run_items: per-run copy of checklist items with their own TODO/DONE state.
-- Synced per item, last-write-wins on updated_at (client supplies it so offline edits keep their real time;
-- hence no updated_at trigger on this table).
create table public.run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  stage_id uuid not null,
  source_item_id uuid,
  title text not null check (char_length(title) between 1 and 300),
  qty integer not null default 1 check (qty >= 0),
  note text,
  due_date date,
  sort_order double precision not null default 0,
  status text not null default 'TODO' check (status in ('TODO','DONE')),
  updated_at timestamptz not null default now()
);
create index run_items_run_stage_idx on public.run_items (run_id, stage_id, sort_order);

alter table public.run_items enable row level security;
create policy run_items_select on public.run_items for select to authenticated
  using (public.owns_run(run_id));
create policy run_items_insert on public.run_items for insert to authenticated
  with check (public.owns_run(run_id));
create policy run_items_update on public.run_items for update to authenticated
  using (public.owns_run(run_id)) with check (public.owns_run(run_id));
create policy run_items_delete on public.run_items for delete to authenticated
  using (public.owns_run(run_id));
