// lib/queries/jobs.ts
// Server-side reads for the Virginia Jobs / Opportunity engine: the job board,
// workforce resources, participant matches (with fit scores), and staff/admin
// application-pipeline + "who's ready" views.

import { createClient } from "@/lib/supabase/server";
import { getMyOrgId } from "@/lib/auth";
import {
  computeFit,
  tracksFromCourses,
  type FitResult,
  type MatchParticipant,
} from "@/lib/matching";
import type {
  JobOpportunity,
  JobResource,
  JobApplication,
  ApplicationStatus,
  ProgramTier,
} from "@/types/db";

// ---------------------------------------------------------------------------
// Job board
// ---------------------------------------------------------------------------
export type JobBoardFilters = {
  region?: string;
  track?: string;
  reentryOnly?: boolean;
};

/** Open opportunities, newest first, with optional region/track/reentry filters. */
export async function getJobBoard(
  filters: JobBoardFilters = {},
): Promise<JobOpportunity[]> {
  const sb = createClient();
  let q = sb.from("job_opportunities").select("*").eq("status", "open");
  if (filters.region) q = q.eq("region", filters.region);
  if (filters.track) q = q.eq("matched_track", filters.track);
  if (filters.reentryOnly) q = q.eq("reentry_friendly", true);
  const { data } = await q.order("posted_date", { ascending: false });
  return (data ?? []) as JobOpportunity[];
}

/** Distinct regions + tracks across open jobs (for filter dropdowns). */
export async function getJobFacets(): Promise<{
  regions: string[];
  tracks: string[];
}> {
  const sb = createClient();
  const { data } = await sb
    .from("job_opportunities")
    .select("region, matched_track")
    .eq("status", "open");
  const rows = (data ?? []) as { region: string | null; matched_track: string | null }[];
  const regions = Array.from(
    new Set(rows.map((r) => r.region).filter((x): x is string => !!x)),
  ).sort();
  const tracks = Array.from(
    new Set(rows.map((r) => r.matched_track).filter((x): x is string => !!x)),
  ).sort();
  return { regions, tracks };
}

// ---------------------------------------------------------------------------
// Resources + sectors
// ---------------------------------------------------------------------------
export type JobResourcesView = {
  resources: JobResource[];
  sectors: JobResource[];
};

/** Workforce/reentry resources and labor-market sectors, split by category. */
export async function getJobResources(): Promise<JobResourcesView> {
  const sb = createClient();
  const { data } = await sb
    .from("job_resources")
    .select("*")
    .order("name");
  const rows = (data ?? []) as JobResource[];
  return {
    sectors: rows.filter((r) => r.category === "sector"),
    resources: rows.filter((r) => r.category !== "sector"),
  };
}

// ---------------------------------------------------------------------------
// Participant matching
// ---------------------------------------------------------------------------
export type MatchedJob = {
  job: JobOpportunity;
  fit: FitResult;
  application: {
    id: string;
    status: ApplicationStatus;
    applied_at: string | null;
  } | null;
};

/**
 * Resolve the slim readiness view + covered track tags for a participant:
 * loads readiness flags, achieved milestones, and the tracks/slugs of every
 * course they have started or completed (trade courses feed track matching).
 */
