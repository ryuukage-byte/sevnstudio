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
