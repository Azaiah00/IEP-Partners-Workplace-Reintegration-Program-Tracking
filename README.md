# IEP Partners — Workplace Reintegration Program Portal

A production-quality portal for **IEP Partners** that tracks justice-involved and
barrier-impacted participants through a three-tier workforce reintegration
curriculum — from intake to employment.

- **Founder:** Dr. Rhonda Clanton-Davis · **CEO:** Michelle Pettaway
- **Three roles:** Participant (own record), Staff (caseload), Admin (org-wide).
- **Three tiers:** Foundation → Career Development → Reintegration & Employment.
- **Courses LMS:** a self-paced learning catalog grouped into four tracks
  (Workforce Readiness, Emotional Readiness, Digital Skills, and the Trades),
  with reading lessons, **interactive trade-simulation** placeholders (wire-color
  ID, tape-measure reading, order picking, pipe-fitting match, PPE selection,
  touch-typing), and **graded quizzes** (server-side scoring against a per-course
  pass mark, per-question explanations, and retakes). A course completes only
  when every lesson is done *and* its quiz is passed. The Emotional Intelligence
  course presents its quiz as a gentle **self-reflection check** instead of a
  pass/fail test. Staff see each participant's course progress + best quiz scores
  (also in the participant PDF), and admins get org-wide learning KPIs.
- **Virginia Jobs Engine:** a live Virginia job board, readiness-based fit
  matching with 0–100 fit scores, an application pipeline (match → hire), and a
  curated library of Virginia workforce / fair-chance resources. See the
  dedicated section below.

> Built with Next.js 14 (App Router, RSC), TypeScript, Tailwind, shadcn/ui,
> Supabase (Postgres + Auth + Storage, **Row-Level Security enforced**),
> Recharts, lucide-react, date-fns, zod + react-hook-form.

---

## Prerequisites

- **Node 20+** (tested on Node 22) and **npm 10+**.
- A **Supabase** project (free tier is fine). You'll need its URL, anon key, and
  service-role key.
- Optional: the **Supabase CLI** (`npm i -g supabase`) for generating types and
  running migrations locally.

## 1. Install

```bash
npm install
```

## 2. Environment

Copy the example env file and fill in your Supabase project values:

```bash
cp .env.local.example .env.local
```

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | Safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | same | **Server only — never expose** |

The service-role key is used only by `lib/supabase/admin.ts` and the seed script.

## 3. Database

**Easiest:** in the Supabase dashboard open **SQL Editor → New query**, paste the
single combined file **`supabase/setup.sql`**, and **Run**. It builds everything
in dependency order (extensions → enums → functions → tables → indexes → triggers
→ RLS → storage).

Prefer separate steps? Run the migration files in order:

| File | Purpose |
|------|---------|
| `0001_schema.sql` | Core tables + enums |
| `0002_rls.sql` | Row-level security |
| `0003_storage.sql` | Document storage bucket |
| `0004_participant_reads.sql` | Participants can see case manager names |
| `0006_multi_tenant.sql` | Organizations + super_admin role |
| `0007_courses.sql` | LMS courses, lessons, quizzes, progress |
| `0008_jobs_engine.sql` | Virginia jobs + application tracking |

If you already ran an older `setup.sql` (0001–0003 only), apply **0004, 0006, 0007, and 0008**
in the SQL Editor before `npm run seed`. All files are idempotent.

