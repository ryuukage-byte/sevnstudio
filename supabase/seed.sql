-- Local development seed only. Do NOT run against a shared or production database.
-- Creates one dev user (dev@sevn.local, password in this file is a throwaway test value) and a sample project.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'dev@sevn.local', crypt('devpassword123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
values (
  gen_random_uuid(), '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"dev@sevn.local"}', 'email', now(), now(), now()
) on conflict do nothing;

insert into public.projects (id, owner_id, name)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Trip Jepang (contoh)')
on conflict (id) do nothing;

insert into public.workflows (id, project_id, name)
values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'Travel Checklist')
on conflict (id) do nothing;
