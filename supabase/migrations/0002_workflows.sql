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
