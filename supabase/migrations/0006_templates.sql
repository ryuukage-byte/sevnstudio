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
