/* eslint-disable no-console */
/**
 * IEP Partners — idempotent demo seed.
 *
 *   npm run seed
 *
 * Creates the three demo logins + ~24 participants and a realistic, internally
 * consistent dataset (curriculum, lesson progress, attendance, assessments,
 * goals, milestones, case notes, employers, work-based learning, outcomes).
 *
 * Re-runnable: auth users are reused by email; data tables are wiped and
 * rebuilt deterministically (seeded PRNG) so the numbers stay stable.
 *
 * Uses the SERVICE ROLE key (bypasses RLS). Server-side only — never shipped to
 * the browser. Reads env from .env.local.
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { format, subDays, addWeeks } from "date-fns";
import type {
  Database,
  ProgramTier,
  EnrollmentStatus,
  ProgressStatus,
  AttendanceStatus,
  EmploymentStatus,
  EmployerStage,
} from "../types/db";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const db = createClient<Database>(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Tables = Database["public"]["Tables"];
type Ins<K extends keyof Tables> = Tables[K]["Insert"];

// --- deterministic PRNG (mulberry32) -----------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260625);
const rnd = (min: number, max: number) => min + rand() * (max - min);
const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const fdate = (d: Date) => format(d, "yyyy-MM-dd");
const today = new Date();

const PASSWORD = "Demo1234!";

// --- helpers -----------------------------------------------------------------
const ALL = "00000000-0000-0000-0000-000000000000"; // sentinel for "delete all"

async function ensureUser(
  email: string,
  full_name: string,
  role: "participant" | "staff" | "admin",
  emailToId: Map<string, string>,
): Promise<string> {
  const existing = emailToId.get(email.toLowerCase());
  if (existing) {
    // keep password + metadata fresh
    await db.auth.admin.updateUserById(existing, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    return existing;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (error || !data.user) throw error ?? new Error(`createUser failed: ${email}`);
  emailToId.set(email.toLowerCase(), data.user.id);
  return data.user.id;
}

async function loadAllUsers(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  // listUsers is paginated (default 50/page)
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
    page += 1;
  }
  return map;
}

async function wipe(client: SupabaseClient<Database>) {
  // Children cascade from participants; also clear standalone tables.
  const tables: (keyof Tables)[] = [
    "outcomes",
    "work_based_learning",
    "documents",
    "case_notes",
    "transition_plans",
    "milestones",
    "goals",
    "career_interests",
    "assessments",
    "attendance",
    "lesson_progress",
    "enrollments",
    "participants",
    "employers",
    "curriculum_modules",
  ];
  for (const t of tables) {
    const { error } = await client.from(t).delete().neq("id", ALL);
    if (error) throw new Error(`wipe ${t}: ${error.message}`);
  }
}

// --- reference data ----------------------------------------------------------
const TIER1 = [
  "Workforce Readiness Assessment",
  "Career Exploration",
  "Resume Development",
  "Interview Preparation",
  "Professionalism Training",
  "Workplace Communication",
  "Workplace Expectations",
];
const TIER2_NEW = [
  "Workplace Simulations",
  "Team-Based Projects",
  "Employer Engagement",
  "Financial Literacy",
  "Transition Planning",
  "Hard & Soft Skill Development",
];
const TIER3_NEW = [
  "Individualized Transition Plans",
  "Community Resource Navigation",
  "Job Shadowing",
  "Work-Based Learning",
  "Paid Work Experience",
  "Employment Support",
  "Exit Planning",
];
const TIER_ORDER: Record<ProgramTier, number> = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

const REGIONS = ["Atlanta Metro", "Savannah", "Augusta", "Columbus", "Macon"];
const REFERRALS = [
  "Detention",
  "Correctional Facility",
  "Reentry Program",
  "Alternative Education",
  "Community Referral",
];
const SECTORS = [
  { interest: "Skilled Trades / Construction", code: "Realistic (R)" },
  { interest: "Logistics & Warehousing", code: "Conventional (C)" },
  { interest: "Culinary & Hospitality", code: "Enterprising (E)" },
  { interest: "Healthcare Support", code: "Social (S)" },
  { interest: "Information Technology", code: "Investigative (I)" },
  { interest: "Automotive Technology", code: "Realistic (R)" },
  { interest: "Customer Service", code: "Social (S)" },
  { interest: "Advanced Manufacturing", code: "Realistic (R)" },
];
const GOALS_POOL = [
  "Obtain reliable transportation",
  "Complete resume and cover letter",
  "Earn forklift certification",
  "Open a checking & savings account",
  "Secure stable housing",
  "Pass a mock interview with confidence",
  "Gain 90 days of paid work experience",
  "Enroll in GED completion program",
  "Rebuild family support network",
  "Build a 3-month emergency fund",
];
const MILESTONES = [
  "Resume Complete",
  "Mock Interview Passed",
  "Readiness Benchmark Met",
  "Job Shadow Completed",
  "Offer Received",
  "30-Day Retention",
];
const JOB_TITLES = [
  "Warehouse Associate",
  "Forklift Operator",
  "CNC Operator Trainee",
  "Dock Worker",
  "Line Cook",
  "Patient Care Assistant",
  "Auto Service Technician",
  "Customer Service Representative",
  "Machine Operator",
];
const BARRIERS = [
  "Transportation",
  "Housing instability",
  "Limited work history",
  "Childcare",
  "Background-related hiring barriers",
  "Documentation / ID",
];
const SUPPORT = [
  "Bus pass assistance",
  "Transitional housing referral",
  "Clothing closet voucher",
  "Mental health counseling",
  "Legal aid clinic",
  "SNAP / benefits navigation",
];
const NOTE_CATEGORIES = ["Check-in", "Attendance", "Employment", "Barrier", "Support Service"];

const EMPLOYERS: { name: string; industry: string; stage: EmployerStage; region: string }[] = [
  { name: "Lakeside Logistics", industry: "Warehousing & Distribution", stage: "hiring", region: "Atlanta Metro" },
  { name: "Peachtree Manufacturing", industry: "Manufacturing", stage: "partner", region: "Macon" },
  { name: "Savannah Port Services", industry: "Logistics", stage: "partner", region: "Savannah" },
  { name: "Magnolia Health Group", industry: "Healthcare", stage: "hiring", region: "Augusta" },
  { name: "Coastal Hospitality Group", industry: "Hospitality", stage: "contacted", region: "Savannah" },
  { name: "Summit Auto Care", industry: "Automotive Services", stage: "partner", region: "Columbus" },
  { name: "Riverside Construction Co.", industry: "Construction", stage: "prospect", region: "Atlanta Metro" },
  { name: "BrightPath Staffing", industry: "Staffing & Placement", stage: "partner", region: "Atlanta Metro" },
];

// 24 participants. Index 0 is the documented demo login.
const PARTICIPANTS: { name: string; email: string }[] = [
  { name: "Marcus Johnson", email: "participant@ieppartners.demo" },
  { name: "Tasha Brooks", email: "tasha.brooks@ieppartners.demo" },
  { name: "Andre Patterson", email: "andre.patterson@ieppartners.demo" },
  { name: "Dana Rivera", email: "dana.rivera@ieppartners.demo" },
  { name: "Jamal Carter", email: "jamal.carter@ieppartners.demo" },
  { name: "Keisha Williams", email: "keisha.williams@ieppartners.demo" },
  { name: "Devon Mitchell", email: "devon.mitchell@ieppartners.demo" },
  { name: "Brianna Coleman", email: "brianna.coleman@ieppartners.demo" },
  { name: "Terrell Hayes", email: "terrell.hayes@ieppartners.demo" },
  { name: "Monica Flores", email: "monica.flores@ieppartners.demo" },
  { name: "Darius Bryant", email: "darius.bryant@ieppartners.demo" },
  { name: "Latoya Simmons", email: "latoya.simmons@ieppartners.demo" },
  { name: "Anthony Reed", email: "anthony.reed@ieppartners.demo" },
  { name: "Shanice Powell", email: "shanice.powell@ieppartners.demo" },
  { name: "Carlos Mendez", email: "carlos.mendez@ieppartners.demo" },
  { name: "Jasmine Ford", email: "jasmine.ford@ieppartners.demo" },
  { name: "Reginald Greene", email: "reginald.greene@ieppartners.demo" },
  { name: "Aaliyah Scott", email: "aaliyah.scott@ieppartners.demo" },
  { name: "Tyrone Jackson", email: "tyrone.jackson@ieppartners.demo" },
  { name: "Destiny Bell", email: "destiny.bell@ieppartners.demo" },
  { name: "Malik Robinson", email: "malik.robinson@ieppartners.demo" },
  { name: "Crystal Nguyen", email: "crystal.nguyen@ieppartners.demo" },
  { name: "Demetrius Wright", email: "demetrius.wright@ieppartners.demo" },
  { name: "Yolanda Parker", email: "yolanda.parker@ieppartners.demo" },
];

function tierForIndex(i: number): ProgramTier {
  if (i < 10) return "tier_1";
  if (i < 18) return "tier_2";
  return "tier_3";
}

function statusForIndex(i: number, tier: ProgramTier): EnrollmentStatus {
  // Index 0 (demo) is reliably active with mid progress.
  if (i === 0) return "active";
  if (tier === "tier_3" && chance(0.45)) return "completed";
  if (chance(0.1)) return "withdrawn";
  if (chance(0.1)) return "on_hold";
  return "active";
}

// =============================================================================
async function main() {
  console.log("→ Loading existing auth users…");
  const emailToId = await loadAllUsers();

  console.log("→ Ensuring demo admin + staff…");
  const adminId = await ensureUser(
    "admin@ieppartners.demo",
    "Michelle Pettaway",
    "admin",
    emailToId,
  );
  const staffId = await ensureUser(
    "staff@ieppartners.demo",
    "Rhonda Clanton-Davis",
    "staff",
    emailToId,
  );

  console.log("→ Ensuring 24 participant auth users…");
  const participantUserIds: string[] = [];
  for (const p of PARTICIPANTS) {
    const id = await ensureUser(p.email, p.name, "participant", emailToId);
    participantUserIds.push(id);
  }

  // The handle_new_user trigger creates profiles, but upsert to be certain that
  // names + roles are correct even for pre-existing users.
  console.log("→ Upserting profiles…");
  const profileRows: Ins<"profiles">[] = [
    { id: adminId, full_name: "Michelle Pettaway", email: "admin@ieppartners.demo", role: "admin" },
    { id: staffId, full_name: "Rhonda Clanton-Davis", email: "staff@ieppartners.demo", role: "staff" },
    ...PARTICIPANTS.map((p, i) => ({
      id: participantUserIds[i],
      full_name: p.name,
      email: p.email,
      role: "participant" as const,
    })),
  ];
  {
    const { error } = await db.from("profiles").upsert(profileRows);
    if (error) throw new Error(`profiles upsert: ${error.message}`);
  }

  console.log("→ Wiping existing program data…");
  await wipe(db);

  // --- curriculum modules ----------------------------------------------------
  console.log("→ Seeding curriculum modules…");
  const moduleRows: Ins<"curriculum_modules">[] = [
    ...TIER1.map((name, idx) => ({
      tier: "tier_1" as ProgramTier,
      name,
      sequence: idx + 1,
      description: `Tier 1 foundation module: ${name}.`,
    })),
    ...TIER2_NEW.map((name, idx) => ({
      tier: "tier_2" as ProgramTier,
      name,
      sequence: idx + 1,
      description: `Tier 2 career-development module: ${name}.`,
    })),
    ...TIER3_NEW.map((name, idx) => ({
      tier: "tier_3" as ProgramTier,
      name,
      sequence: idx + 1,
      description: `Tier 3 reintegration & employment module: ${name}.`,
    })),
  ];
  const { data: modules, error: modErr } = await db
    .from("curriculum_modules")
    .insert(moduleRows)
    .select("id, tier, sequence");
  if (modErr || !modules) throw new Error(`modules: ${modErr?.message}`);
  const modulesFor = (tier: ProgramTier) =>
    modules
      .filter((m) => TIER_ORDER[m.tier as ProgramTier] <= TIER_ORDER[tier])
      .sort(
        (a, b) =>
          TIER_ORDER[a.tier as ProgramTier] - TIER_ORDER[b.tier as ProgramTier] ||
          a.sequence - b.sequence,
      );

  // --- employers -------------------------------------------------------------
  console.log("→ Seeding employers…");
  const employerRows: Ins<"employers">[] = EMPLOYERS.map((e, i) => ({
    name: e.name,
    industry: e.industry,
    stage: e.stage,
    region: e.region,
    contact_name: pick(["Pat Morgan", "Jordan Lee", "Sam Rivera", "Casey Brooks", "Taylor Kim"]),
    contact_email: `hiring${i + 1}@${e.name.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    owner_staff_id: staffId,
    notes: `${e.stage === "hiring" ? "Actively hiring" : "Engagement in progress"} — ${e.industry}.`,
  }));
  const { data: employers, error: empErr } = await db
    .from("employers")
    .insert(employerRows)
    .select("id, name");
  if (empErr || !employers) throw new Error(`employers: ${empErr?.message}`);

  // --- per-participant build -------------------------------------------------
  console.log("→ Building participant records…");
  const participantRows: Ins<"participants">[] = [];
  const meta: {
    tier: ProgramTier;
    status: EnrollmentStatus;
    region: string;
    quality: number; // attendance/engagement quality 0..1
    completionFrac: number;
    intake: Date;
  }[] = [];

  for (let i = 0; i < PARTICIPANTS.length; i++) {
    const tier = tierForIndex(i);
    const status = statusForIndex(i, tier);
    const region = REGIONS[i % REGIONS.length];
    const quality =
      status === "withdrawn" ? rnd(0.35, 0.6) : i % 7 === 3 ? rnd(0.5, 0.68) : rnd(0.72, 0.98);
    const completionFrac =
      status === "completed"
        ? 1
        : status === "withdrawn"
          ? rnd(0.2, 0.5)
          : status === "on_hold"
            ? rnd(0.3, 0.6)
            : i === 0
              ? 0.55
              : rnd(0.3, 0.9);
    const weeksAgo = tier === "tier_3" ? rndInt(14, 22) : tier === "tier_2" ? rndInt(8, 14) : rndInt(2, 9);
    const intake = subDays(today, weeksAgo * 7 + rndInt(0, 6));

    meta.push({ tier, status, region, quality, completionFrac, intake });
    participantRows.push({
      profile_id: participantUserIds[i],
      participant_code: `IEP-${String(i + 1).padStart(4, "0")}`,
      date_of_birth: fdate(subDays(today, rndInt(19, 45) * 365)),
      phone: `(404) 555-${String(rndInt(1000, 9999))}`,
      referral_source: REFERRALS[i % REFERRALS.length],
      region,
      intake_date: fdate(intake),
      assigned_staff_id: staffId,
      status,
      current_tier: tier,
      notes: i === 0 ? "Demo participant — strong engagement, on pace for Tier 2 completion." : null,
    });
  }
  const { data: participants, error: partErr } = await db
    .from("participants")
    .insert(participantRows)
    .select("id");
  if (partErr || !participants) throw new Error(`participants: ${partErr?.message}`);
  const pid = (i: number) => participants[i].id;

  // accumulate child rows
  const enrollments: Ins<"enrollments">[] = [];
  const lessons: Ins<"lesson_progress">[] = [];
  const attendance: Ins<"attendance">[] = [];
  const assessments: Ins<"assessments">[] = [];
  const interests: Ins<"career_interests">[] = [];
  const goals: Ins<"goals">[] = [];
  const milestones: Ins<"milestones">[] = [];
  const caseNotes: Ins<"case_notes">[] = [];
  const transitions: Ins<"transition_plans">[] = [];
  const documents: Ins<"documents">[] = [];
  const wbl: Ins<"work_based_learning">[] = [];
  const outcomes: Ins<"outcomes">[] = [];

  const TIER_WEEKS: Record<ProgramTier, number> = { tier_1: 9, tier_2: 14, tier_3: 22 };

  for (let i = 0; i < participants.length; i++) {
    const m = meta[i];
    const mods = modulesFor(m.tier);
    const completedCount = Math.round(m.completionFrac * mods.length);

    // lesson progress
    mods.forEach((mod, idx) => {
      let st: ProgressStatus = "not_started";
      let completed_at: string | null = null;
      if (idx < completedCount) {
        st = "completed";
        completed_at = subDays(today, rndInt(3, 70)).toISOString();
      } else if (idx === completedCount && m.status !== "completed" && m.status !== "withdrawn") {
        st = "in_progress";
      }
      lessons.push({
        participant_id: pid(i),
        module_id: mod.id,
        status: st,
        completed_at,
        staff_id: st === "completed" ? staffId : null,
      });
    });
    const completionPct = Math.round((completedCount / mods.length) * 100);

    // enrollments — historical completed lower tiers + current
    const lowerTiers = (["tier_1", "tier_2", "tier_3"] as ProgramTier[]).filter(
      (t) => TIER_ORDER[t] < TIER_ORDER[m.tier],
    );
    lowerTiers.forEach((t) => {
      const start = subDays(m.intake, TIER_WEEKS[t] * 7);
      enrollments.push({
        participant_id: pid(i),
        tier: t,
        start_date: fdate(start),
        target_end_date: fdate(m.intake),
        status: "completed",
        completion_pct: 100,
      });
    });
    enrollments.push({
      participant_id: pid(i),
      tier: m.tier,
      start_date: fdate(m.intake),
      target_end_date: fdate(addWeeks(m.intake, TIER_WEEKS[m.tier])),
      status: m.status,
      completion_pct: completionPct,
    });

    // attendance — ~8 weeks, every ~3 days
    const sessions = m.status === "withdrawn" ? 9 : 16;
    for (let s = 0; s < sessions; s++) {
      const d = subDays(today, s * 3 + 2);
      let st: AttendanceStatus = "present";
      const r = rand();
      if (r > m.quality) {
        st = r > m.quality + (1 - m.quality) * 0.6 ? "absent" : chance(0.5) ? "late" : "excused";
      }
      attendance.push({
        participant_id: pid(i),
        session_date: fdate(d),
        status: st,
        staff_id: staffId,
        notes: st === "absent" && chance(0.4) ? "No call / no show — follow up." : null,
      });
    }

    // assessments
    assessments.push({
      participant_id: pid(i),
      type: "workforce_readiness",
      score: Math.round(rnd(58, 96)),
      summary: "Baseline workforce readiness assessment completed at intake.",
      taken_on: fdate(subDays(m.intake, -2)),
      staff_id: staffId,
    });
    if (chance(0.85)) {
      const sector = pick(SECTORS);
      assessments.push({
        participant_id: pid(i),
        type: "career_interest",
        score: null,
        summary: `Career Interest Inventory — strongest alignment: ${sector.interest} (${sector.code}).`,
        taken_on: fdate(subDays(m.intake, -5)),
        staff_id: staffId,
      });
    }

    // career interests (2-3 ranked)
    const nInterest = rndInt(2, 3);
    const chosen = [...SECTORS].sort(() => rand() - 0.5).slice(0, nInterest);
    chosen.forEach((c, r) =>
      interests.push({
        participant_id: pid(i),
        interest: c.interest,
        riasec_or_sector: c.code,
        rank: r + 1,
      }),
    );

    // goals (1-3)
    const nGoals = rndInt(1, 3);
    const gpool = [...GOALS_POOL].sort(() => rand() - 0.5).slice(0, nGoals);
    gpool.forEach((g, idx) =>
      goals.push({
        participant_id: pid(i),
        title: g,
        detail: null,
        status: idx === 0 && m.completionFrac > 0.6 ? "achieved" : chance(0.5) ? "in_progress" : "open",
        target_date: fdate(addWeeks(today, rndInt(2, 12))),
        created_by: staffId,
      }),
    );

    // milestones (standard 6)
    const maxAchievable = m.tier === "tier_1" ? 3 : m.tier === "tier_2" ? 4 : 6;
    const achieved = Math.min(maxAchievable, Math.round(m.completionFrac * maxAchievable));
    MILESTONES.forEach((name, idx) =>
      milestones.push({
        participant_id: pid(i),
        name,
        sequence: idx + 1,
        status: idx < achieved ? "achieved" : "pending",
        achieved_on: idx < achieved ? fdate(subDays(today, rndInt(5, 80))) : null,
      }),
    );

    // case notes (1-3)
    const nNotes = rndInt(1, 3);
    for (let n = 0; n < nNotes; n++) {
      const cat = pick(NOTE_CATEGORIES);
      caseNotes.push({
        participant_id: pid(i),
        staff_id: staffId,
        category: cat,
        note:
          cat === "Attendance"
            ? "Discussed attendance pattern and transportation barriers; arranged bus passes."
            : cat === "Employment"
              ? "Reviewed job leads and scheduled a mock interview for next week."
              : cat === "Barrier"
                ? "Identified housing instability; referred to transitional housing partner."
                : cat === "Support Service"
                  ? "Connected participant to benefits navigation and clothing closet voucher."
                  : "Weekly check-in — participant engaged and motivated; on track this week.",
      });
    }

    // transition plans for tier_3 (and the demo participant)
    if (m.tier === "tier_3" || i === 0) {
      transitions.push({
        participant_id: pid(i),
        summary:
          "Individualized transition plan focused on stable employment, financial stability, and community reintegration.",
        barriers: [...BARRIERS].sort(() => rand() - 0.5).slice(0, rndInt(2, 3)),
        support_services: [...SUPPORT].sort(() => rand() - 0.5).slice(0, rndInt(2, 3)),
        target_career: pick(SECTORS).interest,
        updated_by: staffId,
      });
    }

    // documents (resume for ~70%, certificate for advanced/completed)
    if (chance(0.7) || i === 0) {
      documents.push({
        participant_id: pid(i),
        type: "resume",
        title: `Resume — ${PARTICIPANTS[i].name}`,
        storage_path: null,
        uploaded_by: participantUserIds[i],
      });
    }
    if (m.completionFrac > 0.7 && chance(0.6)) {
      documents.push({
        participant_id: pid(i),
        type: "certificate",
        title: pick(["Forklift Certification", "OSHA-10 Certificate", "Food Handler's Card", "Customer Service Credential"]),
        storage_path: null,
        uploaded_by: staffId,
      });
    }

    // work-based learning for tier_2 / tier_3
    if (m.tier !== "tier_1") {
      const nWbl = m.tier === "tier_3" ? rndInt(1, 2) : chance(0.6) ? 1 : 0;
      for (let w = 0; w < nWbl; w++) {
        const emp = pick(employers);
        const type =
          m.tier === "tier_3"
            ? pick(["job_shadow", "work_based_learning", "paid_work_experience"] as const)
            : pick(["job_shadow", "work_based_learning"] as const);
        const start = subDays(today, rndInt(20, 90));
        wbl.push({
          participant_id: pid(i),
          employer_id: emp.id,
          type,
          start_date: fdate(start),
          end_date: chance(0.5) ? fdate(subDays(today, rndInt(1, 18))) : null,
          hours: Math.round(rnd(8, 120)),
          status: chance(0.5) ? "completed" : "in_progress",
          notes: `${type === "paid_work_experience" ? "Paid placement" : "Experiential learning"} at ${emp.name}.`,
        });
      }
    }

    // outcomes — one per participant, funnel consistent with status/tier
    let empStatus: EmploymentStatus = "unemployed";
    let placed = false;
    if (m.status === "completed") {
      empStatus = pick(["placed", "retained_30", "retained_90", "retained_180"] as const);
      placed = true;
    } else if (m.tier === "tier_3" && chance(0.78)) {
      empStatus = pick(["placed", "retained_30", "retained_90"] as const);
      placed = true;
    } else if (m.tier === "tier_2" && chance(0.5)) {
      empStatus = chance(0.5) ? "placed" : "searching";
      placed = empStatus === "placed";
    } else {
      empStatus = chance(0.5) ? "searching" : "unemployed";
    }
    const placementDate = placed ? subDays(today, rndInt(20, 150)) : null;
    outcomes.push({
      participant_id: pid(i),
      employment_status: empStatus,
      employer_id: placed ? pick(employers).id : null,
      job_title: placed ? pick(JOB_TITLES) : null,
      hourly_wage: placed ? Math.round(rnd(14.5, 24) * 100) / 100 : null,
      placement_date: placementDate ? fdate(placementDate) : null,
      retention_check_date:
        placed && empStatus !== "placed" ? fdate(subDays(today, rndInt(1, 20))) : null,
    });
  }

  // --- bulk insert -----------------------------------------------------------
  console.log("→ Inserting program data…");
  const batches: [string, unknown[]][] = [
    ["enrollments", enrollments],
    ["lesson_progress", lessons],
    ["attendance", attendance],
    ["assessments", assessments],
    ["career_interests", interests],
    ["goals", goals],
    ["milestones", milestones],
    ["case_notes", caseNotes],
    ["transition_plans", transitions],
    ["documents", documents],
    ["work_based_learning", wbl],
    ["outcomes", outcomes],
  ];
  for (const [table, rows] of batches) {
    if (!rows.length) continue;
    // insert in chunks to stay well under payload limits
    for (let c = 0; c < rows.length; c += 500) {
      const chunk = rows.slice(c, c + 500);
      const { error } = await db.from(table as keyof Tables).insert(chunk as never);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    console.log(`   ✓ ${table}: ${rows.length}`);
  }

  // --- summary ---------------------------------------------------------------
  const placedCount = outcomes.filter((o) =>
    ["placed", "retained_30", "retained_90", "retained_180"].includes(o.employment_status as string),
  ).length;
  console.log("\n✅ Seed complete.");
  console.log(`   Participants: ${participants.length}`);
  console.log(`   Modules: ${modules.length}  Employers: ${employers.length}`);
  console.log(`   Placements: ${placedCount}  WBL: ${wbl.length}`);
  console.log("\n   Demo logins (password Demo1234!):");
  console.log("     admin@ieppartners.demo  ·  staff@ieppartners.demo  ·  participant@ieppartners.demo");
}

main().catch((e) => {
  console.error("\n✗ Seed failed:", e);
  process.exit(1);
});
