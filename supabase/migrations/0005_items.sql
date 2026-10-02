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
