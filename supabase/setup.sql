-- =============================================================================
-- IEP Partners — Workplace Reintegration Program Portal
-- COMBINED SETUP — single paste for the Supabase SQL Editor.
--
-- Runs the full database build in dependency order:
--   extensions → enums → helper functions → tables → indexes → triggers
--   → RLS policies → storage bucket + policies
--
-- Idempotent: safe to run more than once.
-- (This is the concatenation of supabase/migrations/0001–0003. Use either one.)
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

-- =========================== DONE ============================================
-- Verify: select tablename, rowsecurity from pg_tables
--         where schemaname='public' order by tablename;  (all rowsecurity = true)
