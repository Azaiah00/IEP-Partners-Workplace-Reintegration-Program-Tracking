import { createClient } from "@/lib/supabase/server";
import {
  endOfWeek,
  format,
  isAfter,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import type {
  ProgramTier,
  EnrollmentStatus,
  EmploymentStatus,
} from "@/types/db";

const PLACED: EmploymentStatus[] = [
  "placed",
  "retained_30",
  "retained_90",
  "retained_180",
];

export type ActivityEvent = {
  id: string;
  name: string;
  action: string;
  entity: string;
  date: string; // ISO
};

export type RosterRow = {
  code: string;
  name: string;
  tier: string;
  status: string;
  region: string;
  completion: number;
  intake: string;
};

function healthLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Attention";
}

// FUTURE: scheduled/automated report delivery (email/export on a cron) can wrap
// this same aggregation and write to a `reports` table or send a digest.
//
// `orgId` scopes the dashboard to a single organization (org admins pass their
// own org id; super_admin / IEP master can pass any org id to drill in, or omit
// it for an all-org view). Org separation is enforced at this application/query
// layer in this phase — see 0006_multi_tenant.sql.
export async function getAdminDashboard(orgId?: string) {
  const sb = createClient();

  // Participants are the tenant anchor. When org-scoped, filter here and then
  // scope every child query to the resulting participant ids.
  let partsQuery = sb
    .from("participants")
    .select(
      "id, participant_code, current_tier, status, region, intake_date, profile:profiles!participants_profile_id_fkey(full_name)",
    );
  if (orgId) partsQuery = partsQuery.eq("organization_id", orgId);
  const partsRes = await partsQuery;

  type PartRow = {
    id: string;
    participant_code: string;
    current_tier: ProgramTier;
    status: EnrollmentStatus;
    region: string | null;
    intake_date: string;
    profile: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const parts = (partsRes.data ?? []) as PartRow[];
  const partIds = parts.map((p) => p.id);

  // Helper: scope a child query to this org's participants when org-scoped.
  // (When no participants, return an always-empty result without a round-trip.)
  const scope = <T extends { in: (col: string, vals: string[]) => T }>(q: T) =>
    orgId ? q.in("participant_id", partIds) : q;

  const [
    lessonsRes,
    modulesRes,
    outcomesRes,
    employersRes,
    wblRes,
    attendanceRes,
    milestonesRes,
  ] = await Promise.all([
    partIds.length || !orgId
      ? scope(sb.from("lesson_progress").select("participant_id, module_id, status, completed_at") as any)
      : Promise.resolve({ data: [] }),
    sb.from("curriculum_modules").select("id, name"),
    partIds.length || !orgId
      ? scope(sb
          .from("outcomes")
          .select("participant_id, employment_status, hourly_wage, placement_date, employer_id") as any)
      : Promise.resolve({ data: [] }),
    sb.from("employers").select("id, name"),
    partIds.length || !orgId
      ? scope(sb.from("work_based_learning").select("participant_id, type, hours") as any)
      : Promise.resolve({ data: [] }),
    partIds.length || !orgId
      ? scope(sb.from("attendance").select("participant_id, status") as any)
      : Promise.resolve({ data: [] }),
    partIds.length || !orgId
      ? scope(sb.from("milestones").select("participant_id, name, status, achieved_on") as any)
      : Promise.resolve({ data: [] }),
  ]);
  const lessons = lessonsRes.data ?? [];
  const modules = modulesRes.data ?? [];
  const outcomes = outcomesRes.data ?? [];
  const employers = employersRes.data ?? [];
  const wbl = wblRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const milestones = milestonesRes.data ?? [];

  const nameOf = (p: PartRow) => {
    const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile;
    return prof?.full_name ?? p.participant_code;
  };
  const partById = new Map(parts.map((p) => [p.id, p]));
  const moduleName = new Map(modules.map((m) => [m.id, m.name]));
  const employerName = new Map(employers.map((e) => [e.id, e.name]));

  // ---- headline counts ----
  const total = parts.length;
  const active = parts.filter((p) => p.status === "active").length;
  const completed = parts.filter((p) => p.status === "completed").length;
  const completionRate = total ? (completed / total) * 100 : 0;

  // ---- per-participant completion (curriculum) ----
  const lpByPart = new Map<string, { done: number; all: number }>();
  for (const l of lessons) {
    const e = lpByPart.get(l.participant_id) ?? { done: 0, all: 0 };
    e.all += 1;
    if (l.status === "completed") e.done += 1;
    lpByPart.set(l.participant_id, e);
  }
  const completionPctOf = (id: string) => {
    const e = lpByPart.get(id);
    return e && e.all ? Math.round((e.done / e.all) * 100) : 0;
  };
  const totalLessons = lessons.length;
  const doneLessons = lessons.filter((l) => l.status === "completed").length;
  const avgCurriculum = totalLessons ? (doneLessons / totalLessons) * 100 : 0;

  // ---- attendance rate (present, late counts half) + per-participant for at-risk ----
  const attByPart = new Map<string, { present: number; total: number }>();
  let presentAll = 0;
  let attTotal = 0;
  for (const a of attendance) {
    const credit = a.status === "present" ? 1 : a.status === "late" ? 0.5 : 0;
    presentAll += credit;
    attTotal += 1;
    const e = attByPart.get(a.participant_id) ?? { present: 0, total: 0 };
    e.present += credit;
    e.total += 1;
    attByPart.set(a.participant_id, e);
  }
  const attendanceRate = attTotal ? (presentAll / attTotal) * 100 : 0;

  // at-risk: active participants with attendance < 70% or curriculum pace < 25%
  const atRisk = parts.filter((p) => {
    if (p.status !== "active") return false;
    const att = attByPart.get(p.id);
    const attPct = att && att.total ? (att.present / att.total) * 100 : 100;
    return attPct < 70 || completionPctOf(p.id) < 25;
  }).length;

  // ---- outcomes / placement / retention ----
  const placedOutcomes = outcomes.filter((o) =>
    PLACED.includes(o.employment_status as EmploymentStatus),
  );
  const placedCount = placedOutcomes.length;
  const placementRate = total ? (placedCount / total) * 100 : 0;
  const wages = placedOutcomes
    .map((o) => o.hourly_wage)
    .filter((w): w is number => w != null);
  const avgWage = wages.length ? wages.reduce((s, w) => s + w, 0) / wages.length : 0;

  const cnt = (statuses: EmploymentStatus[]) =>
    outcomes.filter((o) => statuses.includes(o.employment_status as EmploymentStatus)).length;
  const funnel = [
    { label: "Placed", value: placedCount },
    { label: "30-Day", value: cnt(["retained_30", "retained_90", "retained_180"]) },
    { label: "90-Day", value: cnt(["retained_90", "retained_180"]) },
    { label: "180-Day", value: cnt(["retained_180"]) },
  ];
  const retention90 = placedCount
    ? (cnt(["retained_90", "retained_180"]) / placedCount) * 100
    : 0;

  // ---- program health composite ----
  const programHealth = Math.round(
    0.4 * attendanceRate + 0.3 * avgCurriculum + 0.3 * placementRate,
  );

  // ---- tier distribution ----
  const tierColors: Record<ProgramTier, string> = {
    tier_1: "#A8E55F",
    tier_2: "#5B9DFF",
    tier_3: "#A78BFA",
  };
  const tierLabels: Record<ProgramTier, string> = {
    tier_1: "Tier 1 — Foundation",
    tier_2: "Tier 2 — Career Dev",
    tier_3: "Tier 3 — Reintegration",
  };
  const tiers = (["tier_1", "tier_2", "tier_3"] as ProgramTier[]).map((t) => ({
    name: tierLabels[t],
    value: parts.filter((p) => p.current_tier === t).length,
    color: tierColors[t],
  }));

  // ---- participation ----
  const participation = {
    jobShadow: wbl.filter((w) => w.type === "job_shadow").length,
    wbl: wbl.filter((w) => w.type === "work_based_learning").length,
    paid: wbl.filter((w) => w.type === "paid_work_experience").length,
  };

  // ---- paid work experience (admins asked to see this) ----
  const paidRows = wbl.filter((w) => w.type === "paid_work_experience");
  const paidParticipantIds = new Set(
    paidRows.map((w) => (w as { participant_id?: string }).participant_id).filter(Boolean),
  );
  const paidWork = {
    participants: paidParticipantIds.size,
    placements: paidRows.length,
    totalHours: Math.round(
      paidRows.reduce((s, w) => s + (Number((w as { hours?: number }).hours) || 0), 0),
    ),
  };

  // ---- regional reporting ----
  const regionMap = new Map<string, { total: number; active: number; doneSum: number }>();
  for (const p of parts) {
    const r = p.region ?? "Unassigned";
    const e = regionMap.get(r) ?? { total: 0, active: 0, doneSum: 0 };
    e.total += 1;
    if (p.status === "active") e.active += 1;
    e.doneSum += completionPctOf(p.id);
    regionMap.set(r, e);
  }
  const regions = Array.from(regionMap.entries())
    .map(([region, e]) => ({
      region,
      total: e.total,
      active: e.active,
      completion: Math.round(e.doneSum / e.total),
    }))
    .sort((a, b) => b.total - a.total);

  // ---- enrollment & completion trend (last 10 weeks, cumulative) ----
  const weeks = 10;
  const trend = Array.from({ length: weeks }).map((_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), weeks - 1 - i));
    const weekEnd = endOfWeek(weekStart);
    const enrolled = parts.filter(
      (p) => !isAfter(parseISO(p.intake_date), weekEnd),
    ).length;
    const completedLessons = lessons.filter(
      (l) =>
        l.status === "completed" &&
        l.completed_at &&
        !isAfter(parseISO(l.completed_at), weekEnd),
    ).length;
    return {
      label: format(weekStart, "MMM d"),
      enrolled,
      completed: completedLessons,
    };
  });

  // ---- recent activity feed ----
  const events: ActivityEvent[] = [];
  for (const p of parts) {
    events.push({
      id: `enr-${p.id}`,
      name: nameOf(p),
      action: "enrolled in",
      entity: tierLabels[p.current_tier],
      date: p.intake_date,
    });
  }
  for (const l of lessons) {
    if (l.status === "completed" && l.completed_at) {
      const p = partById.get(l.participant_id);
      if (!p) continue;
      events.push({
        id: `les-${l.participant_id}-${l.module_id}`,
        name: nameOf(p),
        action: "completed",
        entity: moduleName.get(l.module_id) ?? "a module",
        date: l.completed_at,
      });
    }
  }
  for (const o of placedOutcomes) {
    if (!o.placement_date) continue;
    const p = partById.get(o.participant_id);
    if (!p) continue;
    events.push({
      id: `out-${o.participant_id}`,
      name: nameOf(p),
      action: "was placed at",
      entity: o.employer_id ? employerName.get(o.employer_id) ?? "an employer" : "an employer",
      date: o.placement_date,
    });
  }
  for (const m of milestones) {
    if (m.status === "achieved" && m.achieved_on) {
      const p = partById.get(m.participant_id);
      if (!p) continue;
      events.push({
        id: `mil-${m.participant_id}-${m.name}`,
        name: nameOf(p),
        action: "achieved",
        entity: m.name,
        date: m.achieved_on,
      });
    }
  }
  const activity = events
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 9);

  // ---- roster (for CSV export) ----
  const tierShort: Record<ProgramTier, string> = {
    tier_1: "Tier 1",
    tier_2: "Tier 2",
    tier_3: "Tier 3",
  };
  const roster: RosterRow[] = parts
    .map((p) => ({
      code: p.participant_code,
      name: nameOf(p),
      tier: tierShort[p.current_tier],
      status: p.status,
      region: p.region ?? "Unassigned",
      completion: completionPctOf(p.id),
      intake: p.intake_date,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    kpis: {
      total,
      active,
      atRisk,
      completionRate: Math.round(completionRate),
      placementRate: Math.round(placementRate),
      retention90: Math.round(retention90),
      programHealth,
      programHealthLabel: healthLabel(programHealth),
      avgWage,
      placedCount,
      paidWorkParticipants: paidWork.participants,
      paidWorkHours: paidWork.totalHours,
    },
    trend,
    tiers,
    funnel,
    participation,
    paidWork,
    regions,
    activity,
    roster,
  };
}

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

// -----------------------------------------------------------------------------
// Org participant roster (admin Participants page)
// -----------------------------------------------------------------------------

export type OrgRosterRow = {
  id: string;
  code: string;
  name: string;
  tier: ProgramTier;
  status: EnrollmentStatus;
  region: string;
  completion: number;
  courseCompletion: number;
  attendanceRate: number;
  atRisk: boolean;
  staffName: string;
  lastActivity: string | null; // last attendance date, falling back to intake
  intakeDate: string;
};

/**
 * Full participant roster for one org, with curriculum completion, course
 * completion, attendance, assigned case manager and last activity. Org-scoped
 * via `orgId` (super_admin / unscoped passes undefined to see all participants).
 */
export async function getOrgRoster(orgId?: string): Promise<OrgRosterRow[]> {
  const sb = createClient();

  let partsQuery = sb
    .from("participants")
    .select(
      "id, participant_code, current_tier, status, region, intake_date, profile:profiles!participants_profile_id_fkey(full_name), staff:profiles!participants_assigned_staff_id_fkey(full_name)",
    );
  if (orgId) partsQuery = partsQuery.eq("organization_id", orgId);
  const partsRes = await partsQuery;

  type PRow = {
    id: string;
    participant_code: string;
    current_tier: ProgramTier;
    status: EnrollmentStatus;
    region: string | null;
    intake_date: string;
    profile: { full_name: string | null } | { full_name: string | null }[] | null;
    staff: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const parts = (partsRes.data ?? []) as PRow[];
  const partIds = parts.map((p) => p.id);

  if (orgId && partIds.length === 0) return [];

  const scope = <T extends { in: (col: string, vals: string[]) => T }>(q: T) =>
    orgId ? q.in("participant_id", partIds) : q;

  const [lessonsRes, attRes, courseProgRes] = await Promise.all([
    scope(sb.from("lesson_progress").select("participant_id, status") as any),
    scope(sb.from("attendance").select("participant_id, session_date, status") as any),
    scope(sb.from("course_progress").select("participant_id, completion_pct") as any),
  ]);
  const lessons = (lessonsRes.data ?? []) as {
    participant_id: string;
    status: string;
  }[];
  const att = (attRes.data ?? []) as {
    participant_id: string;
    session_date: string;
    status: string;
  }[];
  const courseProg = (courseProgRes.data ?? []) as {
    participant_id: string;
    completion_pct: number;
  }[];

  const pick = (
    p: { full_name: string | null } | { full_name: string | null }[] | null,
    fallback: string,
  ) => {
    const v = Array.isArray(p) ? p[0] : p;
    return v?.full_name ?? fallback;
  };

  const lp = new Map<string, { done: number; all: number }>();
  for (const l of lessons) {
    const e = lp.get(l.participant_id) ?? { done: 0, all: 0 };
    e.all += 1;
    if (l.status === "completed") e.done += 1;
    lp.set(l.participant_id, e);
  }
  const attMap = new Map<
    string,
    { present: number; total: number; last: string | null }
  >();
  for (const a of att) {
    const e = attMap.get(a.participant_id) ?? { present: 0, total: 0, last: null };
    e.total += 1;
    e.present += a.status === "present" ? 1 : a.status === "late" ? 0.5 : 0;
    if (!e.last || a.session_date > e.last) e.last = a.session_date;
    attMap.set(a.participant_id, e);
  }
  const cp = new Map<string, { sum: number; n: number }>();
  for (const c of courseProg) {
    const e = cp.get(c.participant_id) ?? { sum: 0, n: 0 };
    e.sum += c.completion_pct ?? 0;
    e.n += 1;
    cp.set(c.participant_id, e);
  }

  return parts
    .map((p) => {
      const l = lp.get(p.id);
      const completion = l && l.all ? Math.round((l.done / l.all) * 100) : 0;
      const a = attMap.get(p.id);
      const attendanceRate = a && a.total ? Math.round((a.present / a.total) * 100) : 0;
      const c = cp.get(p.id);
      const courseCompletion = c && c.n ? Math.round(c.sum / c.n) : 0;
      const atRisk =
        p.status === "active" && (attendanceRate < 70 || completion < 25);
      return {
        id: p.id,
        code: p.participant_code,
        name: pick(p.profile, p.participant_code),
        tier: p.current_tier,
        status: p.status,
        region: p.region ?? "Unassigned",
        completion,
        courseCompletion,
        attendanceRate,
        atRisk,
        staffName: pick(p.staff, "Unassigned"),
        lastActivity: a?.last ?? p.intake_date ?? null,
        intakeDate: p.intake_date,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// -----------------------------------------------------------------------------
// Org curriculum overview (admin Curriculum page)
// -----------------------------------------------------------------------------

export type CurriculumModuleStat = {
  id: string;
  name: string;
  sequence: number;
  enrolled: number; // participants with a lesson_progress row for this module
  completed: number; // participants who completed it
  completion: number; // % completed of enrolled
};

export type CurriculumTierGroup = {
  tier: ProgramTier;
  label: string;
  modules: CurriculumModuleStat[];
};

export type CourseCatalogStat = {
  id: string;
  title: string;
  track: string;
  isTrade: boolean;
  tier: ProgramTier | null;
  estHours: number | null;
  enrolled: number;
  avgCompletion: number;
  completed: number;
  quizzesPassed: number;
};

export type CourseTrackGroup = {
  track: string;
  label: string;
  courses: CourseCatalogStat[];
};

export type OrgCurriculumOverview = {
  tiers: CurriculumTierGroup[];
  tracks: CourseTrackGroup[];
  totals: {
    moduleCompletion: number;
    courseEnrollments: number;
    avgCourseCompletion: number;
    quizzesPassed: number;
  };
};

const TIER_LABELS: Record<ProgramTier, string> = {
  tier_1: "Tier 1 — Foundation",
  tier_2: "Tier 2 — Career Development",
  tier_3: "Tier 3 — Reintegration",
};

function trackLabel(track: string) {
  return track
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Read-only curriculum overview for an org: the 3-tier program modules with
 * aggregate completion, plus the course catalog grouped by track with the org's
 * enrollment / average completion / quizzes-passed per course. Org-scoped via
 * `orgId` (undefined = all participants for super_admin).
 */
export async function getOrgCurriculumOverview(
  orgId?: string,
): Promise<OrgCurriculumOverview> {
  const sb = createClient();

  let partIds: string[] | null = null;
  if (orgId) {
    const partsRes = await sb
      .from("participants")
      .select("id")
      .eq("organization_id", orgId);
    partIds = ((partsRes.data ?? []) as { id: string }[]).map((p) => p.id);
  }
  const scope = <T extends { in: (col: string, vals: string[]) => T }>(q: T) =>
    partIds ? q.in("participant_id", partIds) : q;

  const emptyScoped = orgId && (partIds?.length ?? 0) === 0;

  const [modulesRes, lessonsRes, coursesRes, courseProgRes, quizzesRes, attemptsRes] =
    await Promise.all([
      sb.from("curriculum_modules").select("id, tier, name, sequence").order("sequence"),
      emptyScoped
        ? Promise.resolve({ data: [] })
        : scope(sb.from("lesson_progress").select("participant_id, module_id, status") as any),
      sb
        .from("courses")
        .select("id, track, title, tier, is_trade, est_hours, sequence")
        .eq("is_active", true)
        .order("track")
        .order("sequence"),
      emptyScoped
        ? Promise.resolve({ data: [] })
        : scope(sb.from("course_progress").select("participant_id, course_id, status, completion_pct") as any),
      sb.from("quizzes").select("id, course_id"),
      emptyScoped
        ? Promise.resolve({ data: [] })
        : scope(sb.from("quiz_attempts").select("participant_id, quiz_id, passed") as any),
    ]);

  const modules = (modulesRes.data ?? []) as {
    id: string;
    tier: ProgramTier;
    name: string;
    sequence: number;
  }[];
  const lessons = (lessonsRes.data ?? []) as {
    participant_id: string;
    module_id: string;
    status: string;
  }[];
  const courses = (coursesRes.data ?? []) as {
    id: string;
    track: string;
    title: string;
    tier: ProgramTier | null;
    is_trade: boolean;
    est_hours: number | null;
    sequence: number;
  }[];
  const courseProg = (courseProgRes.data ?? []) as {
    course_id: string;
    status: string;
    completion_pct: number;
  }[];
  const quizzes = (quizzesRes.data ?? []) as { id: string; course_id: string }[];
  const attempts = (attemptsRes.data ?? []) as { quiz_id: string; passed: boolean }[];

  // ---- curriculum modules by tier ----
  const modStat = new Map<string, { enrolled: number; completed: number }>();
  for (const l of lessons) {
    const e = modStat.get(l.module_id) ?? { enrolled: 0, completed: 0 };
    e.enrolled += 1;
    if (l.status === "completed") e.completed += 1;
    modStat.set(l.module_id, e);
  }
  let totalModEnrolled = 0;
  let totalModCompleted = 0;
  const tierMap = new Map<ProgramTier, CurriculumModuleStat[]>();
  for (const m of modules) {
    const s = modStat.get(m.id) ?? { enrolled: 0, completed: 0 };
    totalModEnrolled += s.enrolled;
    totalModCompleted += s.completed;
    const stat: CurriculumModuleStat = {
      id: m.id,
      name: m.name,
      sequence: m.sequence,
      enrolled: s.enrolled,
      completed: s.completed,
      completion: s.enrolled ? Math.round((s.completed / s.enrolled) * 100) : 0,
    };
    const arr = tierMap.get(m.tier) ?? [];
    arr.push(stat);
    tierMap.set(m.tier, arr);
  }
  const tiers: CurriculumTierGroup[] = (["tier_1", "tier_2", "tier_3"] as ProgramTier[]).map(
    (t) => ({
      tier: t,
      label: TIER_LABELS[t],
      modules: (tierMap.get(t) ?? []).sort((a, b) => a.sequence - b.sequence),
    }),
  );

  // ---- course catalog by track ----
  const quizByCourse = new Map(quizzes.map((q) => [q.course_id, q.id]));
  const passedByQuiz = new Map<string, number>();
  for (const a of attempts) {
    if (a.passed) passedByQuiz.set(a.quiz_id, (passedByQuiz.get(a.quiz_id) ?? 0) + 1);
  }
  const progByCourse = new Map<string, { sum: number; n: number; completed: number }>();
  for (const p of courseProg) {
    const e = progByCourse.get(p.course_id) ?? { sum: 0, n: 0, completed: 0 };
    e.sum += p.completion_pct ?? 0;
    e.n += 1;
    if (p.status === "completed") e.completed += 1;
    progByCourse.set(p.course_id, e);
  }

  let totalCourseEnrollments = 0;
  let totalCourseComplSum = 0;
  let totalQuizzesPassed = 0;
  const trackMap = new Map<string, CourseCatalogStat[]>();
  for (const c of courses) {
    const pr = progByCourse.get(c.id) ?? { sum: 0, n: 0, completed: 0 };
    const quizId = quizByCourse.get(c.id);
    const passed = quizId ? passedByQuiz.get(quizId) ?? 0 : 0;
    totalCourseEnrollments += pr.n;
    totalCourseComplSum += pr.sum;
    totalQuizzesPassed += passed;
    const stat: CourseCatalogStat = {
      id: c.id,
      title: c.title,
      track: c.track,
      isTrade: c.is_trade,
      tier: c.tier,
      estHours: c.est_hours,
      enrolled: pr.n,
      avgCompletion: pr.n ? Math.round(pr.sum / pr.n) : 0,
      completed: pr.completed,
      quizzesPassed: passed,
    };
    const arr = trackMap.get(c.track) ?? [];
    arr.push(stat);
    trackMap.set(c.track, arr);
  }
  const tracks: CourseTrackGroup[] = Array.from(trackMap.entries())
    .map(([track, list]) => ({ track, label: trackLabel(track), courses: list }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    tiers,
    tracks,
    totals: {
      moduleCompletion: totalModEnrolled
        ? Math.round((totalModCompleted / totalModEnrolled) * 100)
        : 0,
      courseEnrollments: totalCourseEnrollments,
      avgCourseCompletion: totalCourseEnrollments
        ? Math.round(totalCourseComplSum / totalCourseEnrollments)
        : 0,
      quizzesPassed: totalQuizzesPassed,
    },
  };
}
