# Master Build Prompt — IEP Partners Workplace Reintegration Program Portal

> **How to use this file:** Open this repo in Cursor / Claude Code. Paste the entire block below (everything inside "PROMPT START → PROMPT END") as your first message to Claude Code. It is written to be executed top-to-bottom. Build it in the phases listed; do not try to one-shot the whole thing — let each phase compile and run before moving on.

---

## ⚙️ Before you paste — 3 setup values you must fill in

The prompt references three secrets. Get them from your Supabase dashboard → **Project Settings → API**, and paste them into a `.env.local` file (Claude Code will create the file, you fill the values):

```
NEXT_PUBLIC_SUPABASE_URL=https://tesabpvjmmuzksgjojcr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
SUPABASE_SERVICE_ROLE_KEY=<your service_role key — server only, never shipped to client>
```

Project ref: `tesabpvjmmuzksgjojcr` · Repo: `IEP-Partners-Workplace-Reintegration-Program-Tracking-Portal`

---

# PROMPT START

You are a **world-class full-stack engineer and product designer**. Build the **IEP Partners Workplace Reintegration Program Portal** — a production-quality web application that tracks justice-involved and barrier-impacted participants as they move through a three-tier workforce reintegration curriculum, from intake to employment. This must be the clearest, most reliable, best-looking program/curriculum tracking portal of its kind. Treat it as real software for a real nonprofit, not a toy demo.

Work in **phases** (defined at the end). After each phase: ensure the app compiles, run it, fix errors, and give me a one-line status before continuing.

---

## 1. Product context (read first — this drives every decision)

**Organization:** IEP Partners. Founder: Dr. Rhonda Clanton-Davis. CEO: Michelle Pettaway.

**Program:** The Workplace Reintegration Program bridges justice involvement, workforce readiness, and long-term employment. Participants transition from detention, incarceration, alternative education, and reentry programs into employment, independence, and community engagement.

**Who uses the portal (three roles):**
- **Participant** — sees only their own record: profile, progress, assessments, goals, certificates, milestones.
- **Staff** (case manager / instructor) — manages a caseload: attendance, case notes, lesson completion, transition plans, employer engagement, work-based learning.
- **Admin** (leadership) — org-wide dashboard: enrollment, completion rates, placement outcomes, retention, regional and state-level reporting.

**The three-tier curriculum** (a participant is enrolled in exactly one active tier; tiers are cumulative):
- **Tier 1 — Foundation Pathway (8–10 weeks):** Workforce Readiness Assessment, Career Exploration, Resume Development, Interview Preparation, Professionalism Training, Workplace Communication, Workplace Expectations.
- **Tier 2 — Career Development Pathway (12–16 weeks):** all of Tier 1 + Workplace Simulations, Team-Based Projects, Employer Engagement, Financial Literacy, Transition Planning, Hard & Soft Skill Development.
- **Tier 3 — Reintegration & Employment Pathway (20–24 weeks):** all of Tier 1 & 2 + Individualized Transition Plans, Community Resource Navigation, Job Shadowing, Work-Based Learning, Paid Work Experience, Employment Support, Exit Planning.

**Data sensitivity — treat as justice-involved PII.** Role-based access is non-negotiable: a participant must never be able to read another participant's data, and the database (not just the UI) must enforce it. Build with Supabase Row-Level Security from the start. Never expose the service-role key to the browser.

---

## 2. Tech stack (use exactly this)

- **Next.js 14+, App Router, TypeScript, React Server Components.**
- **Tailwind CSS** for styling. **shadcn/ui** for base components (button, card, dialog, table, badge, tabs, dropdown, input, select, sheet, avatar, progress). Install only what you use.
- **Supabase** — Postgres + Auth + Storage. Use `@supabase/supabase-js` and `@supabase/ssr` (server + client helpers, cookie-based sessions). No other ORM.
- **Recharts** for charts (area/line, bar, donut/radial progress rings).
- **lucide-react** for icons.
- **date-fns** for dates.
- **zod** for form/schema validation; **react-hook-form** for forms.
- Package manager: npm. Node 20+.

