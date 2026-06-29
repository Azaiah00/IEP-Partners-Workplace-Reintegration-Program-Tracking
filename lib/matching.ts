// lib/matching.ts
// Virginia Jobs / Opportunity engine — readiness/fit scoring.
//
// computeFit() compares one participant's profile (readiness flags, completed
// trade-course tracks, tier, achieved milestones) against a job opportunity and
// returns a 0–100 fit score, a label, and the requirements they have not yet met.
//
// Weighting (per supabase/content/va_jobs.json matching_design):
//   ~50%  track match  — completed/in-progress trade course mapped to the job's
//                        matched_track (CDL jobs additionally need has_cdl).
//   ~35%  requirement coverage — heuristic check of each job requirement string
//                        against the participant's readiness signals.
//   ~15%  tier alignment — higher program tier = more job-ready.
//   +5    reentry-friendly bonus.
//
//   >=75 → "ready"    ("Ready to apply")
//   60-74 → "almost"  ("Almost ready" — surface missing requirements)
//   <60  → "building" ("Keep building")

import type { ProgramTier } from "@/types/db";

export type FitLabel = "ready" | "almost" | "building";

export type FitResult = {
  score: number; // 0..100
  label: FitLabel;
  missing: string[];
};

/** The participant signals computeFit() needs (a slim, serializable view). */
export type MatchParticipant = {
  current_tier: ProgramTier;
  has_drivers_license: boolean;
  has_cdl: boolean;
  cdl_class: string | null;
  transportation_ok: boolean;
  bonding_eligible: boolean;
  /** Names of milestones the participant has achieved (e.g. "Resume Complete"). */
  achievedMilestones: string[];
};

/** The job fields computeFit() needs. */
export type MatchJob = {
  matched_track: string | null;
  requirements: string[] | null;
  reentry_friendly: boolean;
};

/**
 * Maps a course (slug or track) to the job `matched_track` tags it unlocks.
 * Trade courses confer the strongest signal; foundational workforce courses
 * count toward the "soft" tracks where general readiness is what matters.
 */
const COURSE_SLUG_TO_TRACKS: Record<string, string[]> = {
  "electrical-trade-fundamentals": ["trades-electrical"],
  "plumbing-trade-fundamentals": ["trades-plumbing"],
  "carpentry-trade-fundamentals": ["trades-carpentry"],
  "warehouse-and-logistics": ["warehouse"],
  "construction-fundamentals-and-safety": ["construction"],
};

const COURSE_TRACK_TO_JOB_TRACKS: Record<string, string[]> = {
  // workforce_readiness / digital courses build transferable, customer-facing
  // and general-labor readiness.
  workforce_readiness: ["customer-service", "food-service", "general"],
  digital: ["customer-service"],
};

/**
 * Given a participant's completed/in-progress course identifiers, expand them
 * into the set of job `matched_track` tags they cover.
 * Accepts either course slugs or course track names (both are checked).
 */
export function tracksFromCourses(courseSlugsOrTracks: string[]): Set<string> {
  const tags = new Set<string>();
  for (const key of courseSlugsOrTracks) {
    for (const t of COURSE_SLUG_TO_TRACKS[key] ?? []) tags.add(t);
    for (const t of COURSE_TRACK_TO_JOB_TRACKS[key] ?? []) tags.add(t);
  }
  return tags;
}

const TIER_SCORE: Record<ProgramTier, number> = {
  tier_1: 0.45,
  tier_2: 0.75,
  tier_3: 1,
};

