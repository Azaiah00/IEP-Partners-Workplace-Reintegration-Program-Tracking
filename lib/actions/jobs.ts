"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  computeFit,
  tracksFromCourses,
  type MatchParticipant,
} from "@/lib/matching";
import type {
  Database,
  ApplicationStatus,
  JobOpportunity,
  ProgramTier,
} from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

type ApplicationInsert = Database["public"]["Tables"]["job_applications"]["Insert"];

/** Resolve the signed-in user's participant row (RLS-scoped). */
async function myParticipantId() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await sb
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const row = data as { id: string } | null;
  if (!row) throw new Error("No participant record for this account");
  return { participantId: row.id, userId: user.id, sb };
}

function fail(e: unknown): Result {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
}

/** Build the slim match context (readiness + tracks) for one participant. */
async function matchContextFor(
  sb: ReturnType<typeof createClient>,
  participantId: string,
): Promise<{ participant: MatchParticipant; trackTags: Set<string> } | null> {
  const partRes = await sb
    .from("participants")
    .select(
      "current_tier, has_drivers_license, has_cdl, cdl_class, transportation_ok, bonding_eligible",
    )
    .eq("id", participantId)
    .maybeSingle();
  if (!partRes.data) return null;
  const pr = partRes.data as {
    current_tier: ProgramTier;
    has_drivers_license: boolean;
    has_cdl: boolean;
    cdl_class: string | null;
    transportation_ok: boolean;
    bonding_eligible: boolean;
  };

  const [milestonesRes, progressRes] = await Promise.all([
    sb
      .from("milestones")
      .select("name, status")
      .eq("participant_id", participantId)
      .eq("status", "achieved"),
    sb
      .from("course_progress")
      .select("course:courses(slug, track)")
      .eq("participant_id", participantId),
  ]);

  const achievedMilestones = ((milestonesRes.data ?? []) as { name: string }[]).map(
    (m) => m.name,
  );
  const courseKeys: string[] = [];
  for (const row of (progressRes.data ?? []) as any[]) {
    const course = (Array.isArray(row.course) ? row.course[0] : row.course) as
      | { slug: string; track: string }
      | null;
    if (course) courseKeys.push(course.slug, course.track);
  }

  return {
    participant: {
      current_tier: pr.current_tier,
      has_drivers_license: pr.has_drivers_license,
      has_cdl: pr.has_cdl,
      cdl_class: pr.cdl_class,
      transportation_ok: pr.transportation_ok,
      bonding_eligible: pr.bonding_eligible,
      achievedMilestones,
    },
    trackTags: tracksFromCourses(courseKeys),
  };
}

/**
 * Participant action: express interest in a job. Upserts a job_application for
 * the signed-in participant with a freshly computed fit_score + missing reqs.
 */
