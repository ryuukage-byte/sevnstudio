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
