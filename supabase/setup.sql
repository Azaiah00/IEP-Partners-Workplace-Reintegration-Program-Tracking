-- =============================================================================
-- IEP Partners — Workplace Reintegration Program Portal
-- COMBINED SETUP — single paste for the Supabase SQL Editor.
--
-- Runs the full database build in dependency order:
--   extensions → enums → helper functions → tables → indexes → triggers
--   → RLS policies → storage bucket + policies
--
-- Idempotent: safe to run more than once.
-- (Concatenation of supabase/migrations/0001–0004 and 0006–0008. Run any missing
--  files individually if you set up from an older copy of this script.)
-- =============================================================================

-- =========================== EXTENSIONS ======================================
create extension if not exists "pgcrypto";       -- gen_random_uuid()

-- =========================== ENUMS ===========================================
do $$ begin
  create type user_role as enum ('participant', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type program_tier as enum ('tier_1', 'tier_2', 'tier_3');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('enrolled', 'active', 'on_hold', 'completed', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type progress_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('present', 'absent', 'excused', 'late');
exception when duplicate_object then null; end $$;

do $$ begin
  create type milestone_status as enum ('pending', 'achieved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('open', 'in_progress', 'achieved', 'deferred');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wbl_type as enum ('job_shadow', 'work_based_learning', 'paid_work_experience');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employment_status as enum ('unemployed', 'searching', 'placed', 'retained_30', 'retained_90', 'retained_180');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_type as enum ('resume', 'certificate', 'credential', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employer_stage as enum ('prospect', 'contacted', 'partner', 'hiring', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assessment_type as enum ('workforce_readiness', 'career_interest', 'skills_self_eval');
exception when duplicate_object then null; end $$;

-- =========================== HELPER FUNCTIONS ================================
-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create a profile row whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'participant')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =========================== TABLES ==========================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        user_role not null default 'participant',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- profile auto-create trigger (after profiles exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.participants (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references public.profiles(id) on delete set null,
  participant_code  text unique not null,
  date_of_birth     date,
  phone             text,
  referral_source   text,
  region            text,
  intake_date       date not null default current_date,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  status            enrollment_status not null default 'enrolled',
  current_tier      program_tier not null default 'tier_1',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.enrollments (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  tier            program_tier not null,
  start_date      date not null default current_date,
  target_end_date date,
  status          enrollment_status not null default 'active',
  completion_pct  numeric(5,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.curriculum_modules (
  id          uuid primary key default gen_random_uuid(),
  tier        program_tier not null,
  name        text not null,
  description text,
  sequence    int not null default 0,
  created_at  timestamptz not null default now(),
  unique (tier, name)
);

create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  module_id       uuid not null references public.curriculum_modules(id) on delete cascade,
  status          progress_status not null default 'not_started',
  completed_at    timestamptz,
  staff_id        uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (participant_id, module_id)
);

create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  session_date    date not null default current_date,
  status          attendance_status not null default 'present',
  staff_id        uuid references public.profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (participant_id, session_date)
);

create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  type            assessment_type not null,
  score           numeric,
  summary         text,
  taken_on        date not null default current_date,
  staff_id        uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.career_interests (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.participants(id) on delete cascade,
  interest          text not null,
  riasec_or_sector  text,
  rank              int not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  title           text not null,
  detail          text,
  status          goal_status not null default 'open',
  target_date     date,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.milestones (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  name            text not null,
  status          milestone_status not null default 'pending',
  achieved_on     date,
  sequence        int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.case_notes (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  staff_id        uuid references public.profiles(id) on delete set null,
  note            text not null,
  category        text,
  created_at      timestamptz not null default now()
);

create table if not exists public.transition_plans (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.participants(id) on delete cascade,
  summary           text,
  barriers          text[] not null default '{}',
  support_services  text[] not null default '{}',
  target_career     text,
  updated_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (participant_id)
);

create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  type            doc_type not null default 'other',
  title           text not null,
  storage_path    text,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.employers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  industry        text,
  contact_name    text,
  contact_email   text,
  stage           employer_stage not null default 'prospect',
  region          text,
  notes           text,
  owner_staff_id  uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.work_based_learning (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  employer_id     uuid references public.employers(id) on delete set null,
  type            wbl_type not null,
  start_date      date,
  end_date        date,
  hours           numeric(6,1) not null default 0,
  status          text,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.outcomes (
  id                   uuid primary key default gen_random_uuid(),
  participant_id       uuid not null references public.participants(id) on delete cascade,
  employment_status    employment_status not null default 'unemployed',
  employer_id          uuid references public.employers(id) on delete set null,
  job_title            text,
  hourly_wage          numeric(8,2),
  placement_date       date,
  retention_check_date date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- =========================== INDEXES =========================================
create index if not exists idx_participants_profile  on public.participants(profile_id);
create index if not exists idx_participants_staff    on public.participants(assigned_staff_id);
create index if not exists idx_participants_status   on public.participants(status);
create index if not exists idx_participants_region   on public.participants(region);
create index if not exists idx_enrollments_participant on public.enrollments(participant_id);
create index if not exists idx_enrollments_status    on public.enrollments(status);
create index if not exists idx_modules_tier          on public.curriculum_modules(tier, sequence);
create index if not exists idx_lp_participant        on public.lesson_progress(participant_id);
create index if not exists idx_lp_module             on public.lesson_progress(module_id);
create index if not exists idx_attendance_participant on public.attendance(participant_id);
create index if not exists idx_attendance_date       on public.attendance(session_date);
create index if not exists idx_assessments_participant on public.assessments(participant_id);
create index if not exists idx_career_participant    on public.career_interests(participant_id);
create index if not exists idx_goals_participant     on public.goals(participant_id);
create index if not exists idx_milestones_participant on public.milestones(participant_id);
create index if not exists idx_casenotes_participant on public.case_notes(participant_id);
create index if not exists idx_transition_participant on public.transition_plans(participant_id);
create index if not exists idx_documents_participant on public.documents(participant_id);
create index if not exists idx_employers_stage       on public.employers(stage);
create index if not exists idx_wbl_participant       on public.work_based_learning(participant_id);
create index if not exists idx_wbl_employer          on public.work_based_learning(employer_id);
create index if not exists idx_outcomes_participant  on public.outcomes(participant_id);
create index if not exists idx_outcomes_status       on public.outcomes(employment_status);

-- =========================== updated_at TRIGGERS =============================
do $$
declare t text;
begin
  foreach t in array array['participants','enrollments','transition_plans','employers','outcomes']
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =========================== RLS HELPERS =====================================
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_participant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.participants where profile_id = auth.uid();
$$;

create or replace function public.is_staff_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('staff','admin'), false);
$$;

revoke all on function public.current_role() from public;
revoke all on function public.my_participant_id() from public;
revoke all on function public.is_staff_or_admin() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.my_participant_id() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;

-- =========================== ENABLE RLS ======================================
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

create or replace function public._drop_policy(p_name text, p_table text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I;', p_name, p_table);
end $$;

-- ---- profiles ----
select public._drop_policy('profiles_select_self', 'profiles');
select public._drop_policy('profiles_select_staff', 'profiles');
select public._drop_policy('profiles_update_self', 'profiles');
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles
  for select using (public.is_staff_or_admin());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- participants may read STAFF/ADMIN profile names (to see their case manager)
select public._drop_policy('profiles_select_staff_public', 'profiles');
create policy profiles_select_staff_public on public.profiles
  for select using (auth.uid() is not null and role in ('staff','admin'));

-- ---- participants ----
select public._drop_policy('participants_select', 'participants');
select public._drop_policy('participants_write_staff', 'participants');
create policy participants_select on public.participants
  for select using (id = public.my_participant_id() or public.is_staff_or_admin());
create policy participants_write_staff on public.participants
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ---- participant-scoped child tables ----
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
    execute format($f$
      create policy %I on public.%I
        for select using (
          participant_id = public.my_participant_id() or public.is_staff_or_admin()
        );
    $f$, t || '_select', t);
    execute format($f$
      create policy %I on public.%I
        for all using (public.is_staff_or_admin())
        with check (public.is_staff_or_admin());
    $f$, t || '_write_staff', t);
  end loop;
end $$;

-- participant may upload (insert) their OWN documents
select public._drop_policy('documents_insert_self', 'documents');
create policy documents_insert_self on public.documents
  for insert with check (participant_id = public.my_participant_id());

-- ---- case_notes: STAFF/ADMIN ONLY ----
select public._drop_policy('casenotes_all_staff', 'case_notes');
create policy casenotes_all_staff on public.case_notes
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ---- curriculum_modules: read by all authenticated, write staff/admin ----
select public._drop_policy('modules_select_all', 'curriculum_modules');
select public._drop_policy('modules_write_staff', 'curriculum_modules');
create policy modules_select_all on public.curriculum_modules
  for select using (auth.uid() is not null);
create policy modules_write_staff on public.curriculum_modules
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ---- employers: staff/admin only ----
select public._drop_policy('employers_all_staff', 'employers');
create policy employers_all_staff on public.employers
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop function if exists public._drop_policy(text, text);

-- =========================== STORAGE =========================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents read own or staff" on storage.objects;
drop policy if exists "documents insert own or staff" on storage.objects;
drop policy if exists "documents update staff" on storage.objects;
drop policy if exists "documents delete staff" on storage.objects;

create policy "documents read own or staff" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.is_staff_or_admin()
      or (storage.foldername(name))[1] = public.my_participant_id()::text
    )
  );
create policy "documents insert own or staff" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (
      public.is_staff_or_admin()
      or (storage.foldername(name))[1] = public.my_participant_id()::text
    )
  );
create policy "documents update staff" on storage.objects
  for update using (bucket_id = 'documents' and public.is_staff_or_admin());
create policy "documents delete staff" on storage.objects
  for delete using (bucket_id = 'documents' and public.is_staff_or_admin());


-- =========================== MIGRATIONS 0004, 0006�0008 ======================

-- --- 0004_participant_reads.sql ---
-- =============================================================================
-- Migration 0004: Let participants see their case manager's name.
--
-- Participants can already read only their OWN profile. This adds read access to
-- STAFF/ADMIN profiles (names only are exposed in the UI) so a participant can
-- see who their assigned case manager is. Does NOT expose other participants.
-- Run AFTER 0002_rls.sql. Safe to re-run.
-- =============================================================================

drop policy if exists profiles_select_staff_public on public.profiles;
create policy profiles_select_staff_public on public.profiles
  for select using (
    auth.uid() is not null and role in ('staff', 'admin')
  );


-- --- 0006_multi_tenant.sql ---
-- 0006_multi_tenant.sql
-- Multi-tenant foundation: IEP Partners (master/super-admin) oversees multiple
-- client organizations (correctional facilities, jails, agencies). Each org has
-- its own admin, staff, and participants.
--
-- PHASE 1 (this migration) is intentionally ADDITIVE and SAFE to run on the live
-- demo: new columns are nullable, existing RLS keeps working, and the new
-- super_admin role is granted global access. Organization separation for org
-- admins is enforced at the application/query layer in this phase (consistent
-- with demo logins / no real auth gating). PHASE 2 (when real auth is added)
-- will tighten RLS to hard org isolation.
--
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- 1. New role: super_admin (IEP master). Added without being referenced as an
--    enum literal in this same script (we compare via ::text) to avoid the
--    "unsafe use of new enum value" restriction inside a transaction.
-- ---------------------------------------------------------------------------
alter type user_role add value if not exists 'super_admin';

-- ---------------------------------------------------------------------------
-- 2. Organization type enum
-- ---------------------------------------------------------------------------
do $
begin
  if not exists (select 1 from pg_type where typname = 'org_type') then
    create type org_type as enum ('iep_master', 'correctional_facility', 'jail', 'agency');
  end if;
end $;

-- ---------------------------------------------------------------------------
-- 3. Organizations table (tenants)
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  type        org_type not null default 'correctional_facility',
  city        text,
  county      text,
  state       text default 'VA',
  capacity    int,
  operator    text,
  website     text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at trigger (reuse existing set_updated_at() helper from 0001)
drop trigger if exists trg_org_updated on public.organizations;
create trigger trg_org_updated before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Tenant columns on profiles and participants
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.participants
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_profiles_org on public.profiles(organization_id);
create index if not exists idx_participants_org on public.participants(organization_id);

-- ---------------------------------------------------------------------------
-- 5. Consent & data-governance fields on participants (from data strategy).
--    All nullable / default false — additive and safe.
-- ---------------------------------------------------------------------------
alter table public.participants
  add column if not exists consent_signed_at            timestamptz,
  add column if not exists consent_program              boolean not null default false,
  add column if not exists consent_outcome_followup     boolean not null default false,
  add column if not exists consent_wage_match           boolean not null default false,
  add column if not exists consent_research_deid        boolean not null default false,
  add column if not exists consent_aggregate_reporting  boolean not null default false,
  add column if not exists consent_employer_matching    boolean not null default false,
  add column if not exists consent_health               boolean not null default false,
  add column if not exists consent_justice              boolean not null default false,
  add column if not exists data_retention_until         date;

-- ---------------------------------------------------------------------------
-- 6. Security helper functions
-- ---------------------------------------------------------------------------

-- True for IEP master/super-admin (compare via ::text so this is safe even in
-- the same transaction that adds the enum value).
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $
  select coalesce(
    (select role::text from public.profiles where id = auth.uid()) = 'super_admin',
    false
  );
$;

-- The caller's organization (null for super-admin / IEP master).
create or replace function public.my_org()
returns uuid
language sql stable security definer set search_path = public
as $
  select organization_id from public.profiles where id = auth.uid();
$;

-- Extend staff/admin check to include super_admin (so existing policies that
-- already use is_staff_or_admin() grant the IEP master global access too).
create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer set search_path = public
as $
  select coalesce(
    (select role::text from public.profiles where id = auth.uid())
      in ('staff', 'admin', 'super_admin'),
    false
  );
$;

-- ---------------------------------------------------------------------------
-- 7. RLS for organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (auth.uid() is not null);

drop policy if exists organizations_write_super on public.organizations;
create policy organizations_write_super on public.organizations
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 8. Seed the tenants (fixed UUIDs so the seed script can reference them).
--    Details sourced from each facility's official information.
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, type, city, county, state, capacity, operator, website, notes)
values
  ('11111111-1111-1111-1111-111111111111',
   'IEP Partners', 'iep-partners', 'iep_master',
   null, null, 'VA', null, 'IEP Partners',
   'https://iepworkplacereintegration-portal.netlify.app',
   'Master oversight organization. Operates the Workplace Reintegration Program across all client sites.'),
  ('22222222-2222-2222-2222-222222222222',
   'Newport News Sheriff''s Office — Re-Entry Division', 'newport-news', 'jail',
   'Newport News', 'Newport News', 'VA', 600, 'Newport News Sheriff''s Office',
   'https://www.nnsheriff.org',
   'City jail + minimum-security re-entry annex. Avg daily population ~450. State leader in re-entry services (GED, SNAP/Step-Up job training, MAT/SAARA treatment).'),
  ('33333333-3333-3333-3333-333333333333',
   'Greensville Correctional Center', 'greensville', 'correctional_facility',
   'Jarratt', 'Greensville', 'VA', 3400, 'Virginia Department of Corrections',
   'https://vadoc.virginia.gov',
   'One of Virginia''s largest state prisons (medium security, ~3,000+ population). ABE/GED, Virginia Correctional Enterprises vocational training, RIDUP substance-use program.'),
  ('44444444-4444-4444-4444-444444444444',
   'Riverside Regional Jail', 'riverside', 'jail',
   'North Prince George', 'Prince George', 'VA', 1500, 'Riverside Regional Jail Authority',
   'https://rrjva.org',
   '1,500-bed direct-supervision regional jail serving 7 member localities (Charles City, Chesterfield, Prince George, Surry, Colonial Heights, Hopewell, Petersburg). Work Release / Re-Entry and Therapeutic Community programming.')
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  city = excluded.city,
  county = excluded.county,
  capacity = excluded.capacity,
  operator = excluded.operator,
  website = excluded.website,
  notes = excluded.notes;

-- ---------------------------------------------------------------------------
-- Done. Next: run the seed script (npm run seed) to create the IEP master
-- admins + 3 org admins and assign every profile/participant to an org.
-- ---------------------------------------------------------------------------


-- --- 0007_courses.sql ---
-- 0007_courses.sql
-- Learning Management System: real courses (workforce readiness, emotional
-- readiness, digital, and 5 trade tracks) with lessons, trade-simulation
-- placeholders, graded quizzes, and per-participant progress + quiz scores.
-- Additive and safe to re-run (idempotent). Content is loaded by the seed
-- script from supabase/content/courses.json.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $
begin
  if not exists (select 1 from pg_type where typname = 'lesson_kind') then
    create type lesson_kind as enum ('reading', 'simulation', 'video', 'quiz');
  end if;
end $;

-- ---------------------------------------------------------------------------
-- Catalog: courses -> lessons ; courses -> quiz -> quiz_questions
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  track       text not null,                 -- workforce_readiness | emotional_readiness | digital | trades
  title       text not null,
  description text,
  tier        program_tier,                  -- optional mapping to the 3-tier program
  is_trade    boolean not null default false,
  icon        text,                          -- lucide-react icon name
  est_hours   numeric,
  sequence    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.lessons (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  slug            text not null,
  title           text not null,
  kind            lesson_kind not null default 'reading',
  sequence        int not null default 0,
  content         text,
  sim_type        text,
  sim_inspiration text,
  created_at      timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  pass_score  int not null default 70,
  created_at  timestamptz not null default now(),
  unique (course_id)
);

create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  sequence      int not null default 0,
  prompt        text not null,
  options       jsonb not null,              -- array of 4 option strings
  correct_index int not null,
  explanation   text
);

-- ---------------------------------------------------------------------------
-- Participant progress + quiz scores
-- ---------------------------------------------------------------------------
create table if not exists public.course_progress (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  status         progress_status not null default 'not_started',
  completion_pct int not null default 0,
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (participant_id, course_id)
);

create table if not exists public.course_lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  lesson_id      uuid not null references public.lessons(id) on delete cascade,
  status         progress_status not null default 'not_started',
  completed_at   timestamptz,
  unique (participant_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  score          int not null,
  passed         boolean not null default false,
  answers        jsonb,
  taken_at       timestamptz not null default now()
);

-- Indexes
create index if not exists idx_lessons_course on public.lessons(course_id);
create index if not exists idx_quiz_questions_quiz on public.quiz_questions(quiz_id);
create index if not exists idx_course_progress_part on public.course_progress(participant_id);
create index if not exists idx_course_lesson_progress_part on public.course_lesson_progress(participant_id);
create index if not exists idx_quiz_attempts_part on public.quiz_attempts(participant_id);

-- updated_at triggers
drop trigger if exists trg_courses_updated on public.courses;
create trigger trg_courses_updated before update on public.courses
  for each row execute function public.set_updated_at();
drop trigger if exists trg_course_progress_updated on public.course_progress;
create trigger trg_course_progress_updated before update on public.course_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.courses                enable row level security;
alter table public.lessons                enable row level security;
alter table public.quizzes                enable row level security;
alter table public.quiz_questions         enable row level security;
alter table public.course_progress        enable row level security;
alter table public.course_lesson_progress enable row level security;
alter table public.quiz_attempts          enable row level security;

-- Catalog content: readable by any signed-in user.
do $
declare t text;
begin
  foreach t in array array['courses','lessons','quizzes','quiz_questions']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('create policy %I_select on public.%I for select using (auth.uid() is not null);', t, t);
  end loop;
end $;

-- Progress + attempts: participant sees/writes own; staff/admin/super see all.
do $
declare t text;
begin
  foreach t in array array['course_progress','course_lesson_progress','quiz_attempts']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format($p$create policy %I_select on public.%I for select
        using (public.is_staff_or_admin() or participant_id = public.my_participant_id());$p$, t, t);
    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format($p$create policy %I_insert on public.%I for insert
        with check (participant_id = public.my_participant_id() or public.is_staff_or_admin());$p$, t, t);
    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format($p$create policy %I_update on public.%I for update
        using (participant_id = public.my_participant_id() or public.is_staff_or_admin());$p$, t, t);
  end loop;
end $;


-- --- 0008_jobs_engine.sql ---
-- 0008_jobs_engine.sql
-- Virginia jobs & opportunity engine: live job opportunities + workforce
-- resources, with participant readiness fields and application/match tracking
-- so staff can guide participants toward jobs they are (or are nearly) ready for.
-- Additive and safe to re-run. Data loaded by seed from supabase/content/va_jobs.json.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $
begin
  if not exists (select 1 from pg_type where typname = 'job_employment_type') then
    create type job_employment_type as enum ('full_time', 'part_time', 'temp', 'apprenticeship');
  end if;
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type job_status as enum ('open', 'filled', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type application_status as enum
      ('matched', 'interested', 'preparing', 'applied', 'interviewing', 'offer', 'hired', 'not_pursued');
  end if;
end $;

-- ---------------------------------------------------------------------------
-- Reference: workforce / reentry resources + labor-market sectors
-- ---------------------------------------------------------------------------
create table if not exists public.job_resources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,                 -- 'resource' | 'sector' | program type
  description text,
  url         text,
  meta        jsonb,                -- e.g. {outlook, typical_wage} for sectors
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Job opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.job_opportunities (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  employer         text not null,
  industry         text,
  city             text,
  region           text,
  wage_min         numeric,
  wage_max         numeric,
  wage_unit        text default 'hour',
  employment_type  job_employment_type default 'full_time',
  reentry_friendly boolean not null default false,
  requirements     jsonb,                 -- array of requirement strings
  matched_track    text,                  -- e.g. trades-electrical | warehouse | cdl ...
  description      text,
  source_url       text,
  posted_date      date,
  status           job_status not null default 'open',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Participant readiness fields (additive) to support job matching
-- ---------------------------------------------------------------------------
alter table public.participants
  add column if not exists has_drivers_license boolean not null default false,
  add column if not exists has_cdl             boolean not null default false,
  add column if not exists cdl_class           text,
  add column if not exists transportation_ok   boolean not null default false,
  add column if not exists bonding_eligible     boolean not null default false;

-- ---------------------------------------------------------------------------
-- Applications / matches: a participant tracked against a job
-- ---------------------------------------------------------------------------
create table if not exists public.job_applications (
  id                  uuid primary key default gen_random_uuid(),
  participant_id      uuid not null references public.participants(id) on delete cascade,
  job_id              uuid not null references public.job_opportunities(id) on delete cascade,
  status              application_status not null default 'matched',
  fit_score           int,                 -- 0..100 readiness/fit
  missing_requirements jsonb,              -- array of unmet requirement strings
  staff_notes         text,
  staff_id            uuid references public.profiles(id) on delete set null,
  applied_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (participant_id, job_id)
);

-- Indexes
create index if not exists idx_jobs_track on public.job_opportunities(matched_track);
create index if not exists idx_jobs_region on public.job_opportunities(region);
create index if not exists idx_jobs_status on public.job_opportunities(status);
create index if not exists idx_job_apps_part on public.job_applications(participant_id);
create index if not exists idx_job_apps_job on public.job_applications(job_id);

-- updated_at triggers
drop trigger if exists trg_jobs_updated on public.job_opportunities;
create trigger trg_jobs_updated before update on public.job_opportunities
  for each row execute function public.set_updated_at();
drop trigger if exists trg_job_apps_updated on public.job_applications;
create trigger trg_job_apps_updated before update on public.job_applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.job_resources     enable row level security;
alter table public.job_opportunities enable row level security;
alter table public.job_applications  enable row level security;

-- Resources + opportunities: readable by any signed-in user; writable by staff/admin/super.
do $
declare t text;
begin
  foreach t in array array['job_resources','job_opportunities']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('create policy %I_select on public.%I for select using (auth.uid() is not null);', t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format($p$create policy %I_write on public.%I for all
        using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());$p$, t, t);
  end loop;
end $;

-- Applications: participant sees/updates own; staff/admin/super see + manage all.
drop policy if exists job_applications_select on public.job_applications;
create policy job_applications_select on public.job_applications for select
  using (public.is_staff_or_admin() or participant_id = public.my_participant_id());
drop policy if exists job_applications_insert on public.job_applications;
create policy job_applications_insert on public.job_applications for insert
  with check (participant_id = public.my_participant_id() or public.is_staff_or_admin());
drop policy if exists job_applications_update on public.job_applications;
create policy job_applications_update on public.job_applications for update
  using (participant_id = public.my_participant_id() or public.is_staff_or_admin());

-- =========================== DONE ============================================
-- Verify: select tablename, rowsecurity from pg_tables
--         where schemaname='public' order by tablename;  (all rowsecurity = true)