Folder conventions: `app/` routes, `components/` (with `components/ui/` for shadcn), `lib/` (supabase clients, helpers), `supabase/` (sql migrations + seed), `types/`.

Create these Supabase helpers in `lib/supabase/`: `client.ts` (browser), `server.ts` (server components / route handlers, reads cookies), and `admin.ts` (service-role client, server-only, used only for seeding/admin tasks). Add `middleware.ts` to refresh the auth session and protect routes.

---

## 3. Design system — "Runey-style" dark dashboard (match this closely)

The visual target is a modern, premium dark-mode SaaS dashboard: airy, rounded, data-dense but calm, with a single vivid accent. Implement it as Tailwind theme tokens + a small set of reusable components.

**Color tokens** (define as CSS variables in `globals.css` and map in `tailwind.config.ts`):
- App background: very dark charcoal `#0F1115`.
- Elevated surface / cards: `#171A21`; raised/hover: `#1E222B`.
- Hairline borders: `#262B36` (use subtle 1px borders, not heavy shadows).
- Primary text: `#F4F6F8`; secondary/muted text: `#8C94A3`.
- **Accent (primary): lime/neon green `#A8E55F`** (with a slightly deeper `#8FD142` for hover). Use for primary buttons, the main trend line, active nav, and positive deltas.
- Semantic: positive/success green `#5FE08A`; negative/expense coral `#FF6B6B`; info blue `#5B9DFF`; invoice/violet `#A78BFA`; warning amber `#F5B14C`.
- One **featured "spotlight" card** style: warm off-white/beige gradient background (`#EDE7DA → #D9CFBE`) with dark text — used sparingly for the single most important callout (e.g., a participant's headline metric or a primary CTA card).

**Typography:** Inter (or Geist) via `next/font`. Big bold metric numbers (text-3xl/4xl, tracking-tight), small uppercase-ish muted labels, comfortable line height. Numbers are the heroes.

**Shape & spacing:** card radius `rounded-2xl` (~16–20px); buttons are pill-shaped (`rounded-full`) or `rounded-xl`; generous padding (`p-5`/`p-6`); lots of whitespace; 12-col responsive grid with `gap-4`/`gap-6`.

**Signature components to build (reusable):**
1. **Left icon rail** — narrow (~72px) vertical sidebar: logo at top, icon nav (dashboard, participants, curriculum, attendance, reports), settings/help + avatar pinned at bottom. Tooltips on hover. Active item gets the accent.
2. **Greeting header** — "Good evening, {firstName}" + a one-line context subtitle, with date range / quick actions on the right.
3. **Stat card** — label, large value, tiny sub-label, and a pill **trend badge** (↗ green / ↘ coral) in the corner; optional mini sparkline at the bottom. Build a 4-up row of these.
4. **Trend chart card** — smooth **area/line chart** (Recharts) in accent green with soft gradient fill, marker dots, clean date axis, legend dots (e.g., On Track / At Risk / Completed).
5. **Radial progress ring** — donut gauge for percentages (e.g., curriculum completion %, "Program Health: Excellent").
6. **Activity feed** — right-column list: small avatar/icon, action text with **bolded entities**, relative timestamp ("2 hours ago").
7. **Status badge** — pill with tinted translucent background + saturated text; variants: Enrolled, In Progress, At Risk, Completed, Placed, Paid/Unpaid, Tier 1/2/3.
8. **Entity card row** ("Latest Activity"-style) — horizontally scrollable cards with a category tag (top-left), an icon/avatar, a title, a value, and a relative time.
9. **Task/checklist row** — checkbox, title, project/tier tag, status badge, plus a header progress bar ("6 of 11 done — 55%"). Use this pattern for **lesson/milestone completion**.
10. **Recent people** — stacked avatars with initials fallback.

Light mode is **not** required for the demo; ship dark mode only, done well.

---

## 4. Data model (Postgres / Supabase)

Create SQL migrations in `supabase/migrations/` and a seed in `supabase/seed.sql`. Use UUID PKs (`gen_random_uuid()`), `timestamptz` for times, and Postgres `enum`s where noted. Enable RLS on every table.

**Enums:** `user_role` (participant, staff, admin); `program_tier` (tier_1, tier_2, tier_3); `enrollment_status` (enrolled, active, on_hold, completed, withdrawn); `progress_status` (not_started, in_progress, completed); `attendance_status` (present, absent, excused, late); `milestone_status` (pending, achieved); `goal_status` (open, in_progress, achieved, deferred); `wbl_type` (job_shadow, work_based_learning, paid_work_experience); `employment_status` (unemployed, searching, placed, retained_30, retained_90, retained_180); `doc_type` (resume, certificate, credential, other); `employer_stage` (prospect, contacted, partner, hiring, inactive); `assessment_type` (workforce_readiness, career_interest, skills_self_eval).

**Tables (with key columns):**
- `profiles` — `id` (= auth.users.id), `full_name`, `email`, `role user_role`, `avatar_url`, `created_at`. One row per auth user.
- `participants` — `id`, `profile_id → profiles`, `participant_code` (human-friendly, e.g. IEP-0001), `date_of_birth`, `phone`, `referral_source` (detention/correctional/reentry/alt-ed/community), `region`, `intake_date`, `assigned_staff_id → profiles`, `status enrollment_status`, `current_tier program_tier`, `notes`.
- `enrollments` — `id`, `participant_id`, `tier program_tier`, `start_date`, `target_end_date`, `status enrollment_status`, `completion_pct` (derived/cached). A participant can have historical enrollments across tiers.
- `curriculum_modules` — `id`, `tier program_tier`, `name`, `description`, `sequence` (int). Seed the full module list from §1 for all three tiers.
- `lesson_progress` — `id`, `participant_id`, `module_id → curriculum_modules`, `status progress_status`, `completed_at`, `staff_id` (who marked it). Unique on (participant_id, module_id).
- `attendance` — `id`, `participant_id`, `session_date`, `status attendance_status`, `staff_id`, `notes`.
- `assessments` — `id`, `participant_id`, `type assessment_type`, `score` (numeric, nullable), `summary` (text), `taken_on`, `staff_id`.
- `career_interests` — `id`, `participant_id`, `interest` (text), `riasec_or_sector` (text), `rank` (int). (Career Interest Inventory results.)
- `goals` — `id`, `participant_id`, `title`, `detail`, `status goal_status`, `target_date`, `created_by`.
- `milestones` — `id`, `participant_id`, `name` (employment-readiness milestone), `status milestone_status`, `achieved_on`. Seed a standard milestone set (e.g., Resume Complete, Mock Interview Passed, Readiness Benchmark Met, Job Shadow Completed, Offer Received, 30-Day Retention).
- `case_notes` — `id`, `participant_id`, `staff_id`, `note`, `category` (text), `created_at`. (Staff-only visibility.)
- `transition_plans` — `id`, `participant_id`, `summary`, `barriers` (text[]), `support_services` (text[]), `target_career`, `updated_by`, `updated_at`. (Individualized Transition Plan — Tier 3 emphasis.)
- `documents` — `id`, `participant_id`, `type doc_type`, `title`, `storage_path` (Supabase Storage), `uploaded_by`, `created_at`. (Resume storage, certificates, credentials.)
- `employers` — `id`, `name`, `industry`, `contact_name`, `contact_email`, `stage employer_stage`, `region`, `notes`, `owner_staff_id`.
- `work_based_learning` — `id`, `participant_id`, `employer_id → employers`, `type wbl_type`, `start_date`, `end_date`, `hours`, `status`, `notes`. (Job shadowing, WBL, paid work experience.)
- `outcomes` — `id`, `participant_id`, `employment_status employment_status`, `employer_id` (nullable), `job_title`, `hourly_wage`, `placement_date`, `retention_check_date`. (Employment placement + retention tracking.)

Add helpful indexes (participant_id FKs, status columns). Add an `updated_at` trigger where useful.

**RLS policies (enforce, don't just describe):**
- Create a `SECURITY DEFINER` helper `public.current_role()` that returns the caller's role from `profiles` **without** causing recursive RLS (query as definer). Use it in policies.
- `profiles`: a user can `select`/`update` their own row; staff & admin can `select` all.
- Participant-scoped tables (participants, enrollments, lesson_progress, attendance, assessments, career_interests, goals, milestones, documents, transition_plans, outcomes, work_based_learning): **participant** may `select` rows where the row's participant belongs to them; **staff** may `select`/`insert`/`update` rows for participants where `assigned_staff_id = auth.uid()` **or** (simpler for the demo) any participant if role = staff; **admin** full access.
- `case_notes`: **participant has NO access**; staff & admin only.
- `curriculum_modules` / `employers`: readable by staff & admin; modules also readable by participants (so they see the syllabus).
- Write the policies so the seeded demo accounts work end-to-end. Test each role's visibility before declaring a phase done.

---

## 5. Auth & seed data (must produce a working demo with logins)

- Email/password auth via Supabase. Cookie sessions via `@supabase/ssr`. Protect all `/app` routes in `middleware.ts`; redirect unauthenticated users to `/login`. After login, route by role: participant → `/me`, staff → `/staff`, admin → `/admin`.
- Provide a **single, idempotent seed** that creates demo auth users + their profiles + a realistic dataset. Prefer a Node seed script (`supabase/seed.ts`, run with `tsx`, using `SUPABASE_SERVICE_ROLE_KEY`) so it can create auth users via the Admin API and is re-runnable. (If you instead use SQL inserts into `auth.users`, set encrypted passwords with `crypt(...)` and confirm the users can log in.)
- **Demo accounts to create (document them in README):**
  - `admin@ieppartners.demo` / `Demo1234!` — Admin (Michelle Pettaway).
  - `staff@ieppartners.demo` / `Demo1234!` — Staff / Case Manager.
  - `participant@ieppartners.demo` / `Demo1234!` — Participant (sees own record).
- **Seed volume for a convincing dashboard:** ~24 participants across the 3 tiers and a few regions; varied statuses (active, at-risk, completed, withdrawn); attendance spanning ~8 weeks; lesson_progress so completion % varies; a handful of assessments, goals, milestones, case notes; 6–8 employers; 10+ work-based-learning records; and outcomes including several placements with wages and retention checkpoints. Make numbers internally consistent so admin KPIs look real.

---

## 6. Feature spec by portal (map every wishlist item)

### Participant Portal (`/me`)
Greeting header + spotlight card with their **overall completion %** (radial ring). Then:
- **My Profile** — read-only profile + participant_code, current tier, assigned staff, intake date.
- **My Progress** — per-module checklist for their tier (lesson_progress) with the progress-bar header pattern; tier badge.
- **Assessments** — workforce readiness + career interest inventory results (cards).
- **My Goals** — goals list with status badges.
- **Milestones** — employment-readiness milestones as a timeline/checklist.
- **My Documents** — resume + certificates/credentials, with upload (to Supabase Storage) and download.
- **Job Shadow / WBL** — their work-based-learning participation.
Participant sees **only their own** data (verified by RLS).

### Staff Portal (`/staff`)
Greeting header + KPI row (My Caseload, Active, At-Risk, Completions). Then:
- **Caseload table** — assigned participants with tier, status badge, completion %, last attendance; click → participant detail.
- **Participant detail** (`/staff/participants/[id]`) — tabs: Overview · Attendance (mark present/absent/excused/late per session) · Lessons (mark module complete) · Assessments · Case Notes (add/view — staff-only) · Transition Plan (edit) · Goals & Milestones · Documents · WBL.
- **Attendance** — quick daily roster entry.
- **Employer Engagement** — employers list + stages (prospect→partner→hiring), add/edit.
- **Work-Based Learning** — log job shadow / WBL / paid work experience and link to employer.
- **Participant Outcome Monitoring** — set/update employment outcomes.

### Admin Dashboard (`/admin`)
The flagship Runey-style screen. Greeting header + 4–6 **stat cards** (Total Enrolled, Active, Program Completion Rate, Employment Placement Rate, 90-Day Retention, Program Health ring). Then:
- **Enrollment & completion trend** — area/line chart over time.
- **Tier distribution** — bar or donut (Tier 1/2/3 counts).
- **Outcomes panel** — placements, average wage, retention funnel (30/90/180-day).
- **Participation** — job shadow & work-based-learning participation counts.
- **Regional reporting** — table/bars by region (stand-in for state-level rollups).
- **Recent activity feed** — latest enrollments, completions, placements.
- **Reports** — a simple "export CSV" on the key tables (client-side CSV is fine for the demo).
All admin reads are org-wide (RLS admin policy).

> **Future (scaffold only, don't fully build):** Employer Portal login, automated/scheduled reports, digital credential wallet, participant↔staff messaging, resource library, community-partner access, external workforce/case-management integrations. Leave clean extension points and a `// FUTURE:` note where relevant.

---

## 7. Quality bar & guardrails

- **Looks like the reference.** Dark, rounded, accent-green, generous spacing, real charts, pill badges. No default-Bootstrap-looking UI. Empty states are designed, not blank.
- **Responsive** down to tablet; the icon rail collapses sensibly on mobile.
- **Type-safe** end to end; generate Supabase types (`supabase gen types typescript`) into `types/db.ts` and use them in queries.
- **No secrets in the client.** Service-role key only in server-only modules. Validate this.
- **Accessibility:** semantic HTML, labelled inputs, sufficient contrast (it's dark mode — check muted text), keyboard-navigable.
- **Errors handled:** loading skeletons + error boundaries on data screens. Never show a raw stack trace in the demo.
- **Seed is re-runnable** and the three demo logins always work after a fresh setup.
- Keep components small and composable; colocate data fetching in server components; mutations via server actions or route handlers.
- Don't invent fake compliance claims in the UI; keep copy professional and accurate to the program.

---

## 8. Build phases (do them in order; pause for me after each)

1. **Scaffold** — Next.js + TS + Tailwind + shadcn + Supabase clients + middleware + the design tokens and the core layout (icon rail, header shell). App runs, dark theme visible. Create `.env.local` (I'll fill the keys).
2. **Database** — migrations for all tables + enums + indexes + RLS policies + the `current_role()` helper. Generate `types/db.ts`.
3. **Seed** — re-runnable seed creating the 3 demo users, profiles, and the full realistic dataset from §5. Confirm I can log in as each role.
4. **Auth + routing** — login page, session handling, role-based redirects, route protection.
5. **Admin dashboard** — the flagship screen with real seeded numbers, stat cards, charts, activity feed, regional table, CSV export.
6. **Staff portal** — caseload, participant detail tabs, attendance entry, case notes, lessons, employer engagement, WBL, outcomes.
7. **Participant portal** — profile, progress, assessments, goals, milestones, documents (with Storage upload), WBL.
8. **Polish** — empty/loading/error states, responsiveness, accessibility pass, README with setup + demo logins, and a short `DEMO_SCRIPT.md` walking through a 5-minute demo.

**At the very start**, also create a `README.md` with: prerequisites, `npm install`, env setup, how to run migrations + seed, `npm run dev`, and the three demo logins. Keep it current as you build.

Before you begin Phase 1, restate your plan in 5–8 lines and list any assumption you're making. Then build Phase 1.

# PROMPT END

---

## Notes for you, Frederick (not part of the prompt)

- **Why this stack/design:** it matches your reference's premium dark-dashboard look and is the combination Claude Code/Cursor build most reliably. Supabase RLS is what makes the justice-involved PII safe at the database layer, not just the UI.
- **Run the phases.** Pasting the whole thing and saying "go" works, but you'll get a far better result (and a demo that actually runs) if you let it finish each phase, glance at it, then say "continue."
- **You'll need the anon + service-role keys** from Supabase → Project Settings → API before Phase 3 (the seed). The service-role key is powerful — keep it in `.env.local` only, never commit it. `.gitignore` should already exclude `.env*`.
- **If today's demo is tight on time,** tell Claude Code to prioritize Phases 1–5 (scaffold → admin dashboard) — the admin screen is the showpiece, and the seeded data makes it look complete.
