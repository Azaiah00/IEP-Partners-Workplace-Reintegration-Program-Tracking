import { createClient } from "@/lib/supabase/server";
import { getMyOrgId } from "@/lib/auth";
import type {
  Participant,
  ProgramTier,
  EnrollmentStatus,
  Enrollment,
  Attendance,
  Assessment,
  CareerInterest,
  Goal,
  Milestone,
  CaseNote,
  TransitionPlan,
  DocumentRow,
  Employer,
  Outcome,
} from "@/types/db";

const PROFILE_NAME = "profiles!participants_profile_id_fkey(full_name)";
const STAFF_NAME = "profiles!participants_assigned_staff_id_fkey(full_name)";

function pickName(
  profile: { full_name: string | null } | { full_name: string | null }[] | null,
  fallback: string,
) {
  const p = Array.isArray(profile) ? profile[0] : profile;
  return p?.full_name ?? fallback;
}

export type CaseloadRow = {
  id: string;
  code: string;
  name: string;
  tier: ProgramTier;
  status: EnrollmentStatus;
  region: string;
  completion: number;
  attendanceRate: number;
  atRisk: boolean;
  lastAttendance: { date: string; status: string } | null;
  intakeDate: string;
};

export async function getCaseload(): Promise<CaseloadRow[]> {
  const sb = createClient();
  // App-layer org scoping: staff only see their own org's participants.
  // super_admin / unassigned (orgId === null) see all.
  const orgId = await getMyOrgId();
  let partsQuery = sb
    .from("participants")
    .select(
      `id, participant_code, current_tier, status, region, intake_date, profile:${PROFILE_NAME}`,
    );
  if (orgId) partsQuery = partsQuery.eq("organization_id", orgId);

  const [partsRes, lessonsRes, attRes] = await Promise.all([
    partsQuery,
    sb.from("lesson_progress").select("participant_id, status"),
    sb.from("attendance").select("participant_id, session_date, status"),
  ]);

  type PRow = {
    id: string;
    participant_code: string;
    current_tier: ProgramTier;
    status: EnrollmentStatus;
    region: string | null;
    intake_date: string;
    profile: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const parts = (partsRes.data ?? []) as PRow[];
  const lessons = lessonsRes.data ?? [];
  const att = attRes.data ?? [];

  const lp = new Map<string, { done: number; all: number }>();
  for (const l of lessons) {
    const e = lp.get(l.participant_id) ?? { done: 0, all: 0 };
    e.all += 1;
    if (l.status === "completed") e.done += 1;
    lp.set(l.participant_id, e);
  }
  const attMap = new Map<
    string,
    { present: number; total: number; last: { date: string; status: string } | null }
  >();
  for (const a of att) {
    const e = attMap.get(a.participant_id) ?? { present: 0, total: 0, last: null };
    e.total += 1;
    e.present += a.status === "present" ? 1 : a.status === "late" ? 0.5 : 0;
    if (!e.last || a.session_date > e.last.date)
      e.last = { date: a.session_date, status: a.status };
    attMap.set(a.participant_id, e);
  }

  return parts
    .map((p) => {
      const l = lp.get(p.id);
      const completion = l && l.all ? Math.round((l.done / l.all) * 100) : 0;
      const a = attMap.get(p.id);
      const attendanceRate = a && a.total ? Math.round((a.present / a.total) * 100) : 0;
      const atRisk =
        p.status === "active" && (attendanceRate < 70 || completion < 25);
      return {
        id: p.id,
        code: p.participant_code,
        name: pickName(p.profile, p.participant_code),
        tier: p.current_tier,
        status: p.status,
        region: p.region ?? "Unassigned",
        completion,
        attendanceRate,
        atRisk,
        lastAttendance: a?.last ?? null,
        intakeDate: p.intake_date,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type ParticipantDetail = {
  participant: Participant & { name: string; staffName: string };
  enrollments: Enrollment[];
  lessons: {
    id: string;
    module_id: string;
    status: string;
    completed_at: string | null;
    moduleName: string;
    tier: ProgramTier;
    sequence: number;
  }[];
  attendance: Attendance[];
  assessments: Assessment[];
  interests: CareerInterest[];
  goals: Goal[];
  milestones: Milestone[];
  caseNotes: (CaseNote & { staffName: string })[];
  transitionPlan: TransitionPlan | null;
  documents: DocumentRow[];
  wbl: {
    id: string;
    type: string;
    start_date: string | null;
    end_date: string | null;
    hours: number;
    status: string | null;
    employerName: string;
  }[];
  outcome: Outcome | null;
  employers: { id: string; name: string }[];
};

export async function getParticipantDetail(
  id: string,
): Promise<ParticipantDetail | null> {
  const sb = createClient();

  const partRes = await sb
    .from("participants")
    .select(`*, profile:${PROFILE_NAME}, staff:${STAFF_NAME}`)
    .eq("id", id)
    .maybeSingle();
  if (!partRes.data) return null;
  const praw = partRes.data as unknown as Participant & {
    profile: { full_name: string | null } | { full_name: string | null }[] | null;
    staff: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const [
    enrollmentsRes,
    lessonsRes,
    attendanceRes,
    assessmentsRes,
    interestsRes,
    goalsRes,
    milestonesRes,
    notesRes,
    planRes,
    docsRes,
    wblRes,
    outcomeRes,
    employersRes,
  ] = await Promise.all([
    sb.from("enrollments").select("*").eq("participant_id", id).order("start_date"),
    sb
      .from("lesson_progress")
      .select("id, module_id, status, completed_at, module:curriculum_modules(name, tier, sequence)")
      .eq("participant_id", id),
    sb
      .from("attendance")
      .select("*")
      .eq("participant_id", id)
      .order("session_date", { ascending: false })
      .limit(30),
    sb.from("assessments").select("*").eq("participant_id", id).order("taken_on", { ascending: false }),
    sb.from("career_interests").select("*").eq("participant_id", id).order("rank"),
    sb.from("goals").select("*").eq("participant_id", id).order("created_at", { ascending: false }),
    sb.from("milestones").select("*").eq("participant_id", id).order("sequence"),
    sb
      .from("case_notes")
      .select("*, staff:profiles!case_notes_staff_id_fkey(full_name)")
      .eq("participant_id", id)
      .order("created_at", { ascending: false }),
    sb.from("transition_plans").select("*").eq("participant_id", id).maybeSingle(),
    sb.from("documents").select("*").eq("participant_id", id).order("created_at", { ascending: false }),
    sb
      .from("work_based_learning")
      .select("id, type, start_date, end_date, hours, status, employer:employers(name)")
      .eq("participant_id", id)
      .order("start_date", { ascending: false }),
    sb.from("outcomes").select("*").eq("participant_id", id).order("created_at", { ascending: false }).limit(1),
    sb.from("employers").select("id, name").order("name"),
  ]);

  const lessons = (lessonsRes.data ?? []).map((l) => {
    const m = (Array.isArray(l.module) ? l.module[0] : l.module) as
      | { name: string; tier: ProgramTier; sequence: number }
      | null;
    return {
      id: l.id,
      module_id: l.module_id,
      status: l.status,
      completed_at: l.completed_at,
      moduleName: m?.name ?? "Module",
      tier: (m?.tier ?? "tier_1") as ProgramTier,
      sequence: m?.sequence ?? 0,
    };
  });
  lessons.sort(
    (a, b) =>
      ({ tier_1: 1, tier_2: 2, tier_3: 3 })[a.tier] -
        ({ tier_1: 1, tier_2: 2, tier_3: 3 })[b.tier] || a.sequence - b.sequence,
  );

  const caseNotes = (notesRes.data ?? []).map((n) => ({
    ...(n as unknown as CaseNote),
    staffName: pickName((n as any).staff, "Staff"),
  }));

  const wbl = (wblRes.data ?? []).map((w) => {
    const e = (Array.isArray(w.employer) ? w.employer[0] : w.employer) as
      | { name: string }
      | null;
    return {
      id: w.id,
      type: w.type,
      start_date: w.start_date,
      end_date: w.end_date,
      hours: w.hours,
      status: w.status,
      employerName: e?.name ?? "—",
    };
  });

  return {
    participant: {
      ...(praw as Participant),
      name: pickName(praw.profile, praw.participant_code),
      staffName: pickName(praw.staff, "Unassigned"),
    },
    enrollments: (enrollmentsRes.data ?? []) as Enrollment[],
    lessons,
    attendance: (attendanceRes.data ?? []) as Attendance[],
    assessments: (assessmentsRes.data ?? []) as Assessment[],
    interests: (interestsRes.data ?? []) as CareerInterest[],
    goals: (goalsRes.data ?? []) as Goal[],
    milestones: (milestonesRes.data ?? []) as Milestone[],
    caseNotes,
    transitionPlan: (planRes.data ?? null) as TransitionPlan | null,
    documents: (docsRes.data ?? []) as DocumentRow[],
    wbl,
    outcome: ((outcomeRes.data ?? [])[0] ?? null) as Outcome | null,
    employers: (employersRes.data ?? []) as { id: string; name: string }[],
  };
}

export async function getRosterForDate(date: string) {
  const sb = createClient();
  const [partsRes, attRes] = await Promise.all([
    sb
      .from("participants")
      .select(`id, participant_code, current_tier, status, profile:${PROFILE_NAME}`)
      .in("status", ["active", "enrolled", "on_hold"])
      .order("participant_code"),
    sb.from("attendance").select("participant_id, status").eq("session_date", date),
  ]);
  const attByPart = new Map(
    (attRes.data ?? []).map((a) => [a.participant_id, a.status]),
  );
  return (partsRes.data ?? []).map((p) => ({
    id: p.id,
    code: p.participant_code,
    name: pickName(
      (p as any).profile as { full_name: string | null }[] | null,
      p.participant_code,
    ),
    tier: p.current_tier as ProgramTier,
    status: (attByPart.get(p.id) ?? null) as string | null,
  }));
}

/** All employer records for staff/admin employer and WBL pages. */
export async function getEmployers(): Promise<Employer[]> {
  const sb = createClient();
  const { data } = await sb
    .from("employers")
    .select("*")
    .order("created_at", { ascending: false });
  // Explicit cast — Supabase inference can collapse to never[] on some CI builds.
  return (data ?? []) as Employer[];
}

export async function getWblList() {
  const sb = createClient();
  const { data } = await sb
    .from("work_based_learning")
    .select(
      `id, type, start_date, end_date, hours, status,
       participant:participants!work_based_learning_participant_id_fkey(participant_code, profile:${PROFILE_NAME}),
       employer:employers(name)`,
    )
    .order("start_date", { ascending: false });
  return (data ?? []).map((w) => {
    const part = Array.isArray(w.participant) ? w.participant[0] : w.participant;
    const emp = Array.isArray(w.employer) ? w.employer[0] : w.employer;
    return {
      id: w.id,
      type: w.type,
      start_date: w.start_date,
      end_date: w.end_date,
      hours: w.hours,
      status: w.status,
      participantName: pickName((part as any)?.profile ?? null, (part as any)?.participant_code ?? "—"),
      employerName: (emp as any)?.name ?? "—",
    };
  });
}

/** Lightweight participant options for select menus (WBL logging, etc). */
export async function getParticipantOptions() {
  const sb = createClient();
  const { data } = await sb
    .from("participants")
    .select(`id, participant_code, profile:${PROFILE_NAME}`)
    .order("participant_code");
  return (data ?? []).map((p) => ({
    id: p.id,
    label: `${p.participant_code} · ${pickName((p as any).profile, p.participant_code)}`,
  }));
}