Everything is idempotent — safe to re-run. Verify with:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;   -- rowsecurity should be true for all
```

`types/db.ts` is hand-authored to match the schema, so no CLI is required. If
you later install the Supabase CLI you can regenerate it with `npm run db:types`.

## 4. Seed demo data

```bash
npm run seed       # idempotent; creates demo users + realistic dataset
```

This creates the 3 demo logins plus 24 participants across all tiers/regions with
lesson progress, ~8 weeks of attendance, assessments, goals, milestones, case
notes, 8 employers, work-based-learning records, and employment outcomes — all
internally consistent. Re-running reuses the auth users and rebuilds the data
deterministically.

**Curriculum model:** modules are stored *distinct per tier* (Tier 1 = 7 base,
Tier 2 = 6 new, Tier 3 = 7 new = 20 total). A participant's syllabus is the
cumulative set — every module at their tier **and below** — so a Tier 2
participant tracks 13 modules, a Tier 3 participant 20.

Verify logins + RLS isolation at any time:

```bash
npx tsx supabase/verify.ts   # signs in as each role and asserts visibility
```

## 5. Run

```bash
npm run dev        # http://localhost:3000
```

---

## Demo logins

> Created/refreshed by the seed script (`npm run seed`). **All passwords: `Demo1234!`**

**IEP master portal** (`super_admin` → `/iep`) — sees every organization:

| Name | Email |
| --- | --- |
| Dr. Rhonda Clanton-Davis | `rhonda@ieppartners.demo` |
| Michelle Pettaway | `michelle@ieppartners.demo` |

**Org admins** (`admin` → `/admin`) — scoped to their own organization:

| Organization | Email |
| --- | --- |
| Newport News Sheriff's Office — Re-Entry | `admin.newportnews@ieppartners.demo` |
| Greensville Correctional Center | `admin.greensville@ieppartners.demo` |
| Riverside Regional Jail | `admin.riverside@ieppartners.demo` |

**Org staff / case managers** (`staff` → `/staff`) — see only their org's caseload:

| Organization | Email |
| --- | --- |
| Newport News | `staff.newportnews@ieppartners.demo` |
| Greensville | `staff.greensville@ieppartners.demo` |
| Riverside | `staff.riverside@ieppartners.demo` |

**Participant** (`participant` → `/me`): `participant@ieppartners.demo` (Newport News).

**Legacy demo logins** (still work): `admin@ieppartners.demo` (admin, Newport News),
`staff@ieppartners.demo` (staff, Newport News).

After login users are routed by role: participant → `/me`, staff → `/staff`,
admin → `/admin`, super_admin (IEP master) → `/iep`.

---

## Virginia Jobs Engine

A "opportunity engine" that turns program readiness into concrete, fair-chance
Virginia employment. Built on `0008_jobs_engine.sql` and seeded from
`supabase/content/va_jobs.json` (12 workforce resources, 7 labor-market sectors,
26 real-world Virginia opportunities across the trades, CDL, warehouse,
construction, manufacturing, food service, customer service, and general labor).

**Job board.** Open `job_opportunities` are filterable by region, matched track,
and fair-chance (`reentry_friendly`) status. Each role carries employer, city /
region, wage range, employment type, requirements, a `matched_track` tag, and a
source link.

**Readiness matching (fit scores).** `lib/matching.ts → computeFit()` scores
each participant against each job from **0–100**:

- **~50% track match** — does a completed/in-progress **trade course** map to the
  job's `matched_track`? Course→track mapping lives in `lib/matching.ts`
  (`electrical-trade-fundamentals → trades-electrical`,
  `warehouse-and-logistics → warehouse`,
  `construction-fundamentals-and-safety → construction`, plumbing/carpentry
  similarly). **CDL** jobs require an actual `has_cdl` (a course can't substitute);
  `general` roles get a modest baseline.
- **~35% requirement coverage** — each job requirement string is checked
  heuristically against the participant's readiness signals
  (`has_drivers_license`, `has_cdl` / `cdl_class`, `transportation_ok`,
  `bonding_eligible`, achieved milestones such as a finished resume). Soft /
  learnable requirements ("willing to…", "no experience", "training provided")
  are treated as non-gating. Unmet hard requirements are surfaced as `missing[]`.
- **~15% tier alignment** — higher program tier = more job-ready.
- **+5 bonus** when the job is fair-chance.

Labels: **≥75 "Ready to apply"**, **60–74 "Almost ready"** (with the 1–2 missing
requirements shown as chips), **<60 "Keep building"**. Scores render as
accent-green / amber / blue **fit rings**.

**Participant view** (`/me/jobs` → "Opportunities"): matched jobs sorted by fit,
each with a fit-score ring, label, wage, employer, location, a fair-chance badge,
missing-requirement chips, and an **"I'm interested"** button (`trackJob`) that
opens a `job_application`. A sidebar surfaces Virginia workforce resources
(Virginia Works, Federal Bonding, WOTC, Goodwill re-entry, Honest Jobs,
registered apprenticeship, …) and in-demand sectors with outlook + typical wages.

**Staff / Admin / IEP view** (`/staff/jobs`, `/admin/jobs`, `/iep/jobs`): a
three-tab dashboard — (1) the filterable **job board**, (2) the **applications
pipeline** grouped by status (`matched → interested → preparing → applied →
interviewing → offer → hired / not_pursued`) with inline status advancement and
staff notes (`updateApplicationStatus`), and (3) a **"Who's Ready"** matcher that
scores the caseload against any chosen opportunity and lets staff start preparing
a strong match. Everything is **org-scoped** via `my_org()` (super_admin / IEP
sees all).

**Participant detail** (`/staff/participants/[id]`): a compact **Job Matches**
section shows the participant's top 3 matched jobs + active applications, plus
editable **readiness flags** (`setReadiness`) — license, transportation, bonding
eligibility, CDL + class — which immediately recompute matches.

Code map: `lib/matching.ts`, `lib/queries/jobs.ts`, `lib/actions/jobs.ts`,
`app/{me,staff,admin,iep}/jobs/`, `components/jobs/*`.

---

## Multi-tenant model

IEP Partners (the master organization) oversees multiple **client organizations**
— correctional facilities, jails, and agencies — each with its own admin, staff,
and participants. Roles:

- `super_admin` (IEP master) — global view across **all** organizations at `/iep`
  (master overview, per-org drill-in, cross-org reports).
- `admin` (org admin) — sees only **their own** organization on `/admin`.
- `staff` (case manager) — sees only **their own** org's caseload on `/staff`.
- `participant` — their own record at `/me`.

Each `profiles` and `participants` row carries an `organization_id`. **In this
phase, org separation for org-admins/staff is enforced at the application/query
layer** (queries filter by `organization_id`; super_admin's queries are
unfiltered). RLS stays permissive for staff/admin/super_admin; a later phase will
tighten RLS to hard org isolation once real auth replaces demo logins. See
`supabase/migrations/0006_multi_tenant.sql` (orgs, consent fields, helper
functions `is_super_admin()` / `my_org()`).

Reports: CSV (`lib/csv.ts`) and PDF (`lib/pdf.ts`, jsPDF) exports are available on
the IEP master overview, IEP org-detail, and admin dashboard (org rollup /
program reports), plus single-participant PDF reports on the staff participant
detail page.

---

## Project structure

```
app/                 App Router routes (role portals under /me, /staff, /admin)
components/
  ui/                shadcn-style primitives (button, card, badge, …)
  layout/            icon rail, app shell, greeting header
  dashboard/         stat card, trend chart, radial progress, …
  brand/             IEP mark
lib/
  supabase/          client.ts (browser) · server.ts (RSC) · admin.ts (service role) · middleware.ts
  utils.ts, nav.ts
supabase/            migrations + seed (Phases 2–3)
types/db.ts          generated Supabase types
middleware.ts        session refresh + route protection
```

## Design system

Dark "Runey-style" dashboard: charcoal `#0F1115` background, elevated
`#171A21` cards, hairline `#262B36` borders, and a single vivid lime accent
`#A8E55F`. Rounded-2xl cards, pill buttons, big bold metric numbers, soft
gradient area charts, radial progress rings, and tinted pill status badges.
Dark mode only, by design.

## Future extension points (scaffolded, not built)

Clean seams are left for: an **Employer Portal** login, **automated/scheduled
reports**, a **digital credential wallet**, **participant ↔ staff messaging**, a
**resource library**, **community-partner access**, and external
workforce/case-management **integrations**. Look for `// FUTURE:` notes.

## Troubleshooting

- **`PageNotFoundError: /_document` during `next build`** — a stale Next build
  cache, not a code error. Clear it: `rm -rf .next node_modules/.cache` then
  rebuild.
- **Demo logins fail** — re-run `npm run seed` (idempotent) and confirm
  `.env.local` has all three Supabase keys.
- **Case-manager name shows a placeholder for participants** — run
  `supabase/migrations/0004_participant_reads.sql`.

## Security model

Role-based access is enforced at the **database** layer with Supabase
Row-Level Security — not just in the UI. A participant can never read another
participant's data. The service-role key never reaches the browser
(`lib/supabase/admin.ts` is marked `server-only`). See Phase 2 migrations for
the full policy set.

---

## Build status

- ✅ **Phase 1 — Scaffold:** Next.js + TS + Tailwind + design tokens, Supabase
  clients + middleware, icon-rail/header/app-shell, signature dashboard
  components, dark theme. (Preview at `/`.)
- ✅ **Phase 2 — Database:** migrations for all 16 tables + 12 enums + indexes +
  `updated_at`/profile triggers, full RLS policy set (participant isolation,
  staff/admin access, case-notes lockout), private `documents` storage bucket,
  and a hand-authored `types/db.ts`.
- ✅ **Phase 3 — Seed:** idempotent `supabase/seed.ts` creates 3 demo logins +
  24 participants and a consistent dataset; `supabase/verify.ts` confirms all
  logins work and RLS isolates participant data. (All checks passing.)
- ✅ **Phase 4 — Auth + routing:** `/login` (react-hook-form + zod, cookie
  sessions), `getSessionProfile`/`requireRole` helpers, `/home` role gate,
  role-based section layouts (`/me` · `/staff` · `/admin`) with the live user
  menu + sign-out, and middleware route protection (verified: protected routes
  307-redirect to `/login`).
- ✅ **Phase 5 — Admin dashboard:** flagship `/admin` screen from live seeded
  data — 8 KPI stat cards (enrolled, active, completion/placement rate, 90-day
  retention, at-risk, avg wage, Program Health ring), 10-week enrollment/
  completion trend, tier-distribution donut, retention funnel, WBL participation,
  recent-activity feed, regional reporting table, and CSV roster export. Loading
  skeleton included. (Join + aggregates validated against the DB.)
- ✅ **Phase 6 — Staff portal:** caseload dashboard + searchable/filterable
  caseload table; participant detail with 10 tabs (Overview, Attendance,
  Lessons, Assessments, Case Notes, Transition Plan, Goals & Milestones,
  Documents, WBL, Outcome); daily attendance roster; employer-engagement
  pipeline; global WBL log. All mutations via server actions (attendance,
  lessons, case notes, transition plan, goals/milestones, employers, WBL,
  outcomes) — verified staff writes pass RLS.
- ✅ **Phase 7 — Participant portal:** RLS-scoped `/me` dashboard (completion
  ring spotlight, stat cards, profile, milestone timeline, assessments),
  `/me/progress` (read-only module checklist), `/me/goals` (goals, milestones,
  interests, WBL), and `/me/documents` with **Supabase Storage upload +
  signed-URL download** — verified the participant can upload to their own
  folder and download via signed URL under RLS.
- ✅ **Phase 8 — Polish:** designed empty/loading/error states (route-level
  `loading.tsx` skeletons + `error.tsx` boundaries per portal), a branded 404, a
  professional public landing (no fabricated PII), accessibility pass (labelled
  controls, `aria-current`, keyboard-navigable), and this README + `DEMO_SCRIPT.md`.
