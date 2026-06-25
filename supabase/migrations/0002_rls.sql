-- =============================================================================
-- Migration 0002: Row-Level Security
--
-- Enforces role-based access at the DATABASE layer. A participant can NEVER
-- read another participant's data; case_notes are invisible to participants.
-- Run AFTER 0001_schema.sql. Safe to re-run (drops policies before creating).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECURITY DEFINER helpers — query profiles/participants as owner so policies
-- don't recurse through RLS on the same tables.
-- -----------------------------------------------------------------------------
create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_participant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.participants where profile_id = auth.uid();
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('staff','admin'), false);
$$;

revoke all on function public.current_role() from public;
revoke all on function public.my_participant_id() from public;
revoke all on function public.is_staff_or_admin() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.my_participant_id() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS on every table
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','participants','enrollments','curriculum_modules',
    'lesson_progress','attendance','assessments','career_interests','goals',
    'milestones','case_notes','transition_plans','documents','employers',
    'work_based_learning','outcomes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Helper: drop a policy if it exists (keeps this migration idempotent)
create or replace function public._drop_policy(p_name text, p_table text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I;', p_name, p_table);
end $$;

-- =============================================================================
-- profiles
-- =============================================================================
select public._drop_policy('profiles_select_self', 'profiles');
select public._drop_policy('profiles_select_staff', 'profiles');
select public._drop_policy('profiles_update_self', 'profiles');

create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles
  for select using (public.is_staff_or_admin());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- =============================================================================
-- participants  (the row's own id is the participant id)
-- =============================================================================
select public._drop_policy('participants_select', 'participants');
select public._drop_policy('participants_write_staff', 'participants');

create policy participants_select on public.participants
  for select using (
    id = public.my_participant_id() or public.is_staff_or_admin()
  );
create policy participants_write_staff on public.participants
  for all using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- =============================================================================
-- Participant-scoped tables: participant reads own rows; staff/admin full access
-- (generated to keep policies consistent across the many child tables)
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'enrollments','lesson_progress','attendance','assessments',
    'career_interests','goals','milestones','transition_plans','outcomes',
    'work_based_learning','documents'
  ]
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format('drop policy if exists %I on public.%I;', t || '_write_staff', t);

    -- participant may SELECT rows that belong to them; staff/admin may select all
    execute format($f$
      create policy %I on public.%I
        for select using (
          participant_id = public.my_participant_id() or public.is_staff_or_admin()
        );
    $f$, t || '_select', t);

    -- staff/admin may INSERT/UPDATE/DELETE everything
    execute format($f$
      create policy %I on public.%I
        for all using (public.is_staff_or_admin())
        with check (public.is_staff_or_admin());
    $f$, t || '_write_staff', t);
  end loop;
end $$;

-- Documents: additionally let a participant upload (insert) their OWN documents.
select public._drop_policy('documents_insert_self', 'documents');
create policy documents_insert_self on public.documents
  for insert with check (participant_id = public.my_participant_id());

-- =============================================================================
-- case_notes — STAFF / ADMIN ONLY. Participants have NO access.
-- =============================================================================
select public._drop_policy('casenotes_all_staff', 'case_notes');
create policy casenotes_all_staff on public.case_notes
  for all using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- =============================================================================
-- curriculum_modules — readable by all authenticated (participants see syllabus),
-- writable by staff/admin.
-- =============================================================================
select public._drop_policy('modules_select_all', 'curriculum_modules');
select public._drop_policy('modules_write_staff', 'curriculum_modules');
create policy modules_select_all on public.curriculum_modules
  for select using (auth.uid() is not null);
create policy modules_write_staff on public.curriculum_modules
  for all using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- =============================================================================
-- employers — staff/admin only.
-- =============================================================================
select public._drop_policy('employers_all_staff', 'employers');
create policy employers_all_staff on public.employers
  for all using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop function if exists public._drop_policy(text, text);
