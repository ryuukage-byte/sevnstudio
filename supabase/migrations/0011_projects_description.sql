-- projects.description: short free text shown under the project title (filled from a preset's goal, editable by the owner).
-- Nullable and additive; existing RLS policies on projects already cover the new column.
alter table public.projects
  add column if not exists description text
  check (description is null or char_length(description) <= 500);
