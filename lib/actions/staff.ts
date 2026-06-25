"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceStatus,
  ProgressStatus,
  GoalStatus,
  EmployerStage,
  WblType,
  EmploymentStatus,
} from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

async function staffClient() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { sb, staffId: user.id };
}

function fail(e: unknown): Result {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
}

// --- attendance --------------------------------------------------------------
export async function markAttendance(
  participantId: string,
  sessionDate: string,
  status: AttendanceStatus,
): Promise<Result> {
  try {
    const { sb, staffId } = await staffClient();
    const { error } = await sb
      .from("attendance")
      .upsert(
        { participant_id: participantId, session_date: sessionDate, status, staff_id: staffId },
        { onConflict: "participant_id,session_date" },
      );
    if (error) throw error;
    revalidatePath("/staff/attendance");
    revalidatePath(`/staff/participants/${participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- lessons -----------------------------------------------------------------
export async function markLesson(
  participantId: string,
  moduleId: string,
  status: ProgressStatus,
): Promise<Result> {
  try {
    const { sb, staffId } = await staffClient();
    const { error } = await sb.from("lesson_progress").upsert(
      {
        participant_id: participantId,
        module_id: moduleId,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        staff_id: staffId,
      },
      { onConflict: "participant_id,module_id" },
    );
    if (error) throw error;
    revalidatePath(`/staff/participants/${participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- case notes (staff-only) -------------------------------------------------
const noteSchema = z.object({
  participantId: z.string().uuid(),
  note: z.string().min(2, "Note is too short.").max(4000),
  category: z.string().max(60).optional(),
});
export async function addCaseNote(input: z.infer<typeof noteSchema>): Promise<Result> {
  try {
    const data = noteSchema.parse(input);
    const { sb, staffId } = await staffClient();
    const { error } = await sb.from("case_notes").insert({
      participant_id: data.participantId,
      note: data.note,
      category: data.category || null,
      staff_id: staffId,
    });
    if (error) throw error;
    revalidatePath(`/staff/participants/${data.participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- transition plan ---------------------------------------------------------
const planSchema = z.object({
  participantId: z.string().uuid(),
  summary: z.string().max(4000).optional(),
  barriers: z.array(z.string()),
  support_services: z.array(z.string()),
  target_career: z.string().max(200).optional(),
});
export async function saveTransitionPlan(input: z.infer<typeof planSchema>): Promise<Result> {
  try {
    const data = planSchema.parse(input);
    const { sb, staffId } = await staffClient();
    const { error } = await sb.from("transition_plans").upsert(
      {
        participant_id: data.participantId,
        summary: data.summary || null,
        barriers: data.barriers,
        support_services: data.support_services,
        target_career: data.target_career || null,
        updated_by: staffId,
      },
      { onConflict: "participant_id" },
    );
    if (error) throw error;
    revalidatePath(`/staff/participants/${data.participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- goals & milestones ------------------------------------------------------
export async function addGoal(
  participantId: string,
  title: string,
  targetDate: string | null,
): Promise<Result> {
  try {
    if (!title.trim()) throw new Error("Goal title is required.");
    const { sb, staffId } = await staffClient();
    const { error } = await sb.from("goals").insert({
      participant_id: participantId,
      title: title.trim(),
      target_date: targetDate,
      status: "open",
      created_by: staffId,
    });
    if (error) throw error;
    revalidatePath(`/staff/participants/${participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setGoalStatus(
  goalId: string,
  participantId: string,
  status: GoalStatus,
): Promise<Result> {
  try {
    const { sb } = await staffClient();
    const { error } = await sb.from("goals").update({ status }).eq("id", goalId);
    if (error) throw error;
    revalidatePath(`/staff/participants/${participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleMilestone(
  milestoneId: string,
  participantId: string,
  achieved: boolean,
): Promise<Result> {
  try {
    const { sb } = await staffClient();
    const { error } = await sb
      .from("milestones")
      .update({
        status: achieved ? "achieved" : "pending",
        achieved_on: achieved ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", milestoneId);
    if (error) throw error;
    revalidatePath(`/staff/participants/${participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- employers ---------------------------------------------------------------
const employerSchema = z.object({
  name: z.string().min(2, "Name is required."),
  industry: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  stage: z.custom<EmployerStage>(),
  region: z.string().optional(),
});
export async function addEmployer(input: z.infer<typeof employerSchema>): Promise<Result> {
  try {
    const data = employerSchema.parse(input);
    const { sb, staffId } = await staffClient();
    const { error } = await sb.from("employers").insert({
      name: data.name,
      industry: data.industry || null,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      stage: data.stage,
      region: data.region || null,
      owner_staff_id: staffId,
    });
    if (error) throw error;
    revalidatePath("/staff/employers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setEmployerStage(
  employerId: string,
  stage: EmployerStage,
): Promise<Result> {
  try {
    const { sb } = await staffClient();
    const { error } = await sb.from("employers").update({ stage }).eq("id", employerId);
    if (error) throw error;
    revalidatePath("/staff/employers");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- work-based learning -----------------------------------------------------
const wblSchema = z.object({
  participantId: z.string().uuid(),
  employerId: z.string().uuid().optional().or(z.literal("")),
  type: z.custom<WblType>(),
  start_date: z.string().optional(),
  hours: z.number().min(0).optional(),
  status: z.string().optional(),
});
export async function addWbl(input: z.infer<typeof wblSchema>): Promise<Result> {
  try {
    const data = wblSchema.parse(input);
    const { sb } = await staffClient();
    const { error } = await sb.from("work_based_learning").insert({
      participant_id: data.participantId,
      employer_id: data.employerId || null,
      type: data.type,
      start_date: data.start_date || null,
      hours: data.hours ?? 0,
      status: data.status || "in_progress",
    });
    if (error) throw error;
    revalidatePath("/staff/wbl");
    revalidatePath(`/staff/participants/${data.participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- outcomes ----------------------------------------------------------------
const outcomeSchema = z.object({
  outcomeId: z.string().uuid().optional(),
  participantId: z.string().uuid(),
  employment_status: z.custom<EmploymentStatus>(),
  employerId: z.string().uuid().optional().or(z.literal("")),
  job_title: z.string().optional(),
  hourly_wage: z.number().nullable().optional(),
  placement_date: z.string().optional(),
});
export async function saveOutcome(input: z.infer<typeof outcomeSchema>): Promise<Result> {
  try {
    const data = outcomeSchema.parse(input);
    const { sb } = await staffClient();
    const row = {
      participant_id: data.participantId,
      employment_status: data.employment_status,
      employer_id: data.employerId || null,
      job_title: data.job_title || null,
      hourly_wage: data.hourly_wage ?? null,
      placement_date: data.placement_date || null,
    };
    const { error } = data.outcomeId
      ? await sb.from("outcomes").update(row).eq("id", data.outcomeId)
      : await sb.from("outcomes").insert(row);
    if (error) throw error;
    revalidatePath(`/staff/participants/${data.participantId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
