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
export async function getAdminDashboard() {
  const sb = createClient();

  const [
    partsRes,
    lessonsRes,
    modulesRes,
    outcomesRes,
    employersRes,
    wblRes,
    attendanceRes,
    milestonesRes,
  ] = await Promise.all([
    sb
      .from("participants")
      .select(
        "id, participant_code, current_tier, status, region, intake_date, profile:profiles!participants_profile_id_fkey(full_name)",
      ),
    sb.from("lesson_progress").select("participant_id, module_id, status, completed_at"),
    sb.from("curriculum_modules").select("id, name"),
    sb
      .from("outcomes")
      .select("participant_id, employment_status, hourly_wage, placement_date, employer_id"),
    sb.from("employers").select("id, name"),
    sb.from("work_based_learning").select("type"),
    sb.from("attendance").select("participant_id, status"),
    sb.from("milestones").select("participant_id, name, status, achieved_on"),
  ]);

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
    },
    trend,
    tiers,
    funnel,
    participation,
    regions,
    activity,
    roster,
  };
}

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
