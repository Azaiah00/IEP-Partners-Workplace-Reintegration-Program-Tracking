// lib/queries/wioa.ts
//
// WIOA-style outcome indicators + downloadable report datasets.
//
// IMPORTANT — PROGRAM APPROXIMATIONS, NOT OFFICIAL FIGURES
// --------------------------------------------------------
// The indicators below are PROGRAM-LEVEL APPROXIMATIONS of the federal WIOA
// primary indicators of performance (Employment Rate Q2/Q4, Median Earnings,
// Credential Attainment, Measurable Skill Gains, Retention with the same
// employer). They are computed from the data we already collect in this portal
// (outcomes, course_progress, quiz_attempts, milestones, documents, enrollments,
// work_based_learning). They are NOT state-validated UI-wage-record figures and
// should not be reported to a state board as official performance numbers.
// They exist to give program staff and IEP leadership a directional, demo-ready
// view of how the cohort is tracking against the WIOA framework.
//
// All helpers are org-scoped via `orgId` (org admins pass their own org id;
// IEP super_admin passes `undefined`/`null` for an all-organizations view),
// mirroring the batch-query pattern in lib/queries/admin.ts.

import { createClient } from "@/lib/supabase/server";
import type {
  EmploymentStatus,
  ProgramTier,
  EnrollmentStatus,
  WblType,
} from "@/types/db";

const PLACED: EmploymentStatus[] = [
  "placed",
  "retained_30",
  "retained_90",
  "retained_180",
];
const RETAINED: EmploymentStatus[] = [
  "retained_30",
  "retained_90",
  "retained_180",
];

export type WioaIndicator = {
  key: string;
  label: string;
  numerator: number;
  denominator: number;
  rate: number; // 0–100, rounded; for earnings this is unused (see value)
  value?: string; // pre-formatted display value (used for median earnings)
};

export type WioaOutcomes = {
  indicators: WioaIndicator[];
  medianHourlyWage: number | null;
  approxAnnualEarnings: number | null;
};