export async function trackJob(jobId: string): Promise<Result> {
  try {
    const { participantId, sb } = await myParticipantId();

    const jobRes = await sb
      .from("job_opportunities")
      .select("matched_track, requirements, reentry_friendly")
      .eq("id", jobId)
      .maybeSingle();
    const job = jobRes.data as Pick<
      JobOpportunity,
      "matched_track" | "requirements" | "reentry_friendly"
    > | null;
    if (!job) throw new Error("Job not found");

    const ctx = await matchContextFor(sb, participantId);
    const fit = ctx
      ? computeFit(ctx.participant, ctx.trackTags, job)
      : { score: null as number | null, missing: [] as string[] };

    const payload: ApplicationInsert = {
      participant_id: participantId,
      job_id: jobId,
      status: "interested",
      fit_score: fit.score ?? null,
      missing_requirements: fit.missing as unknown as ApplicationInsert["missing_requirements"],
    };
    const { error } = await sb
      .from("job_applications")
      .upsert(payload, { onConflict: "participant_id,job_id" });
    if (error) throw error;

    revalidatePath("/me/jobs");
    revalidatePath("/me");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Participant action: stop tracking a job (remove the application). */
export async function untrackJob(jobId: string): Promise<Result> {
  try {
    const { participantId, sb } = await myParticipantId();
    const { error } = await sb
      .from("job_applications")
      .delete()
      .eq("participant_id", participantId)
      .eq("job_id", jobId);
    if (error) throw error;
    revalidatePath("/me/jobs");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const PIPELINE: ApplicationStatus[] = [
  "matched",
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "offer",
  "hired",
  "not_pursued",
];

/**
 * Staff/admin action: advance an application through the pipeline and optionally
 * record notes. Sets applied_at when the status becomes 'applied'.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  staffNotes?: string,
): Promise<Result> {
  try {
    if (!PIPELINE.includes(status)) throw new Error("Invalid status");
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const update: Database["public"]["Tables"]["job_applications"]["Update"] = {
      status,
      staff_id: user.id,
    };
    if (staffNotes !== undefined) update.staff_notes = staffNotes || null;
    if (status === "applied") update.applied_at = new Date().toISOString();

    const { error } = await sb
      .from("job_applications")
      .update(update)
      .eq("id", applicationId);
    if (error) throw error;

    revalidatePath("/staff/jobs");
    revalidatePath("/admin/jobs");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Staff/admin action: create+advance an application directly (used from the
 * "ready participants" matches view, e.g. start preparing a strong match).
 */
export async function matchParticipantToJob(
  participantId: string,
  jobId: string,
  status: ApplicationStatus = "matched",
): Promise<Result> {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const jobRes = await sb
      .from("job_opportunities")
      .select("matched_track, requirements, reentry_friendly")
      .eq("id", jobId)
      .maybeSingle();
    const job = jobRes.data as Pick<
      JobOpportunity,
      "matched_track" | "requirements" | "reentry_friendly"
    > | null;
    if (!job) throw new Error("Job not found");

    const ctx = await matchContextFor(sb, participantId);
    const fit = ctx
      ? computeFit(ctx.participant, ctx.trackTags, job)
      : { score: null as number | null, missing: [] as string[] };

    const payload: ApplicationInsert = {
      participant_id: participantId,
      job_id: jobId,
      status,
      fit_score: fit.score ?? null,
      missing_requirements: fit.missing as unknown as ApplicationInsert["missing_requirements"],
      staff_id: user.id,
    };
    const { error } = await sb
      .from("job_applications")
      .upsert(payload, { onConflict: "participant_id,job_id" });
    if (error) throw error;

    revalidatePath("/staff/jobs");
    revalidatePath("/admin/jobs");
    revalidatePath(`/staff/participants/${participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export type ReadinessFields = {
  has_drivers_license?: boolean;
  has_cdl?: boolean;
  cdl_class?: string | null;
  transportation_ok?: boolean;
  bonding_eligible?: boolean;
};

/**
 * Update a participant's readiness flags. Staff/admin may update any participant
 * (RLS enforces org scope); a participant may update their own record. When
 * participantId is omitted, targets the signed-in participant.
 */
export async function setReadiness(
  fields: ReadinessFields,
  participantId?: string,
): Promise<Result> {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let targetId = participantId;
    if (!targetId) {
      const { data } = await sb
        .from("participants")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      targetId = (data as { id: string } | null)?.id;
    }
    if (!targetId) throw new Error("No participant to update");

    const update: Database["public"]["Tables"]["participants"]["Update"] = {};
    if (fields.has_drivers_license !== undefined)
      update.has_drivers_license = fields.has_drivers_license;
    if (fields.has_cdl !== undefined) update.has_cdl = fields.has_cdl;
    if (fields.cdl_class !== undefined) update.cdl_class = fields.cdl_class;
    if (fields.transportation_ok !== undefined)
      update.transportation_ok = fields.transportation_ok;
    if (fields.bonding_eligible !== undefined)
      update.bonding_eligible = fields.bonding_eligible;

    const { error } = await sb
      .from("participants")
      .update(update)
      .eq("id", targetId);
    if (error) throw error;

    revalidatePath("/me/jobs");
    revalidatePath(`/staff/participants/${targetId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
