-- 0008_jobs_engine.sql
-- Virginia jobs & opportunity engine: live job opportunities + workforce
-- resources, with participant readiness fields and application/match tracking
-- so staff can guide participants toward jobs they are (or are nearly) ready for.
-- Additive and safe to re-run. Data loaded by seed from supabase/content/va_jobs.json.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
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
end $$;

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
do $$
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
end $$;

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