const TIER_SHORT: Record<ProgramTier, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function rate(num: number, den: number): number {
  return den ? Math.round((num / den) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Shared org-scoped fetch. Loads every table the WIOA + report datasets need in
// one batch (one round of parallel queries), scoped to the org's participants.
// ---------------------------------------------------------------------------
type ParticipantRow = {
  id: string;
  participant_code: string;
  current_tier: ProgramTier;
  status: EnrollmentStatus;
  region: string | null;
  organization_id: string | null;
  intake_date: string;
  profile: { full_name: string | null } | { full_name: string | null }[] | null;
};

type WioaDataset = {
  parts: ParticipantRow[];
  partIds: string[];
  outcomes: {
    participant_id: string;
    employment_status: EmploymentStatus;
    hourly_wage: number | null;
    job_title: string | null;
    placement_date: string | null;
    employer_id: string | null;
  }[];
  courseProg: {
    participant_id: string;
    course_id: string;
    status: string;
    completion_pct: number;
  }[];
  attempts: { participant_id: string; quiz_id: string; score: number; passed: boolean }[];
  quizzes: { id: string; course_id: string }[];
  courses: { id: string; title: string; track: string; is_trade: boolean }[];
  milestones: { participant_id: string; name: string; status: string }[];
  documents: { participant_id: string; type: string }[];
  enrollments: { participant_id: string; status: string }[];
  attendance: { participant_id: string; status: string }[];
  wbl: {
    participant_id: string;
    employer_id: string | null;
    type: WblType;
    hours: number | null;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  employers: {
    id: string;
    name: string;
    industry: string | null;
    stage: string;
    region: string | null;
    contact_name: string | null;
  }[];
};

async function loadWioaDataset(orgId?: string): Promise<WioaDataset> {
  const sb = createClient();

  let partsQuery = sb
    .from("participants")
    .select(
      "id, participant_code, current_tier, status, region, organization_id, intake_date, profile:profiles!participants_profile_id_fkey(full_name)",
    );
  if (orgId) partsQuery = partsQuery.eq("organization_id", orgId);
  const partsRes = await partsQuery;
  const parts = (partsRes.data ?? []) as ParticipantRow[];
  const partIds = parts.map((p) => p.id);

  const scope = <T extends { in: (col: string, vals: string[]) => T }>(q: T) =>
    orgId ? q.in("participant_id", partIds) : q;

  const emptyScoped = orgId && partIds.length === 0;
  const empty = Promise.resolve({ data: [] as any[] });

  const [
    outcomesRes,
    courseProgRes,
    attemptsRes,
    quizzesRes,
    coursesRes,
    milestonesRes,
    documentsRes,
    enrollmentsRes,
    attendanceRes,
    wblRes,
    employersRes,
  ] = await Promise.all([
    emptyScoped
      ? empty
      : scope(
          sb
            .from("outcomes")
            .select(
              "participant_id, employment_status, hourly_wage, job_title, placement_date, employer_id",
            ) as any,
        ),
    emptyScoped
      ? empty
      : scope(
          sb
            .from("course_progress")
            .select("participant_id, course_id, status, completion_pct") as any,
        ),
    emptyScoped
      ? empty
      : scope(
          sb
            .from("quiz_attempts")
            .select("participant_id, quiz_id, score, passed") as any,
        ),
    sb.from("quizzes").select("id, course_id"),
    sb.from("courses").select("id, title, track, is_trade"),
    emptyScoped
      ? empty
      : scope(sb.from("milestones").select("participant_id, name, status") as any),
    emptyScoped
      ? empty
      : scope(sb.from("documents").select("participant_id, type") as any),
    emptyScoped
      ? empty
      : scope(sb.from("enrollments").select("participant_id, status") as any),
    emptyScoped
      ? empty
      : scope(sb.from("attendance").select("participant_id, status") as any),
    emptyScoped
      ? empty
      : scope(
          sb
            .from("work_based_learning")
            .select(
              "participant_id, employer_id, type, hours, status, start_date, end_date",
            ) as any,
        ),
    sb
      .from("employers")
      .select("id, name, industry, stage, region, contact_name"),
  ]);

  return {
    parts,
    partIds,
    outcomes: (outcomesRes.data ?? []) as WioaDataset["outcomes"],
    courseProg: (courseProgRes.data ?? []) as WioaDataset["courseProg"],
    attempts: (attemptsRes.data ?? []) as WioaDataset["attempts"],
    quizzes: (quizzesRes.data ?? []) as WioaDataset["quizzes"],
    courses: (coursesRes.data ?? []) as WioaDataset["courses"],
    milestones: (milestonesRes.data ?? []) as WioaDataset["milestones"],
    documents: (documentsRes.data ?? []) as WioaDataset["documents"],
    enrollments: (enrollmentsRes.data ?? []) as WioaDataset["enrollments"],
    attendance: (attendanceRes.data ?? []) as WioaDataset["attendance"],
    wbl: (wblRes.data ?? []) as WioaDataset["wbl"],
    employers: (employersRes.data ?? []) as WioaDataset["employers"],
  };
}

// Compute the WIOA indicator set from an already-loaded dataset (pure).
function computeIndicators(d: WioaDataset): WioaOutcomes {
  const nameOf = (p: ParticipantRow) => {
    const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile;
    return prof?.full_name ?? p.participant_code;
  };
  void nameOf; // (kept for parity with other helpers; not needed here)

  // --- Exit cohort: participants who have exited the program (completed /
  // withdrawn) OR who have any recorded placement outcome. Used as the
  // denominator for the employment-rate indicators. ---
  const placedByPart = new Set(
    d.outcomes
      .filter((o) => PLACED.includes(o.employment_status))
      .map((o) => o.participant_id),
  );
  const exitCohort = new Set<string>();
  for (const p of d.parts) {
    if (p.status === "completed" || p.status === "withdrawn") exitCohort.add(p.id);
  }
  for (const id of placedByPart) exitCohort.add(id);
  const exitDen = exitCohort.size;

  // --- Employment Rate Q2 (approx): placed/retained over the exit cohort. ---
  const empQ2Num = [...exitCohort].filter((id) => placedByPart.has(id)).length;

  // --- Employment Rate Q4 (approx): retained 90/180 over the exit cohort. ---
  const retained90Plus = new Set(
    d.outcomes
      .filter((o) =>
        (["retained_90", "retained_180"] as EmploymentStatus[]).includes(
          o.employment_status,
        ),
      )
      .map((o) => o.participant_id),
  );
  const empQ4Num = [...exitCohort].filter((id) => retained90Plus.has(id)).length;

  // --- Median Earnings (approx): median hourly_wage among placed participants. ---
  const wages = d.outcomes
    .filter((o) => PLACED.includes(o.employment_status) && o.hourly_wage != null)
    .map((o) => o.hourly_wage as number);
  const medianHourlyWage = median(wages);
  const approxAnnualEarnings =
    medianHourlyWage != null ? Math.round(medianHourlyWage * 40 * 52) : null;

  // --- Credential Attainment (approx): participants with a certificate/credential
  // document OR a completed trade course backed by a passing quiz. ---
  const tradeCourseIds = new Set(
    d.courses.filter((c) => c.is_trade).map((c) => c.id),
  );
  const quizByCourse = new Map(d.quizzes.map((q) => [q.course_id, q.id]));
  const passedQuizByPart = new Map<string, Set<string>>();
  for (const a of d.attempts) {
    if (!a.passed) continue;
    const set = passedQuizByPart.get(a.participant_id) ?? new Set<string>();
    set.add(a.quiz_id);
    passedQuizByPart.set(a.participant_id, set);
  }
  const credentialParts = new Set<string>();
  for (const doc of d.documents) {
    if (doc.type === "certificate" || doc.type === "credential")
      credentialParts.add(doc.participant_id);
  }
  for (const cp of d.courseProg) {
    if (cp.status !== "completed" || !tradeCourseIds.has(cp.course_id)) continue;
    const quizId = quizByCourse.get(cp.course_id);
    const passed = quizId
      ? passedQuizByPart.get(cp.participant_id)?.has(quizId)
      : false;
    if (passed) credentialParts.add(cp.participant_id);
  }

  // --- Measurable Skill Gains (approx): a documented gain — completed at least
  // one course OR passed any quiz OR achieved a milestone OR completed a tier
  // enrollment. ---
  const msgParts = new Set<string>();
  for (const cp of d.courseProg) {
    if (cp.status === "completed") msgParts.add(cp.participant_id);
  }
  for (const a of d.attempts) {
    if (a.passed) msgParts.add(a.participant_id);
  }
  for (const m of d.milestones) {
    if (m.status === "achieved") msgParts.add(m.participant_id);
  }
  for (const e of d.enrollments) {
    if (e.status === "completed") msgParts.add(e.participant_id);
  }

  // --- Retention with the same employer (approx): placed participants who
  // reached any retained_* status. ---
  const retainedParts = new Set(
    d.outcomes
      .filter((o) => RETAINED.includes(o.employment_status))
      .map((o) => o.participant_id),
  );

  const totalParts = d.parts.length;
  const placedDen = placedByPart.size;

  const indicators: WioaIndicator[] = [
    {
      key: "employment_rate_q2",
      label: "Employment Rate (Q2 approx.)",
      numerator: empQ2Num,
      denominator: exitDen,
      rate: rate(empQ2Num, exitDen),
    },
    {
      key: "employment_rate_q4",
      label: "Employment Rate (Q4 approx.)",
      numerator: empQ4Num,
      denominator: exitDen,
      rate: rate(empQ4Num, exitDen),
    },
    {
      key: "median_earnings",
      label: "Median Earnings (Q2 approx.)",
      numerator: wages.length,
      denominator: placedDen,
      rate: 0,
      value:
        medianHourlyWage != null
          ? `$${medianHourlyWage.toFixed(2)}/hr (~$${(approxAnnualEarnings ?? 0).toLocaleString()}/yr)`
          : "—",
    },
    {
      key: "credential_attainment_rate",
      label: "Credential Attainment Rate",
      numerator: credentialParts.size,
      denominator: totalParts,
      rate: rate(credentialParts.size, totalParts),
    },
    {
      key: "measurable_skill_gains_rate",
      label: "Measurable Skill Gains (MSG)",
      numerator: msgParts.size,
      denominator: totalParts,
      rate: rate(msgParts.size, totalParts),
    },
    {
      key: "retention_same_employer_rate",
      label: "Retention with Same Employer",
      numerator: retainedParts.size,
      denominator: placedDen,
      rate: rate(retainedParts.size, placedDen),
    },
  ];

  return { indicators, medianHourlyWage, approxAnnualEarnings };
}

/**
 * Org-scoped (or all-orgs when `orgId` is null/undefined) WIOA-style indicators.
 * See the file header for the approximation caveat.
 */
export async function getWioaOutcomes(orgId?: string | null): Promise<WioaOutcomes> {
  const d = await loadWioaDataset(orgId ?? undefined);
  return computeIndicators(d);
}

export type WioaOrgRow = {
  orgId: string;
  orgName: string;
  participants: number;
  employmentQ2: number;
  employmentQ4: number;
  credential: number;
  msg: number;
  retention: number;
  medianWage: number | null;
};

/**
 * Per-organization WIOA indicator breakdown for the IEP master view
 * (cross-facility comparison). Loads the full all-orgs dataset once and splits
 * it per organization in-memory.
 */
export async function getWioaByOrg(): Promise<WioaOrgRow[]> {
  const sb = createClient();
  const [d, orgsRes] = await Promise.all([
    loadWioaDataset(undefined),
    sb.from("organizations").select("id, name, type"),
  ]);
  const orgs = (orgsRes.data ?? []) as {
    id: string;
    name: string;
    type: string;
  }[];

  // Group participant ids by org.
  const partsByOrg = new Map<string, ParticipantRow[]>();
  for (const p of d.parts) {
    if (!p.organization_id) continue;
    const arr = partsByOrg.get(p.organization_id) ?? [];
    arr.push(p);
    partsByOrg.set(p.organization_id, arr);
  }

  return orgs
    .filter((o) => o.type !== "iep_master")
    .map((o) => {
      const parts = partsByOrg.get(o.id) ?? [];
      const ids = new Set(parts.map((p) => p.id));
      const subset: WioaDataset = {
        parts,
        partIds: parts.map((p) => p.id),
        outcomes: d.outcomes.filter((x) => ids.has(x.participant_id)),
        courseProg: d.courseProg.filter((x) => ids.has(x.participant_id)),
        attempts: d.attempts.filter((x) => ids.has(x.participant_id)),
        quizzes: d.quizzes,
        courses: d.courses,
        milestones: d.milestones.filter((x) => ids.has(x.participant_id)),
        documents: d.documents.filter((x) => ids.has(x.participant_id)),
        enrollments: d.enrollments.filter((x) => ids.has(x.participant_id)),
        attendance: d.attendance.filter((x) => ids.has(x.participant_id)),
        wbl: d.wbl.filter((x) => ids.has(x.participant_id)),
        employers: d.employers,
      };
      const { indicators, medianHourlyWage } = computeIndicators(subset);
      const byKey = new Map(indicators.map((i) => [i.key, i]));
      return {
        orgId: o.id,
        orgName: o.name,
        participants: parts.length,
        employmentQ2: byKey.get("employment_rate_q2")?.rate ?? 0,
        employmentQ4: byKey.get("employment_rate_q4")?.rate ?? 0,
        credential: byKey.get("credential_attainment_rate")?.rate ?? 0,
        msg: byKey.get("measurable_skill_gains_rate")?.rate ?? 0,
        retention: byKey.get("retention_same_employer_rate")?.rate ?? 0,
        medianWage: medianHourlyWage,
      };
    })
    .sort((a, b) => b.participants - a.participants);
}

// ===========================================================================
// TASK B — Downloadable report datasets.
//
// Each returns `{ columns, rows }` ready to feed PdfButton (rows.columns /
// rows.data) and the CSV ExportButton (columns / rows). All org-scoped.
// ===========================================================================

export type ReportColumn = { key: string; label: string };
export type ReportDataset = {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
};

const nameOfPart = (p: ParticipantRow) => {
  const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile;
  return prof?.full_name ?? p.participant_code;
};

/** 1. Attendance Report — per participant attendance breakdown. */
export async function getAttendanceReport(orgId?: string | null): Promise<ReportDataset> {
  const sb = createClient();
  let partsQuery = sb
    .from("participants")
    .select(
      "id, participant_code, current_tier, organization_id, profile:profiles!participants_profile_id_fkey(full_name)",
    );
  if (orgId) partsQuery = partsQuery.eq("organization_id", orgId);
  const partsRes = await partsQuery;
  const parts = (partsRes.data ?? []) as ParticipantRow[];
  const partIds = parts.map((p) => p.id);
  if (orgId && partIds.length === 0)
    return { columns: ATTENDANCE_COLUMNS, rows: [] };

  let attQuery = sb.from("attendance").select("participant_id, status");
  if (orgId) attQuery = attQuery.in("participant_id", partIds);
  const attRes = await attQuery;
  const att = (attRes.data ?? []) as { participant_id: string; status: string }[];

  const byPart = new Map<
    string,
    { present: number; absent: number; late: number; excused: number; total: number }
  >();
  for (const a of att) {
    const e =
      byPart.get(a.participant_id) ??
      { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    e.total += 1;
    if (a.status === "present") e.present += 1;
    else if (a.status === "absent") e.absent += 1;
    else if (a.status === "late") e.late += 1;
    else if (a.status === "excused") e.excused += 1;
    byPart.set(a.participant_id, e);
  }

  const rows = parts
    .map((p) => {
      const e = byPart.get(p.id) ?? {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
      const credit = e.present + e.late * 0.5;
      const attendanceRate = e.total ? Math.round((credit / e.total) * 100) : 0;
      return {
        code: p.participant_code,
        name: nameOfPart(p),
        tier: TIER_SHORT[p.current_tier],
        sessions: e.total,
        present: e.present,
        absent: e.absent,
        late: e.late,
        excused: e.excused,
        attendanceRate,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { columns: ATTENDANCE_COLUMNS, rows };
}

export const ATTENDANCE_COLUMNS: ReportColumn[] = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "tier", label: "Tier" },
  { key: "sessions", label: "Sessions" },
  { key: "present", label: "Present" },
  { key: "absent", label: "Absent" },
  { key: "late", label: "Late" },
  { key: "excused", label: "Excused" },
  { key: "attendanceRate", label: "Attendance %" },
];

/** 2. Course & Quiz Scores Report — per participant learning summary. */
export async function getCourseScoresReport(
  orgId?: string | null,
): Promise<ReportDataset> {
  const d = await loadWioaDataset(orgId ?? undefined);

  const quizByCourse = new Map(d.quizzes.map((q) => [q.course_id, q.id]));
  // best score per (participant, quiz)
  const bestByPartQuiz = new Map<string, { score: number; passed: boolean }>();
  for (const a of d.attempts) {
    const key = `${a.participant_id}::${a.quiz_id}`;
    const prev = bestByPartQuiz.get(key);
    if (!prev || a.score > prev.score) {
      bestByPartQuiz.set(key, {
        score: a.score,
        passed: a.passed || (prev?.passed ?? false),
      });
    } else if (a.passed && prev && !prev.passed) {
      bestByPartQuiz.set(key, { ...prev, passed: true });
    }
  }

  const progByPart = new Map<
    string,
    { enrolled: number; completed: number }
  >();
  const scoresByPart = new Map<string, number[]>();
  const passedByPart = new Map<string, number>();
  for (const cp of d.courseProg) {
    const e = progByPart.get(cp.participant_id) ?? { enrolled: 0, completed: 0 };
    e.enrolled += 1;
    if (cp.status === "completed") e.completed += 1;
    progByPart.set(cp.participant_id, e);

    const quizId = quizByCourse.get(cp.course_id);
    if (quizId) {
      const best = bestByPartQuiz.get(`${cp.participant_id}::${quizId}`);
      if (best) {
        const arr = scoresByPart.get(cp.participant_id) ?? [];
        arr.push(best.score);
        scoresByPart.set(cp.participant_id, arr);
        if (best.passed)
          passedByPart.set(
            cp.participant_id,
            (passedByPart.get(cp.participant_id) ?? 0) + 1,
          );
      }
    }
  }

  const rows = d.parts
    .map((p) => {
      const prog = progByPart.get(p.id) ?? { enrolled: 0, completed: 0 };
      const scores = scoresByPart.get(p.id) ?? [];
      const avgQuizScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      return {
        code: p.participant_code,
        name: nameOfPart(p),
        coursesEnrolled: prog.enrolled,
        coursesCompleted: prog.completed,
        avgQuizScore: avgQuizScore != null ? `${avgQuizScore}%` : "—",
        quizzesPassed: passedByPart.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { columns: COURSE_SCORES_COLUMNS, rows };
}

export const COURSE_SCORES_COLUMNS: ReportColumn[] = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "coursesEnrolled", label: "Courses Enrolled" },
  { key: "coursesCompleted", label: "Courses Completed" },
  { key: "avgQuizScore", label: "Avg Quiz Score" },
  { key: "quizzesPassed", label: "Quizzes Passed" },
];

/** 3. Work-Based Learning / Paid Work Report — per WBL row. */
export async function getWblReport(orgId?: string | null): Promise<ReportDataset> {
  const sb = createClient();

  let partIds: string[] | null = null;
  let partName = new Map<string, string>();
  // We need participant names; fetch participants (scoped) once.
  let partsQuery = sb
    .from("participants")
    .select(
      "id, participant_code, organization_id, profile:profiles!participants_profile_id_fkey(full_name)",
    );
  if (orgId) partsQuery = partsQuery.eq("organization_id", orgId);
  const partsRes = await partsQuery;
  const parts = (partsRes.data ?? []) as ParticipantRow[];
  partName = new Map(parts.map((p) => [p.id, nameOfPart(p)]));
  if (orgId) {
    partIds = parts.map((p) => p.id);
    if (partIds.length === 0) return { columns: WBL_COLUMNS, rows: [] };
  }

  let wblQuery = sb
    .from("work_based_learning")
    .select(
      "participant_id, type, hours, status, start_date, end_date, employer:employers(name)",
    )
    .order("start_date", { ascending: false });
  if (partIds) wblQuery = wblQuery.in("participant_id", partIds);
  const wblRes = await wblQuery;

  const typeLabel: Record<WblType, string> = {
    job_shadow: "Job Shadow",
    work_based_learning: "Work-Based Learning",
    paid_work_experience: "Paid Work Experience",
  };

  const rows = ((wblRes.data ?? []) as any[]).map((w) => {
    const emp = Array.isArray(w.employer) ? w.employer[0] : w.employer;
    return {
      participant: partName.get(w.participant_id) ?? "—",
      employer: (emp as { name?: string } | null)?.name ?? "—",
      type: typeLabel[w.type as WblType] ?? w.type,
      hours: w.hours ?? 0,
      status: w.status ?? "—",
      startDate: w.start_date ?? "—",
      endDate: w.end_date ?? "—",
    };
  });

  return { columns: WBL_COLUMNS, rows };
}

export const WBL_COLUMNS: ReportColumn[] = [
  { key: "participant", label: "Participant" },
  { key: "employer", label: "Employer" },
  { key: "type", label: "Type" },
  { key: "hours", label: "Hours" },
  { key: "status", label: "Status" },
  { key: "startDate", label: "Start" },
  { key: "endDate", label: "End" },
];

/** 4. Employer Engagement Report — per employer with linked WBL/placements. */
export async function getEmployerEngagementReport(
  orgId?: string | null,
): Promise<ReportDataset> {
  const d = await loadWioaDataset(orgId ?? undefined);

  const wblByEmployer = new Map<string, number>();
  for (const w of d.wbl) {
    if (!w.employer_id) continue;
    wblByEmployer.set(w.employer_id, (wblByEmployer.get(w.employer_id) ?? 0) + 1);
  }
  const placementsByEmployer = new Map<string, number>();
  for (const o of d.outcomes) {
    if (!o.employer_id || !PLACED.includes(o.employment_status)) continue;
    placementsByEmployer.set(
      o.employer_id,
      (placementsByEmployer.get(o.employer_id) ?? 0) + 1,
    );
  }

  const rows = d.employers
    .map((e) => {
      const wbl = wblByEmployer.get(e.id) ?? 0;
      const placements = placementsByEmployer.get(e.id) ?? 0;
      return {
        name: e.name,
        industry: e.industry ?? "—",
        stage: e.stage
          ? e.stage.charAt(0).toUpperCase() + e.stage.slice(1)
          : "—",
        contact: e.contact_name ?? "—",
        region: e.region ?? "—",
        linked: wbl + placements,
      };
    })
    // For org-scoped admins, only show employers with linked activity for the
    // org (keeps the report meaningful); IEP all-orgs shows the full directory.
    .filter((r) => (orgId ? r.linked > 0 : true))
    .sort((a, b) => b.linked - a.linked || a.name.localeCompare(b.name));

  return { columns: EMPLOYER_COLUMNS, rows };
}

export const EMPLOYER_COLUMNS: ReportColumn[] = [
  { key: "name", label: "Employer" },
  { key: "industry", label: "Industry" },
  { key: "stage", label: "Stage" },
  { key: "contact", label: "Contact" },
  { key: "region", label: "Region" },
  { key: "linked", label: "Linked WBL / Placements" },
];

/** 6. WIOA Outcomes Report — indicators as a rows table. */
export async function getWioaReport(orgId?: string | null): Promise<ReportDataset> {
  const { indicators } = await getWioaOutcomes(orgId);
  const rows = indicators.map((i) => ({
    indicator: i.label,
    numerator: i.numerator,
    denominator: i.denominator,
    result: i.value ?? `${i.rate}%`,
  }));
  return { columns: WIOA_REPORT_COLUMNS, rows };
}

export const WIOA_REPORT_COLUMNS: ReportColumn[] = [
  { key: "indicator", label: "Indicator" },
  { key: "numerator", label: "Numerator" },
  { key: "denominator", label: "Denominator" },
  { key: "result", label: "Result" },
];
