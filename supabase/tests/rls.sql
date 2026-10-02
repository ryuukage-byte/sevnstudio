-- Manual RLS check (NOT yet executed: no database available when written).
--   psql "$DATABASE_URL" -f supabase/tests/rls.sql
-- Creates two users, asserts user B cannot see or touch user A's rows. Rolls back at the end.
begin;
insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
insert into public.projects (id, name) values ('10000000-0000-0000-0000-000000000001', 'A project');
insert into public.workflows (id, project_id, name) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'wf');
insert into public.stages (id, workflow_id, type, name) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'checklist', 's');
insert into public.items (stage_id, title) values ('30000000-0000-0000-0000-000000000001', 'Paspor');
select public.create_run('10000000-0000-0000-0000-000000000001', 'run A', '{"items":[{"id":"40000000-0000-0000-0000-000000000001","stageId":"30000000-0000-0000-0000-000000000001","title":"Paspor"}]}'::jsonb);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.projects;   assert n = 0, 'B sees A projects';
  select count(*) into n from public.workflows;  assert n = 0, 'B sees A workflows';
  select count(*) into n from public.stages;     assert n = 0, 'B sees A stages';
  select count(*) into n from public.items;      assert n = 0, 'B sees A items';
  select count(*) into n from public.runs;       assert n = 0, 'B sees A runs';
  select count(*) into n from public.run_items;  assert n = 0, 'B sees A run_items';
  begin
    insert into public.workflows (project_id, name) values ('10000000-0000-0000-0000-000000000001', 'evil');
    raise exception 'B inserted into A project';
  exception when insufficient_privilege then null; -- RLS violation (42501) is expected
  end;
  update public.projects set name = 'hacked';
  get diagnostics n = row_count; assert n = 0, 'B updated A project';
end $$;
rollback;
