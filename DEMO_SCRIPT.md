# IEP Partners Portal — 5-Minute Demo Script

A guided walkthrough showing all three roles and the database-enforced security
model. Have the app running (`npm run dev`) and the seed applied first.

> **Logins** (password `Demo1234!`): `admin@ieppartners.demo` ·
> `staff@ieppartners.demo` · `participant@ieppartners.demo`

---

## 0 · Landing (15 sec)
Open **http://localhost:3000**. Point out the program framing (three-tier,
cumulative pathway) and the security note: *role-based access enforced at the
database with Row-Level Security.* Click **Sign in**.

## 1 · Admin — the leadership dashboard (90 sec)
Sign in with **admin@ieppartners.demo** → lands on `/admin`.

- **KPI row:** Total Enrolled, Active, Completion Rate, Placement Rate — then
  90-Day Retention, At Risk, Avg. Placement Wage, and the **Program Health** ring
  (a composite of attendance, pace, and outcomes).
- **Enrollment & Completion** trend (10 weeks) and the **Tier Distribution** donut.
- **Retention Funnel** (Placed → 30 → 90 → 180-day), **Work-Based Learning**
  participation, and a live **Recent Activity** feed.
- **Regional Reporting** table at the bottom.
- Click **Export roster** (top-right) → downloads a CSV of all participants.

Sign out (avatar, bottom-left of the icon rail).

## 2 · Staff — managing a caseload (2 min)
Sign in with **staff@ieppartners.demo** → `/staff`.

- KPI row (caseload, active, at-risk, completions) + the **Caseload table**.
  Try the **search** box and the **tier / At-risk** filters.
- Click a participant (e.g. the first row) → opens their record with tabs:
  - **Lessons** — check off a module; watch the progress header update.
  - **Attendance** — pick today's date, mark *Present / Late / Excused / Absent*.
  - **Case Notes** — add a note. (Call out: *participants can never see these.*)
  - **Transition Plan** — edit barriers/support services and save.
  - **Goals & Milestones** — add a goal, toggle a milestone.
  - **Outcome** — set an employment status, employer, wage, placement date.
- Back to the rail: **Attendance** (daily roster, "mark remaining present"),
  **Employers** (move a partner from *contacted* → *hiring*; add one), and
  **Work-Based Learning** (log a job shadow).

Sign out.

## 3 · Participant — the self-service view (90 sec)
Sign in with **participant@ieppartners.demo** → `/me`.

- The **completion ring** spotlight, stat cards, profile, and **milestone timeline**.
- **My Progress** — their curriculum checklist (read-only).
- **Goals & Milestones** — goals, milestones, career interests, and their WBL.
- **My Documents** — upload a file (PDF/image). It stores privately in Supabase
  Storage under their own folder, then **Download** via a signed URL.

## 4 · The security punchline (30 sec)
While signed in as the participant, point out they only ever see **their own**
record — there is no caseload, no other participants, no case notes, no employer
list. This isn't just hidden in the UI: it's **Row-Level Security in Postgres**.
Re-running `npx tsx supabase/verify.ts` proves it — the participant query returns
exactly one participant row and zero case notes.

---

### Talking points / FAQ
- **"Is the data real?"** Seeded demo data — 24 participants, ~8 weeks of
  attendance, real placements and retention checkpoints, internally consistent.
- **"Could a participant hit the API directly to read others?"** No — the anon
  key is constrained by RLS; the service-role key is server-only and never ships
  to the browser.
- **"What's not built yet?"** Employer portal login, automated reports, a
  credential wallet, and messaging are scaffolded as future extension points.
