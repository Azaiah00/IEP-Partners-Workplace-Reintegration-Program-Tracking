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
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_type') then
    create type org_type as enum ('iep_master', 'correctional_facility', 'jail', 'agency');
  end if;
end $$;

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
as $$
  select coalesce(
    (select role::text from public.profiles where id = auth.uid()) = 'super_admin',
    false
  );
$$;

-- The caller's organization (null for super-admin / IEP master).
create or replace function public.my_org()
returns uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- Extend staff/admin check to include super_admin (so existing policies that
-- already use is_staff_or_admin() grant the IEP master global access too).
create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role::text from public.profiles where id = auth.uid())
      in ('staff', 'admin', 'super_admin'),
    false
  );
$$;

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
