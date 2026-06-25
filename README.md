# IEP Partners — Workplace Reintegration Program Portal

A production-quality portal for **IEP Partners** that tracks justice-involved and
barrier-impacted participants through a three-tier workforce reintegration
curriculum — from intake to employment.

- **Founder:** Dr. Rhonda Clanton-Davis · **CEO:** Michelle Pettaway
- **Three roles:** Participant (own record), Staff (caseload), Admin (org-wide).
- **Three tiers:** Foundation → Career Development → Reintegration & Employment.

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

Prefer separate steps? The same SQL is split into `supabase/migrations/0001_schema.sql`,
`0002_rls.sql`, `0003_storage.sql`, `0004_participant_reads.sql` — run them in that
order instead. (`0004` lets participants see their case manager's name; it's also
included in `setup.sql`.)

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

> Created by the seed script in Phase 3.

| Role | Email | Password |
| --- | --- | --- |
| Admin (Michelle Pettaway) | `admin@ieppartners.demo` | `Demo1234!` |
| Staff / Case Manager | `staff@ieppartners.demo` | `Demo1234!` |
| Participant | `participant@ieppartners.demo` | `Demo1234!` |

After login users are routed by role: participant → `/me`, staff → `/staff`,
admin → `/admin`.

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
