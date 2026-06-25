import { createClient } from "@/lib/supabase/server";
import type {
  Participant,
  ProgramTier,
  Assessment,
  CareerInterest,
  Goal,
  Milestone,
  DocumentRow,
} from "@/types/db";

function pickName(
  profile: { full_name: string | null } | { full_name: string | null }[] | null,
  fallback: string,
) {
  const p = Array.isArray(profile) ? profile[0] : profile;
  return p?.full_name ?? fallback;
}

export type MyOverview = {
  participant: Participant & { name: string; staffName: string };
  completion: number;
  lessons: {
    id: string;
    module_id: string;
    status: string;
    moduleName: string;
    tier: ProgramTier;
    description: string | null;
  }[];
  assessments: Assessment[];
  interests: CareerInterest[];
  goals: Goal[];
  milestones: Milestone[];
  documents: DocumentRow[];
  wbl: {
    id: string;
    type: string;
    start_date: string | null;
    end_date: string | null;
    hours: number;
    status: string | null;
  }[];
};

/** Everything the signed-in participant can see about themselves. RLS-scoped. */
export async function getMyOverview(): Promise<MyOverview | null> {
  const sb = createClient();

  const partRes = await sb
    .from("participants")
    .select(
      `*, profile:profiles!participants_profile_id_fkey(full_name), staff:profiles!participants_assigned_staff_id_fkey(full_name)`,
    )
    .maybeSingle();
  if (!partRes.data) return null;
  const praw = partRes.data as unknown as Participant & {
    profile: { full_name: string | null } | { full_name: string | null }[] | null;
    staff: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const pid = praw.id;

  const [lessonsRes, assessRes, interestsRes, goalsRes, milestonesRes, docsRes, wblRes] =
    await Promise.all([
      sb
        .from("lesson_progress")
        .select("id, module_id, status, module:curriculum_modules(name, tier, sequence, description)")
        .eq("participant_id", pid),
      sb.from("assessments").select("*").eq("participant_id", pid).order("taken_on", { ascending: false }),
      sb.from("career_interests").select("*").eq("participant_id", pid).order("rank"),
      sb.from("goals").select("*").eq("participant_id", pid).order("created_at", { ascending: false }),
      sb.from("milestones").select("*").eq("participant_id", pid).order("sequence"),
      sb.from("documents").select("*").eq("participant_id", pid).order("created_at", { ascending: false }),
      sb
        .from("work_based_learning")
        .select("id, type, start_date, end_date, hours, status")
        .eq("participant_id", pid)
        .order("start_date", { ascending: false }),
    ]);

  const order: Record<ProgramTier, number> = { tier_1: 1, tier_2: 2, tier_3: 3 };
  const lessons = (lessonsRes.data ?? []).map((l) => {
    const m = (Array.isArray(l.module) ? l.module[0] : l.module) as
      | { name: string; tier: ProgramTier; sequence: number; description: string | null }
      | null;
    return {
      id: l.id,
      module_id: l.module_id,
      status: l.status,
      moduleName: m?.name ?? "Module",
      tier: (m?.tier ?? "tier_1") as ProgramTier,
      sequence: m?.sequence ?? 0,
      description: m?.description ?? null,
    };
  });
  lessons.sort((a, b) => order[a.tier] - order[b.tier] || a.sequence - b.sequence);

  const done = lessons.filter((l) => l.status === "completed").length;
  const completion = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return {
    participant: {
      ...(praw as Participant),
      name: pickName(praw.profile, praw.participant_code),
      staffName: pickName(praw.staff, "Your case manager"),
    },
    completion,
    lessons,
    assessments: (assessRes.data ?? []) as Assessment[],
    interests: (interestsRes.data ?? []) as CareerInterest[],
    goals: (goalsRes.data ?? []) as Goal[],
    milestones: (milestonesRes.data ?? []) as Milestone[],
    documents: (docsRes.data ?? []) as DocumentRow[],
    wbl: wblRes.data ?? [],
  };
}
