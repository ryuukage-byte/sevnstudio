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
