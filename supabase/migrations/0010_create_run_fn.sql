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
