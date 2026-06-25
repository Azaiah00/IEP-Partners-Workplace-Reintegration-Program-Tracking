-- =============================================================================
-- IEP Partners — Workplace Reintegration Program Portal
-- Migration 0001: Schema (extensions, enums, tables, indexes, triggers)
--
-- Safe to re-run: uses IF NOT EXISTS / idempotent guards throughout.
-- Run this FIRST, then 0002_rls.sql, then 0003_storage.sql.
-- =============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enums (guarded so re-running doesn't error)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — one row per auth.users id
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        user_role not null default 'participant',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever an auth user is created. Role + name are
-- read from the signup metadata when present (the seed sets these explicitly).
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- participants
-- -----------------------------------------------------------------------------
create table if not exists public.participants (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references public.profiles(id) on delete set null,
  participant_code  text unique not null,
  date_of_birth     date,
  phone             text,
  referral_source   text,            -- detention / correctional / reentry / alt-ed / community
  region            text,
  intake_date       date not null default current_date,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  status            enrollment_status not null default 'enrolled',
  current_tier      program_tier not null default 'tier_1',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_participants_profile on public.participants(profile_id);
create index if not exists idx_participants_staff on public.participants(assigned_staff_id);
create index if not exists idx_participants_status on public.participants(status);
create index if not exists idx_participants_region on public.participants(region);

-- -----------------------------------------------------------------------------
-- enrollments — historical across tiers
-- -----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  tier            program_tier not null,
  start_date      date not null default current_date,
  target_end_date date,
  status          enrollment_status not null default 'active',
  completion_pct  numeric(5,2) not null default 0,   -- derived/cached 0..100
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_enrollments_participant on public.enrollments(participant_id);
create index if not exists idx_enrollments_status on public.enrollments(status);

-- -----------------------------------------------------------------------------
-- curriculum_modules — the syllabus per tier
-- -----------------------------------------------------------------------------
create table if not exists public.curriculum_modules (
  id          uuid primary key default gen_random_uuid(),
  tier        program_tier not null,
  name        text not null,
  description text,
  sequence    int not null default 0,
  created_at  timestamptz not null default now(),
  unique (tier, name)
);
create index if not exists idx_modules_tier on public.curriculum_modules(tier, sequence);

-- -----------------------------------------------------------------------------
-- lesson_progress
-- -----------------------------------------------------------------------------
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
create index if not exists idx_lp_participant on public.lesson_progress(participant_id);
create index if not exists idx_lp_module on public.lesson_progress(module_id);

-- -----------------------------------------------------------------------------
-- attendance
-- -----------------------------------------------------------------------------
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
create index if not exists idx_attendance_participant on public.attendance(participant_id);
create index if not exists idx_attendance_date on public.attendance(session_date);

-- -----------------------------------------------------------------------------
-- assessments
-- -----------------------------------------------------------------------------
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
create index if not exists idx_assessments_participant on public.assessments(participant_id);

-- -----------------------------------------------------------------------------
-- career_interests
-- -----------------------------------------------------------------------------
create table if not exists public.career_interests (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.participants(id) on delete cascade,
  interest          text not null,
  riasec_or_sector  text,
  rank              int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists idx_career_participant on public.career_interests(participant_id);

-- -----------------------------------------------------------------------------
-- goals
-- -----------------------------------------------------------------------------
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
create index if not exists idx_goals_participant on public.goals(participant_id);

-- -----------------------------------------------------------------------------
-- milestones
-- -----------------------------------------------------------------------------
create table if not exists public.milestones (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  name            text not null,
  status          milestone_status not null default 'pending',
  achieved_on     date,
  sequence        int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_milestones_participant on public.milestones(participant_id);

-- -----------------------------------------------------------------------------
-- case_notes — STAFF/ADMIN ONLY (no participant access; enforced in RLS)
-- -----------------------------------------------------------------------------
create table if not exists public.case_notes (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  staff_id        uuid references public.profiles(id) on delete set null,
  note            text not null,
  category        text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_casenotes_participant on public.case_notes(participant_id);

-- -----------------------------------------------------------------------------
-- transition_plans
-- -----------------------------------------------------------------------------
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
create index if not exists idx_transition_participant on public.transition_plans(participant_id);

-- -----------------------------------------------------------------------------
-- documents — metadata; files live in Supabase Storage bucket 'documents'
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  type            doc_type not null default 'other',
  title           text not null,
  storage_path    text,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_documents_participant on public.documents(participant_id);

-- -----------------------------------------------------------------------------
-- employers
-- -----------------------------------------------------------------------------
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
create index if not exists idx_employers_stage on public.employers(stage);

-- -----------------------------------------------------------------------------
-- work_based_learning
-- -----------------------------------------------------------------------------
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
create index if not exists idx_wbl_participant on public.work_based_learning(participant_id);
create index if not exists idx_wbl_employer on public.work_based_learning(employer_id);

-- -----------------------------------------------------------------------------
-- outcomes — employment placement + retention
-- -----------------------------------------------------------------------------
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
create index if not exists idx_outcomes_participant on public.outcomes(participant_id);
create index if not exists idx_outcomes_status on public.outcomes(employment_status);

-- -----------------------------------------------------------------------------
-- updated_at triggers (drop+create so re-runs stay clean)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'participants','enrollments','transition_plans','employers','outcomes'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;
