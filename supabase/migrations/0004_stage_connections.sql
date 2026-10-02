-- stage_connections: edges. kind = blocking (locks downstream) | flow (information only).
create table public.stage_connections (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  source_stage_id uuid not null,
  target_stage_id uuid not null,
  kind text not null default 'blocking' check (kind in ('blocking','flow')),
  source_port text not null default 'text' check (source_port in ('text','json','file')),
  target_port text not null default 'text' check (target_port in ('text','json','file')),
  created_at timestamptz not null default now(),
  -- composite FKs guarantee both endpoints live in the same workflow as the edge.
  foreign key (source_stage_id, workflow_id) references public.stages (id, workflow_id) on delete cascade,
  foreign key (target_stage_id, workflow_id) references public.stages (id, workflow_id) on delete cascade,
  check (source_stage_id <> target_stage_id),
  unique (source_stage_id, target_stage_id)
);
create index stage_connections_workflow_idx on public.stage_connections (workflow_id);
create index stage_connections_target_idx on public.stage_connections (target_stage_id);
-- Cycle detection is pure engine logic (@sevn/engine validateConnection), enforced in the app.

alter table public.stage_connections enable row level security;
create policy stage_connections_select on public.stage_connections for select to authenticated
  using (public.owns_workflow(workflow_id));
create policy stage_connections_insert on public.stage_connections for insert to authenticated
  with check (public.owns_workflow(workflow_id));
create policy stage_connections_update on public.stage_connections for update to authenticated
  using (public.owns_workflow(workflow_id)) with check (public.owns_workflow(workflow_id));
create policy stage_connections_delete on public.stage_connections for delete to authenticated
  using (public.owns_workflow(workflow_id));
