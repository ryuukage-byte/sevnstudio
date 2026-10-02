-- GENERATED: all migrations concatenated in order. Do not edit; edit supabase/migrations/*.sql and regenerate.
-- Paste into the Supabase SQL Editor on a NEW, empty project and run once.

-- ===== migrations/0001_projects.sql =====
-- projects: container for one body of work. Owner = auth user.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
create policy projects_select on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));
create policy projects_insert on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy projects_update on public.projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_delete on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Ownership helper used by policies of child tables. SECURITY DEFINER avoids recursive RLS lookups.
create or replace function public.owns_project(p_project_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = (select auth.uid()));
$$;
revoke all on function public.owns_project(uuid) from public, anon;
grant execute on function public.owns_project(uuid) to authenticated;

-- ===== migrations/0002_workflows.sql =====
-- workflows: graph definition container. No status (definition != execution).
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflows_project_idx on public.workflows (project_id);
create trigger workflows_updated_at before update on public.workflows
  for each row execute function public.set_updated_at();

alter table public.workflows enable row level security;
create policy workflows_select on public.workflows for select to authenticated
  using (public.owns_project(project_id));
create policy workflows_insert on public.workflows for insert to authenticated
  with check (public.owns_project(project_id));
create policy workflows_update on public.workflows for update to authenticated
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy workflows_delete on public.workflows for delete to authenticated
  using (public.owns_project(project_id));

create or replace function public.owns_workflow(p_workflow_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workflows w
    join public.projects p on p.id = w.project_id
    where w.id = p_workflow_id and p.owner_id = (select auth.uid()));
$$;
revoke all on function public.owns_workflow(uuid) from public, anon;
grant execute on function public.owns_workflow(uuid) to authenticated;

-- ===== migrations/0003_stages.sql =====
-- stages: nodes on the canvas. Definition only: no status column.
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  type text not null check (type in ('checklist','task','note','group','review','ai','api')),
  name text not null check (char_length(name) between 1 and 120),
  config jsonb not null default '{}'::jsonb,
  mode text not null default 'manual' check (mode in ('manual','semi_auto','auto')),
  -- canvas position lives here but is not part of the graph logic; moving a node never versions anything.
  pos_x double precision not null default 0,
  pos_y double precision not null default 0,
  parent_group_id uuid references public.stages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_group_id is distinct from id),
  unique (id, workflow_id)
);
create index stages_workflow_idx on public.stages (workflow_id);
create index stages_parent_group_idx on public.stages (parent_group_id);
create trigger stages_updated_at before update on public.stages
  for each row execute function public.set_updated_at();

-- A group's members must be in the same workflow and the parent must be of type 'group'.
create or replace function public.stages_check_parent_group() returns trigger
language plpgsql as $$
begin
  if new.parent_group_id is not null then
    if not exists (
      select 1 from public.stages g
      where g.id = new.parent_group_id and g.workflow_id = new.workflow_id and g.type = 'group'
    ) then
      raise exception 'parent_group_id must reference a group stage in the same workflow';
    end if;
  end if;
  return new;
end $$;
create trigger stages_parent_group_check before insert or update of parent_group_id, workflow_id on public.stages
  for each row execute function public.stages_check_parent_group();

alter table public.stages enable row level security;
create policy stages_select on public.stages for select to authenticated
  using (public.owns_workflow(workflow_id));
create policy stages_insert on public.stages for insert to authenticated
  with check (public.owns_workflow(workflow_id));
create policy stages_update on public.stages for update to authenticated
  using (public.owns_workflow(workflow_id)) with check (public.owns_workflow(workflow_id));
create policy stages_delete on public.stages for delete to authenticated
  using (public.owns_workflow(workflow_id));

create or replace function public.owns_stage(p_stage_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.stages s
    join public.workflows w on w.id = s.workflow_id
    join public.projects p on p.id = w.project_id
    where s.id = p_stage_id and p.owner_id = (select auth.uid()));
$$;
revoke all on function public.owns_stage(uuid) from public, anon;
grant execute on function public.owns_stage(uuid) to authenticated;

-- ===== migrations/0004_stage_connections.sql =====
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

-- ===== migrations/0005_items.sql =====
-- items: content of Checklist stages (definition). No done/status column; checks live in run_items.
create table public.items (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  qty integer not null default 1 check (qty >= 0),
  note text,
  due_date date,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_stage_idx on public.items (stage_id, sort_order);
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;
create policy items_select on public.items for select to authenticated
  using (public.owns_stage(stage_id));
create policy items_insert on public.items for insert to authenticated
  with check (public.owns_stage(stage_id));
create policy items_update on public.items for update to authenticated
  using (public.owns_stage(stage_id)) with check (public.owns_stage(stage_id));
create policy items_delete on public.items for delete to authenticated
  using (public.owns_stage(stage_id));

-- ===== migrations/0006_templates.sql =====
-- templates: a saved, frozen snapshot of a workflow definition (built by @sevn/engine buildSnapshot).
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index templates_owner_idx on public.templates (owner_id);
create trigger templates_updated_at before update on public.templates
  for each row execute function public.set_updated_at();

alter table public.templates enable row level security;
create policy templates_select on public.templates for select to authenticated
  using (owner_id = (select auth.uid()));
create policy templates_insert on public.templates for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy templates_update on public.templates for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy templates_delete on public.templates for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ===== migrations/0007_runs.sql =====
-- runs: one execution of a workflow. Holds its own snapshot so later edits never change old runs.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workflow_id uuid references public.workflows (id) on delete set null,
  template_id uuid references public.templates (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index runs_project_idx on public.runs (project_id, created_at desc);
create trigger runs_updated_at before update on public.runs
  for each row execute function public.set_updated_at();

alter table public.runs enable row level security;
create policy runs_select on public.runs for select to authenticated
  using (public.owns_project(project_id));
create policy runs_insert on public.runs for insert to authenticated
  with check (public.owns_project(project_id));
create policy runs_update on public.runs for update to authenticated
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy runs_delete on public.runs for delete to authenticated
  using (public.owns_project(project_id));

create or replace function public.owns_run(p_run_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.runs r
    join public.projects p on p.id = r.project_id
    where r.id = p_run_id and p.owner_id = (select auth.uid()));
$$;
revoke all on function public.owns_run(uuid) from public, anon;
grant execute on function public.owns_run(uuid) to authenticated;

-- ===== migrations/0008_stage_runs.sql =====
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

-- ===== migrations/0009_run_items.sql =====
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

-- ===== migrations/0010_create_run_fn.sql =====
-- create_run: atomically inserts a run and its run_items from a snapshot built in the app (@sevn/engine buildSnapshot).
-- SECURITY INVOKER: RLS applies, so the caller must own the project.
create or replace function public.create_run(
  p_project_id uuid,
  p_name text,
  p_snapshot jsonb,
  p_workflow_id uuid default null,
  p_template_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_run_id uuid;
begin
  insert into public.runs (project_id, workflow_id, template_id, name, snapshot)
  values (p_project_id, p_workflow_id, p_template_id, p_name, p_snapshot)
  returning id into v_run_id;

  insert into public.run_items (run_id, stage_id, source_item_id, title, qty, note, due_date, sort_order)
  select v_run_id,
         (i ->> 'stageId')::uuid,
         (i ->> 'id')::uuid,
         i ->> 'title',
         coalesce((i ->> 'qty')::int, 1),
         i ->> 'note',
         nullif(i ->> 'dueDate', '')::date,
         coalesce((i ->> 'sortOrder')::double precision, 0)
  from jsonb_array_elements(coalesce(p_snapshot -> 'items', '[]'::jsonb)) as i;

  return v_run_id;
end $$;
revoke all on function public.create_run(uuid, text, jsonb, uuid, uuid) from public, anon;
grant execute on function public.create_run(uuid, text, jsonb, uuid, uuid) to authenticated;

-- ===== migrations/0011_projects_description.sql =====
-- projects.description: short free text shown under the project title (filled from a preset's goal, editable by the owner).
-- Nullable and additive; existing RLS policies on projects already cover the new column.
alter table public.projects
  add column if not exists description text
  check (description is null or char_length(description) <= 500);

-- ===== migrations/0012_cleanup_group_and_add_input.sql =====
-- 0012_cleanup_group_and_add_input.sql
-- 1. Remove legacy 'group' stages (groups are now derived dynamically from graph edges).
delete from public.stages where type = 'group';

-- 2. Drop parent_group_id trigger, function, index, and column.
drop trigger if exists stages_parent_group_check on public.stages;
drop function if exists public.stages_check_parent_group();
drop index if exists public.stages_parent_group_idx;
alter table public.stages drop column if exists parent_group_id;

-- 3. Update stage type check: remove 'group', add 'input'.
alter table public.stages drop constraint if exists stages_type_check;
alter table public.stages add constraint stages_type_check
  check (type in ('checklist', 'task', 'note', 'input', 'review', 'ai', 'api'));

-- 4. Add outputs column to stage_runs for storing stage run results (e.g. text from input stages, artifacts/JSON).
alter table public.stage_runs
  add column if not exists outputs jsonb not null default '{}'::jsonb;