/** Heuristic: is this single requirement string satisfied by the participant? */
function requirementMet(req: string, p: MatchParticipant): boolean | null {
  const r = req.toLowerCase();

  // CDL requirements
  if (r.includes("cdl")) {
    if (r.includes("class a")) return p.has_cdl && p.cdl_class === "A";
    if (r.includes("class b")) return p.has_cdl && (p.cdl_class === "A" || p.cdl_class === "B");
    return p.has_cdl;
  }
  // Driver's license
  if (r.includes("driver's license") || r.includes("drivers license") || r.includes("valid license")) {
    return p.has_drivers_license;
  }
  // Transportation / reliable transportation
  if (r.includes("transportation")) return p.transportation_ok;
  // Resume — counts as a readiness milestone
  if (r.includes("resume")) return p.achievedMilestones.some((m) => /resume/i.test(m));
  // Interview readiness
  if (r.includes("interview")) return p.achievedMilestones.some((m) => /interview/i.test(m));

  // Soft/learnable requirements ("willing to", "able to", "no experience",
  // "training provided", attitude, etc.) — we treat these as not gating; they
  // don't penalize the score and don't appear as missing.
  if (
    r.includes("willing") ||
    r.includes("no experience") ||
    r.includes("no license required") ||
    r.includes("able to") ||
    r.includes("attitude") ||
    r.includes("team player") ||
    r.includes("punctual") ||
    r.includes("reliable attendance") ||
    r.includes("good attitude") ||
    r.includes("flexible") ||
    r.includes("a plus") ||
    r.includes("preferred") ||
    r.includes("or willing to") ||
    r.includes("basic math")
  ) {
    return null; // neutral — neither met-as-credit nor missing
  }

  // Anything else (experience, certifications, physical ability, drug screen,
  // background) — neutral by default so we don't over-penalize on prose.
  return null;
}

/**
 * Compute a 0–100 fit score for a participant against a job.
 *
 * @param participant slim readiness view (tier, flags, achieved milestones).
 * @param completedTrackTags job `matched_track` tags the participant covers via
 *        completed/in-progress trade courses (use tracksFromCourses()).
 * @param job the opportunity (matched_track, requirements, reentry_friendly).
 */
export function computeFit(
  participant: MatchParticipant,
  completedTrackTags: Set<string>,
  job: MatchJob,
): FitResult {
  // --- 1) Track match (~50%) -------------------------------------------------
  let trackScore = 0;
  const jobTrack = job.matched_track ?? "";
  if (jobTrack) {
    if (jobTrack === "cdl") {
      // CDL is gated on actually holding a CDL — a course can't substitute.
      trackScore = participant.has_cdl ? 1 : 0.1;
    } else if (completedTrackTags.has(jobTrack)) {
      trackScore = 1;
    } else if (jobTrack === "general") {
      // General roles are broadly accessible — modest baseline credit.
      trackScore = 0.55;
    } else {
      trackScore = 0.15; // no matching course yet
    }
  } else {
    trackScore = 0.5; // untagged job — neutral
  }

  // --- 2) Requirement coverage (~35%) ---------------------------------------
  const reqs = job.requirements ?? [];
  const missing: string[] = [];
  let evaluated = 0;
  let met = 0;
  for (const req of reqs) {
    const result = requirementMet(req, participant);
    if (result === null) continue; // neutral — not counted
    evaluated += 1;
    if (result) met += 1;
    else missing.push(req);
  }
  // If nothing concrete to evaluate, give full coverage credit (no blockers).
  const reqScore = evaluated === 0 ? 1 : met / evaluated;

  // --- 3) Tier alignment (~15%) ---------------------------------------------
  const tierScore = TIER_SCORE[participant.current_tier];

  // --- Combine ---------------------------------------------------------------
  let score =
    trackScore * 50 + reqScore * 35 + tierScore * 15;

  // Reentry-friendly bonus (nudges fair-chance roles up).
  if (job.reentry_friendly) score += 5;

  score = Math.round(Math.min(100, Math.max(0, score)));

  const label: FitLabel = score >= 75 ? "ready" : score >= 60 ? "almost" : "building";

  return { score, label, missing };
}

export const FIT_LABEL_TEXT: Record<FitLabel, string> = {
  ready: "Ready to apply",
  almost: "Almost ready",
  building: "Keep building",
};

/** Hex color for fit rings/badges, matching the dark Runey accent palette. */
export const FIT_LABEL_COLOR: Record<FitLabel, string> = {
  ready: "#5FE08A", // accent green
  almost: "#F5B14C", // amber
  building: "#5B9DFF", // blue
};