async function loadMatchContext(participantId: string): Promise<{
  participant: MatchParticipant;
  trackTags: Set<string>;
} | null> {
  const sb = createClient();

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
      .select("status, course:courses(slug, track, is_trade)")
      .eq("participant_id", participantId),
  ]);

  const achievedMilestones = ((milestonesRes.data ?? []) as { name: string }[]).map(
    (m) => m.name,
  );

  // Collect course slugs + tracks the participant has engaged (completed counts
  // fully; in-progress trade courses still confer partial track familiarity).
  const courseKeys: string[] = [];
  for (const row of (progressRes.data ?? []) as any[]) {
    const course = (Array.isArray(row.course) ? row.course[0] : row.course) as
      | { slug: string; track: string; is_trade: boolean }
      | null;
    if (!course) continue;
    courseKeys.push(course.slug);
    courseKeys.push(course.track);
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
 * Score every open job for one participant and return them sorted by fit
 * (highest first), each annotated with the label, missing requirements, and
 * any existing application status.
 */
export async function getMatchedJobsForParticipant(
  participantId: string,
): Promise<MatchedJob[]> {
  const sb = createClient();
  const ctx = await loadMatchContext(participantId);
  if (!ctx) return [];

  const [jobsRes, appsRes] = await Promise.all([
    sb.from("job_opportunities").select("*").eq("status", "open"),
    sb
      .from("job_applications")
      .select("id, job_id, status, applied_at")
      .eq("participant_id", participantId),
  ]);

  const jobs = (jobsRes.data ?? []) as JobOpportunity[];
  const apps = (appsRes.data ?? []) as {
    id: string;
    job_id: string;
    status: ApplicationStatus;
    applied_at: string | null;
  }[];
  const appByJob = new Map(apps.map((a) => [a.job_id, a]));

  return jobs
    .map((job) => {
      const fit = computeFit(ctx.participant, ctx.trackTags, job);
      const a = appByJob.get(job.id);
      return {
        job,
        fit,
        application: a
          ? { id: a.id, status: a.status, applied_at: a.applied_at }
          : null,
      };
    })
    .sort((x, y) => y.fit.score - x.fit.score);
}

// ---------------------------------------------------------------------------
// Staff / admin pipeline views
// ---------------------------------------------------------------------------
export type PipelineApplication = {
  id: string;
  status: ApplicationStatus;
  fit_score: number | null;
  missing_requirements: string[] | null;
  staff_notes: string | null;
  applied_at: string | null;
  participantId: string;
  participantName: string;
  participantCode: string;
  jobId: string;
  jobTitle: string;
  employer: string;
  region: string | null;
  matched_track: string | null;
};

const PROFILE_NAME = "profiles!participants_profile_id_fkey(full_name)";

function pickName(
  profile: { full_name: string | null } | { full_name: string | null }[] | null,
  fallback: string,
) {
  const p = Array.isArray(profile) ? profile[0] : profile;
  return p?.full_name ?? fallback;
}

/** A participant's own application history (for /me, joined to job details). */
export async function getApplicationsForParticipant(
  participantId: string,
): Promise<PipelineApplication[]> {
  const sb = createClient();
  const { data } = await sb
    .from("job_applications")
    .select(
      `id, status, fit_score, missing_requirements, staff_notes, applied_at, participant_id, job_id,
       job:job_opportunities(title, employer, region, matched_track)`,
    )
    .eq("participant_id", participantId)
    .order("updated_at", { ascending: false });

  return ((data ?? []) as any[]).map((r) => {
    const job = (Array.isArray(r.job) ? r.job[0] : r.job) as
      | { title: string; employer: string; region: string | null; matched_track: string | null }
      | null;
    return {
      id: r.id,
      status: r.status,
      fit_score: r.fit_score,
      missing_requirements: r.missing_requirements,
      staff_notes: r.staff_notes,
      applied_at: r.applied_at,
      participantId: r.participant_id,
      participantName: "",
      participantCode: "",
      jobId: r.job_id,
      jobTitle: job?.title ?? "Opportunity",
      employer: job?.employer ?? "—",
      region: job?.region ?? null,
      matched_track: job?.matched_track ?? null,
    };
  });
}

/**
 * Every application across an org's participants, for the staff/admin pipeline.
 * Scoped to the caller's org via my_org() at the app layer (super_admin /
 * unscoped sees all). Returns rows with participant + job details joined.
 */
export async function getOrgApplications(
  orgId?: string,
): Promise<PipelineApplication[]> {
  const sb = createClient();
  const scope = orgId ?? (await getMyOrgId());

  // Restrict to org's participants when scoped.
  let partIds: string[] | null = null;
  if (scope) {
    const partsRes = await sb
      .from("participants")
      .select("id")
      .eq("organization_id", scope);
    partIds = ((partsRes.data ?? []) as { id: string }[]).map((p) => p.id);
    if (partIds.length === 0) return [];
  }

  let q = sb
    .from("job_applications")
    .select(
      `id, status, fit_score, missing_requirements, staff_notes, applied_at, participant_id, job_id,
       participant:participants!job_applications_participant_id_fkey(participant_code, profile:${PROFILE_NAME}),
       job:job_opportunities(title, employer, region, matched_track)`,
    )
    .order("updated_at", { ascending: false });
  if (partIds) q = q.in("participant_id", partIds);

  const { data } = await q;
  return ((data ?? []) as any[]).map((r) => {
    const part = Array.isArray(r.participant) ? r.participant[0] : r.participant;
    const job = (Array.isArray(r.job) ? r.job[0] : r.job) as
      | { title: string; employer: string; region: string | null; matched_track: string | null }
      | null;
    return {
      id: r.id,
      status: r.status as ApplicationStatus,
      fit_score: r.fit_score,
      missing_requirements: r.missing_requirements,
      staff_notes: r.staff_notes,
      applied_at: r.applied_at,
      participantId: r.participant_id,
      participantName: pickName((part as any)?.profile ?? null, (part as any)?.participant_code ?? "—"),
      participantCode: (part as any)?.participant_code ?? "—",
      jobId: r.job_id,
      jobTitle: job?.title ?? "Opportunity",
      employer: job?.employer ?? "—",
      region: job?.region ?? null,
      matched_track: job?.matched_track ?? null,
    };
  });
}

export type ReadyParticipant = {
  participantId: string;
  name: string;
  code: string;
  tier: ProgramTier;
  region: string | null;
  fit: FitResult;
  applicationStatus: ApplicationStatus | null;
};

/**
 * For a given job, which participants in the caseload are ready/almost-ready?
 * Scored on the fly and filtered to fit >= 60, sorted best-first. Org-scoped.
 */
export async function getReadyParticipantsForJob(
  jobId: string,
  orgId?: string,
): Promise<{ job: JobOpportunity | null; participants: ReadyParticipant[] }> {
  const sb = createClient();
  const scope = orgId ?? (await getMyOrgId());

  const jobRes = await sb
    .from("job_opportunities")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  const job = (jobRes.data ?? null) as JobOpportunity | null;
  if (!job) return { job: null, participants: [] };

  let partsQuery = sb
    .from("participants")
    .select(
      `id, participant_code, current_tier, region, profile:${PROFILE_NAME}`,
    )
    .in("status", ["active", "enrolled", "on_hold"]);
  if (scope) partsQuery = partsQuery.eq("organization_id", scope);
  const partsRes = await partsQuery;
  const parts = (partsRes.data ?? []) as any[];
  if (parts.length === 0) return { job, participants: [] };

  const partIds = parts.map((p) => p.id as string);

  // Bulk-load milestones + course progress for all candidates.
  const [milestonesRes, progressRes, appsRes] = await Promise.all([
    sb
      .from("milestones")
      .select("participant_id, name, status")
      .in("participant_id", partIds)
      .eq("status", "achieved"),
    sb
      .from("course_progress")
      .select("participant_id, course:courses(slug, track, is_trade)")
      .in("participant_id", partIds),
    sb
      .from("job_applications")
      .select("participant_id, status")
      .eq("job_id", jobId)
      .in("participant_id", partIds),
  ]);

  const milestonesByPart = new Map<string, string[]>();
  for (const m of (milestonesRes.data ?? []) as { participant_id: string; name: string }[]) {
    const arr = milestonesByPart.get(m.participant_id) ?? [];
    arr.push(m.name);
    milestonesByPart.set(m.participant_id, arr);
  }
  const courseKeysByPart = new Map<string, string[]>();
  for (const row of (progressRes.data ?? []) as any[]) {
    const course = (Array.isArray(row.course) ? row.course[0] : row.course) as
      | { slug: string; track: string }
      | null;
    if (!course) continue;
    const arr = courseKeysByPart.get(row.participant_id) ?? [];
    arr.push(course.slug, course.track);
    courseKeysByPart.set(row.participant_id, arr);
  }
  const appByPart = new Map(
    ((appsRes.data ?? []) as { participant_id: string; status: ApplicationStatus }[]).map(
      (a) => [a.participant_id, a.status],
    ),
  );

  const results: ReadyParticipant[] = parts.map((p) => {
    const mp: MatchParticipant = {
      current_tier: p.current_tier,
      has_drivers_license: false,
      has_cdl: false,
      cdl_class: null,
      transportation_ok: false,
      bonding_eligible: false,
      achievedMilestones: milestonesByPart.get(p.id) ?? [],
    };
    // We didn't select readiness flags above to keep the candidate query light;
    // re-fetch them in bulk would be ideal, but flags strongly affect CDL/license
    // jobs. Pull them in below.
    return {
      participantId: p.id,
      name: pickName(p.profile, p.participant_code),
      code: p.participant_code,
      tier: p.current_tier as ProgramTier,
      region: p.region ?? null,
      fit: computeFit(mp, new Set(courseKeysByPart.get(p.id) ?? []), job),
      applicationStatus: appByPart.get(p.id) ?? null,
    };
  });

  // Bring in readiness flags in one query and recompute (cheap; same set).
  const flagsRes = await sb
    .from("participants")
    .select("id, has_drivers_license, has_cdl, cdl_class, transportation_ok, bonding_eligible")
    .in("id", partIds);
  const flagsById = new Map(
    ((flagsRes.data ?? []) as any[]).map((f) => [f.id, f]),
  );
  for (const r of results) {
    const f = flagsById.get(r.participantId);
    if (!f) continue;
    const mp: MatchParticipant = {
      current_tier: r.tier,
      has_drivers_license: f.has_drivers_license,
      has_cdl: f.has_cdl,
      cdl_class: f.cdl_class,
      transportation_ok: f.transportation_ok,
      bonding_eligible: f.bonding_eligible,
      achievedMilestones: milestonesByPart.get(r.participantId) ?? [],
    };
    r.fit = computeFit(mp, new Set(courseKeysByPart.get(r.participantId) ?? []), job);
  }

  return {
    job,
    participants: results
      .filter((r) => r.fit.score >= 60)
      .sort((a, b) => b.fit.score - a.fit.score),
  };
}

/** Compact top-N matches for the staff participant detail page. */
export async function getTopMatchesForParticipant(
  participantId: string,
  limit = 3,
): Promise<MatchedJob[]> {
  const all = await getMatchedJobsForParticipant(participantId);
  return all.slice(0, limit);
}

/** Lightweight job list for the "ready participants" selector. */
export async function getOpenJobOptions(): Promise<
  { id: string; label: string; matched_track: string | null }[]
> {
  const sb = createClient();
  const { data } = await sb
    .from("job_opportunities")
    .select("id, title, employer, matched_track")
    .eq("status", "open")
    .order("title");
  return ((data ?? []) as any[]).map((j) => ({
    id: j.id,
    label: `${j.title} · ${j.employer}`,
    matched_track: j.matched_track ?? null,
  }));
}
