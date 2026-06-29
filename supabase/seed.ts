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
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// --- multi-tenant org UUIDs (fixed; seeded by 0006_multi_tenant.sql) ---------
const ORG = {
  iep: "11111111-1111-1111-1111-111111111111",
  newportNews: "22222222-2222-2222-2222-222222222222",
  greensville: "33333333-3333-3333-3333-333333333333",
  riverside: "44444444-4444-4444-4444-444444444444",
} as const;

// The 3 facility orgs participants are distributed across (~8 each).
const FACILITY_ORGS = [ORG.newportNews, ORG.greensville, ORG.riverside] as const;

type SeedRole = "participant" | "staff" | "admin" | "super_admin";

// --- helpers -----------------------------------------------------------------
const ALL = "00000000-0000-0000-0000-000000000000"; // sentinel for "delete all"

async function ensureUser(
  email: string,
  full_name: string,
  role: SeedRole,
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

// --- courses / LMS content + learning data -----------------------------------
type ContentLesson = {
  slug: string;
  title: string;
  kind: "reading" | "simulation" | "video" | "quiz";
  sequence: number;
  content: string;
  sim_type?: string;
  sim_inspiration?: string;
};
type ContentQuiz = {
  title: string;
  pass_score: number;
  questions: {
    prompt: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }[];
};
type ContentCourse = {
  slug: string;
  track: string;
  title: string;
  description: string;
  tier: ProgramTier | null;
  is_trade: boolean;
  icon: string;
  est_hours: number;
  sequence: number;
  lessons: ContentLesson[];
  quiz?: ContentQuiz;
};

type SeededCourse = {
  id: string;
  slug: string;
  track: string;
  is_trade: boolean;
  tier: ProgramTier | null;
  lessonIds: string[]; // ordered by sequence
  quizId: string | null;
};

/**
 * Idempotently upsert the course catalog from supabase/content/courses.json.
 * Courses are matched by slug; lessons + quiz + questions are deleted and
 * reinserted per course so re-runs stay deterministic.
 */
async function seedCourseCatalog(): Promise<SeededCourse[]> {
  // Resolve relative to this file when possible, else fall back to cwd (the
  // `npm run seed` script runs from the repo root via tsx).
  const here =
    typeof __dirname !== "undefined" ? __dirname : join(process.cwd(), "supabase");
  const file = join(here, "content", "courses.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { courses: ContentCourse[] };
  const out: SeededCourse[] = [];

  for (const c of parsed.courses) {
    // Upsert course by slug.
    const { data: courseRow, error: cErr } = await db
      .from("courses")
      .upsert(
        {
          slug: c.slug,
          track: c.track,
          title: c.title,
          description: c.description,
          tier: c.tier,
          is_trade: c.is_trade,
          icon: c.icon,
          est_hours: c.est_hours,
          sequence: c.sequence,
          is_active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (cErr || !courseRow) throw new Error(`course ${c.slug}: ${cErr?.message}`);
    const courseId = (courseRow as { id: string }).id;

    // Replace lessons.
    await db.from("lessons").delete().eq("course_id", courseId);
    const lessonRows = c.lessons.map((l) => ({
      course_id: courseId,
      slug: l.slug,
      title: l.title,
      kind: l.kind,
      sequence: l.sequence,
      content: l.content,
      sim_type: l.sim_type ?? null,
      sim_inspiration: l.sim_inspiration ?? null,
    }));
    const { data: lessons, error: lErr } = await db
      .from("lessons")
      .insert(lessonRows as never)
      .select("id, sequence");
    if (lErr || !lessons) throw new Error(`lessons ${c.slug}: ${lErr?.message}`);
    const lessonIds = (lessons as { id: string; sequence: number }[])
      .sort((a, b) => a.sequence - b.sequence)
      .map((l) => l.id);

    // Replace quiz + questions (delete cascades questions).
    let quizId: string | null = null;
    if (c.quiz) {
      await db.from("quizzes").delete().eq("course_id", courseId);
      const { data: quizRow, error: qErr } = await db
        .from("quizzes")
        .insert({
          course_id: courseId,
          title: c.quiz.title,
          pass_score: c.quiz.pass_score,
        } as never)
        .select("id")
        .single();
      if (qErr || !quizRow) throw new Error(`quiz ${c.slug}: ${qErr?.message}`);
      quizId = (quizRow as { id: string }).id;

      const questionRows = c.quiz.questions.map((q, idx) => ({
        quiz_id: quizId,
        sequence: idx + 1,
        prompt: q.prompt,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
      }));
      const { error: qqErr } = await db
        .from("quiz_questions")
        .insert(questionRows as never);
      if (qqErr) throw new Error(`quiz_questions ${c.slug}: ${qqErr.message}`);
    }

    out.push({
      id: courseId,
      slug: c.slug,
      track: c.track,
      is_trade: c.is_trade,
      tier: c.tier,
      lessonIds,
      quizId,
    });
  }
  return out;
}

// =============================================================================
/** Fail fast if newer migrations (courses/LMS) were not applied yet. */
async function requireMigrations() {
  const checks: { table: keyof Tables; migration: string }[] = [
    { table: "courses", migration: "0007_courses.sql" },
    { table: "job_opportunities", migration: "0008_jobs_engine.sql" },
  ];
  for (const { table, migration } of checks) {
    const { error } = await db.from(table).select("id").limit(1);
    if (error?.code === "PGRST205") {
      console.error(
        `\n✗ Missing table public.${table} — run supabase/migrations/${migration} in the Supabase SQL Editor, then re-run npm run seed.\n`,
      );
      process.exit(1);
    }
  }
}

async function main() {
  await requireMigrations();

  console.log("→ Loading existing auth users…");
  const emailToId = await loadAllUsers();

  console.log("→ Ensuring IEP master (super_admin) accounts…");
  const rhondaId = await ensureUser(
    "rhonda@ieppartners.demo",
    "Dr. Rhonda Clanton-Davis",
    "super_admin",
    emailToId,
  );
  const michelleId = await ensureUser(
    "michelle@ieppartners.demo",
    "Michelle Pettaway",
    "super_admin",
    emailToId,
  );

  console.log("→ Ensuring org admins…");
  const adminNnId = await ensureUser(
    "admin.newportnews@ieppartners.demo",
    "NN Admin (Tracy Hayes)",
    "admin",
    emailToId,
  );
  const adminGvId = await ensureUser(
    "admin.greensville@ieppartners.demo",
    "Greensville Admin",
    "admin",
    emailToId,
  );
  const adminRvId = await ensureUser(
    "admin.riverside@ieppartners.demo",
    "Riverside Admin",
    "admin",
    emailToId,
  );

  console.log("→ Ensuring org staff (case managers)…");
  const staffNnId = await ensureUser(
    "staff.newportnews@ieppartners.demo",
    "NN Case Manager",
    "staff",
    emailToId,
  );
  const staffGvId = await ensureUser(
    "staff.greensville@ieppartners.demo",
    "Greensville Case Manager",
    "staff",
    emailToId,
  );
  const staffRvId = await ensureUser(
    "staff.riverside@ieppartners.demo",
    "Riverside Case Manager",
    "staff",
    emailToId,
  );

  console.log("→ Ensuring legacy demo admin + staff…");
  // Keep the original documented demo logins working (Newport News org).
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

  // Per-org staff lookups, keyed by org UUID. The legacy staff account also
  // belongs to Newport News, but each org's participants are assigned to that
  // org's dedicated case manager.
  const STAFF_FOR_ORG: Record<string, string> = {
    [ORG.newportNews]: staffNnId,
    [ORG.greensville]: staffGvId,
    [ORG.riverside]: staffRvId,
  };

  console.log("→ Ensuring 24 participant auth users…");
  const participantUserIds: string[] = [];
  for (const p of PARTICIPANTS) {
    const id = await ensureUser(p.email, p.name, "participant", emailToId);
    participantUserIds.push(id);
  }

  // The handle_new_user trigger creates profiles, but upsert to be certain that
  // names + roles are correct even for pre-existing users.
  console.log("→ Upserting profiles (with organization assignments)…");
  // Compute each participant's facility org up-front so profile + participant
  // rows stay in sync (~8 per facility, round-robin).
  const orgForParticipant = (i: number): string => FACILITY_ORGS[i % FACILITY_ORGS.length];

  const profileRows: Ins<"profiles">[] = [
    // IEP master (super_admin) — IEP org
    { id: rhondaId, full_name: "Dr. Rhonda Clanton-Davis", email: "rhonda@ieppartners.demo", role: "super_admin", organization_id: ORG.iep },
    { id: michelleId, full_name: "Michelle Pettaway", email: "michelle@ieppartners.demo", role: "super_admin", organization_id: ORG.iep },
    // Org admins
    { id: adminNnId, full_name: "NN Admin (Tracy Hayes)", email: "admin.newportnews@ieppartners.demo", role: "admin", organization_id: ORG.newportNews },
    { id: adminGvId, full_name: "Greensville Admin", email: "admin.greensville@ieppartners.demo", role: "admin", organization_id: ORG.greensville },
    { id: adminRvId, full_name: "Riverside Admin", email: "admin.riverside@ieppartners.demo", role: "admin", organization_id: ORG.riverside },
    // Org staff (case managers)
    { id: staffNnId, full_name: "NN Case Manager", email: "staff.newportnews@ieppartners.demo", role: "staff", organization_id: ORG.newportNews },
    { id: staffGvId, full_name: "Greensville Case Manager", email: "staff.greensville@ieppartners.demo", role: "staff", organization_id: ORG.greensville },
    { id: staffRvId, full_name: "Riverside Case Manager", email: "staff.riverside@ieppartners.demo", role: "staff", organization_id: ORG.riverside },
    // Legacy demo logins — Newport News org
    { id: adminId, full_name: "Michelle Pettaway", email: "admin@ieppartners.demo", role: "admin", organization_id: ORG.newportNews },
    { id: staffId, full_name: "Rhonda Clanton-Davis", email: "staff@ieppartners.demo", role: "staff", organization_id: ORG.newportNews },
    // Participants — profile org mirrors participant org (index 0 = Newport News)
    ...PARTICIPANTS.map((p, i) => ({
      id: participantUserIds[i],
      full_name: p.name,
      email: p.email,
      role: "participant" as const,
      organization_id: orgForParticipant(i),
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

    // --- multi-tenant: org + that org's case manager -------------------------
    const orgId = orgForParticipant(i);
    const orgStaffId = STAFF_FOR_ORG[orgId];

    // --- consent flags (realistic, demoable mix) -----------------------------
    // Most have signed the core program consent; optional consents vary.
    const programConsented = i === 0 ? true : chance(0.88);
    const consentSignedAt = programConsented
      ? subDays(intake, -rndInt(0, 3)).toISOString()
      : null;
    // Retain de-identified data for 7 years past intake when consented.
    const retentionUntil = programConsented
      ? fdate(addWeeks(intake, 52 * 7))
      : null;

    participantRows.push({
      profile_id: participantUserIds[i],
      participant_code: `IEP-${String(i + 1).padStart(4, "0")}`,
      date_of_birth: fdate(subDays(today, rndInt(19, 45) * 365)),
      phone: `(404) 555-${String(rndInt(1000, 9999))}`,
      referral_source: REFERRALS[i % REFERRALS.length],
      region,
      intake_date: fdate(intake),
      assigned_staff_id: orgStaffId,
      status,
      current_tier: tier,
      notes: i === 0 ? "Demo participant — strong engagement, on pace for Tier 2 completion." : null,
      organization_id: orgId,
      consent_signed_at: consentSignedAt,
      consent_program: programConsented,
      consent_outcome_followup: programConsented && chance(0.85),
      consent_wage_match: programConsented && chance(0.7),
      consent_research_deid: programConsented && chance(0.6),
      consent_aggregate_reporting: programConsented && chance(0.92),
      consent_employer_matching: programConsented && chance(0.75),
      consent_health: programConsented && chance(0.4),
      consent_justice: programConsented && chance(0.65),
      data_retention_until: retentionUntil,
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
    // This participant's org case manager (keeps child rows org-coherent).
    const orgStaffId = STAFF_FOR_ORG[orgForParticipant(i)];

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
        staff_id: st === "completed" ? orgStaffId : null,
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
        staff_id: orgStaffId,
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
      staff_id: orgStaffId,
    });
    if (chance(0.85)) {
      const sector = pick(SECTORS);
      assessments.push({
        participant_id: pid(i),
        type: "career_interest",
        score: null,
        summary: `Career Interest Inventory — strongest alignment: ${sector.interest} (${sector.code}).`,
        taken_on: fdate(subDays(m.intake, -5)),
        staff_id: orgStaffId,
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
        created_by: orgStaffId,
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
        staff_id: orgStaffId,
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
        updated_by: orgStaffId,
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
        uploaded_by: orgStaffId,
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

  // --- courses / LMS ---------------------------------------------------------
  console.log("→ Seeding course catalog from content/courses.json…");
  const courses = await seedCourseCatalog();
  const workforceCourses = courses.filter((c) => c.track === "workforce_readiness");
  const supportCourses = courses.filter(
    (c) => c.track === "emotional_readiness" || c.track === "digital",
  );
  const tradeCourses = courses.filter((c) => c.is_trade);

  console.log("→ Seeding participant learning data…");
  const courseProgress: Ins<"course_progress">[] = [];
  const lessonProgress: Ins<"course_lesson_progress">[] = [];
  const quizAttempts: Ins<"quiz_attempts">[] = [];

  const sampleN = <T,>(arr: T[], n: number): T[] =>
    [...arr].sort(() => rand() - 0.5).slice(0, Math.min(n, arr.length));

  for (let i = 0; i < participants.length; i++) {
    const m = meta[i];
    // Enroll in 2-4 courses: tier-appropriate workforce + a support course +
    // one trade course (so trade simulations + scores show up everywhere).
    const enrollSet = new Map<string, SeededCourse>();
    // workforce courses matching or below this participant's tier
    const eligibleWorkforce = workforceCourses.filter(
      (c) => !c.tier || TIER_ORDER[c.tier] <= TIER_ORDER[m.tier],
    );
    for (const c of sampleN(eligibleWorkforce.length ? eligibleWorkforce : workforceCourses, rndInt(1, 2)))
      enrollSet.set(c.id, c);
    if (supportCourses.length && chance(0.8)) {
      const c = pick(supportCourses);
      enrollSet.set(c.id, c);
    }
    if (tradeCourses.length) {
      const c = pick(tradeCourses);
      enrollSet.set(c.id, c);
    }
    // Guarantee at least 2 courses.
    while (enrollSet.size < 2 && enrollSet.size < courses.length) {
      const c = pick(courses);
      enrollSet.set(c.id, c);
    }

    for (const course of enrollSet.values()) {
      const total = course.lessonIds.length;
      // Engagement-driven completion fraction (demo participant lands mid-way).
      const frac =
        i === 0
          ? 0.6
          : m.status === "completed"
            ? rnd(0.8, 1)
            : m.status === "withdrawn"
              ? rnd(0.1, 0.4)
              : rnd(0.3, 0.95);
      const doneLessons = Math.min(total, Math.round(frac * total));

      const startedAt = subDays(today, rndInt(10, 90));
      course.lessonIds.forEach((lessonId, idx) => {
        if (idx < doneLessons) {
          lessonProgress.push({
            participant_id: pid(i),
            lesson_id: lessonId,
            status: "completed",
            completed_at: subDays(today, rndInt(1, 60)).toISOString(),
          });
        }
      });

      // Quiz attempts (1-3 with varied scores) once enough lessons are done.
      let bestPassed = false;
      let bestScore: number | null = null;
      if (course.quizId && doneLessons >= Math.ceil(total * 0.6)) {
        const nAttempts = rndInt(1, 3);
        for (let a = 0; a < nAttempts; a++) {
          // First attempts more likely to be lower; later attempts improve.
          const base = a === 0 ? rnd(45, 85) : rnd(60, 98);
          const score = Math.round(Math.min(100, Math.max(0, base)));
          const passed = score >= 70;
          if (bestScore == null || score > bestScore) bestScore = score;
          if (passed) bestPassed = true;
          quizAttempts.push({
            participant_id: pid(i),
            quiz_id: course.quizId,
            score,
            passed,
            answers: [],
            taken_at: subDays(today, rndInt(1, 45)).toISOString(),
          });
        }
      }

      const allDone = total > 0 && doneLessons >= total;
      const completed = allDone && (!course.quizId || bestPassed);
      const status: ProgressStatus = completed
        ? "completed"
        : doneLessons > 0
          ? "in_progress"
          : "in_progress";
      courseProgress.push({
        participant_id: pid(i),
        course_id: course.id,
        status,
        completion_pct: total ? Math.round((doneLessons / total) * 100) : 0,
        started_at: fdate(startedAt) + "T12:00:00Z",
        completed_at: completed ? subDays(today, rndInt(1, 30)).toISOString() : null,
      });
    }
  }

  const learningBatches: [string, unknown[]][] = [
    ["course_progress", courseProgress],
    ["course_lesson_progress", lessonProgress],
    ["quiz_attempts", quizAttempts],
  ];
  for (const [table, rows] of learningBatches) {
    if (!rows.length) continue;
    for (let c = 0; c < rows.length; c += 500) {
      const chunk = rows.slice(c, c + 500);
      const { error } = await db.from(table as keyof Tables).insert(chunk as never);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    console.log(`   ✓ ${table}: ${rows.length}`);
  }

  // --- Virginia jobs / opportunity engine ------------------------------------
  console.log("→ Seeding Virginia jobs engine (resources, opportunities, applications)…");

  type ContentResource = { name: string; category: string; description: string; url: string };
  type ContentSector = { name: string; outlook: string; typical_wage: string };
  type ContentJob = {
    slug: string;
    title: string;
    employer: string;
    industry: string;
    city: string;
    region: string;
    wage_min: number;
    wage_max: number;
    wage_unit: string;
    employment_type: "full_time" | "part_time" | "temp" | "apprenticeship";
    reentry_friendly: boolean;
    requirements: string[];
    matched_track: string;
    description: string;
    source_url: string;
    posted_date: string;
    status: "open" | "filled" | "closed";
  };

  const jobsHere =
    typeof __dirname !== "undefined" ? __dirname : join(process.cwd(), "supabase");
  const jobsFile = join(jobsHere, "content", "va_jobs.json");
  const jobsContent = JSON.parse(readFileSync(jobsFile, "utf8")) as {
    resources: ContentResource[];
    sectors: ContentSector[];
    jobs: ContentJob[];
  };

  // Upsert resources + sectors (idempotent: delete then insert reference data).
  await db.from("job_resources").delete().neq("id", ALL);
  const resourceRows = [
    ...jobsContent.resources.map((r) => ({
      name: r.name,
      category: r.category,
      description: r.description,
      url: r.url,
      meta: null as null,
    })),
    ...jobsContent.sectors.map((s) => ({
      name: s.name,
      category: "sector",
      description: s.outlook,
      url: null as string | null,
      meta: { outlook: s.outlook, typical_wage: s.typical_wage } as unknown as Ins<"job_resources">["meta"],
    })),
  ];
  {
    const { error } = await db.from("job_resources").insert(resourceRows as never);
    if (error) throw new Error(`job_resources: ${error.message}`);
  }

  // Upsert opportunities by slug (idempotent).
  const jobUpsertRows: Ins<"job_opportunities">[] = jobsContent.jobs.map((j) => ({
    slug: j.slug,
    title: j.title,
    employer: j.employer,
    industry: j.industry,
    city: j.city,
    region: j.region,
    wage_min: j.wage_min,
    wage_max: j.wage_max,
    wage_unit: j.wage_unit,
    employment_type: j.employment_type,
    reentry_friendly: j.reentry_friendly,
    requirements: j.requirements as unknown as Ins<"job_opportunities">["requirements"],
    matched_track: j.matched_track,
    description: j.description,
    source_url: j.source_url,
    posted_date: j.posted_date,
    status: j.status,
  }));
  const { data: seededJobs, error: jobsErr } = await db
    .from("job_opportunities")
    .upsert(jobUpsertRows, { onConflict: "slug" })
    .select("id, slug, matched_track, reentry_friendly, region, requirements");
  if (jobsErr || !seededJobs) throw new Error(`job_opportunities: ${jobsErr?.message}`);
  type SeededJob = {
    id: string;
    slug: string;
    matched_track: string | null;
    reentry_friendly: boolean;
    region: string | null;
    requirements: string[] | null;
  };
  const jobsById = seededJobs as SeededJob[];
  const jobBySlug = new Map(jobsById.map((j) => [j.slug, j]));

  // Course slug -> job matched_track tags (mirrors lib/matching.ts).
  const COURSE_SLUG_TO_TRACKS: Record<string, string[]> = {
    "electrical-trade-fundamentals": ["trades-electrical"],
    "plumbing-trade-fundamentals": ["trades-plumbing"],
    "carpentry-trade-fundamentals": ["trades-carpentry"],
    "warehouse-and-logistics": ["warehouse"],
    "construction-fundamentals-and-safety": ["construction"],
  };
  const slugByCourseId = new Map(courses.map((c) => [c.id, c.slug]));

  // Which trade tracks each participant covers (from their enrolled courses).
  const trackTagsByPart = new Map<string, Set<string>>();
  for (const cp of courseProgress) {
    const pidStr = cp.participant_id as string;
    const slug = slugByCourseId.get(cp.course_id as string);
    if (!slug) continue;
    const tags = trackTagsByPart.get(pidStr) ?? new Set<string>();
    for (const t of COURSE_SLUG_TO_TRACKS[slug] ?? []) tags.add(t);
    trackTagsByPart.set(pidStr, tags);
  }

  // Set realistic, varied readiness flags on each participant.
  console.log("→ Setting participant readiness flags…");
  for (let i = 0; i < participants.length; i++) {
    const m = meta[i];
    const advanced = m.tier !== "tier_1";
    const hasLicense = i === 0 ? true : chance(advanced ? 0.7 : 0.45);
    const transport = i === 0 ? true : hasLicense ? chance(0.85) : chance(0.4);
    // A few graduates earn a CDL (top-earning track).
    const hasCdl = advanced && hasLicense && chance(0.18);
    const cdlClass = hasCdl ? (chance(0.6) ? "A" : "B") : null;
    const bonding = chance(0.55); // most reentry participants are bonding-eligible
    const { error } = await db
      .from("participants")
      .update({
        has_drivers_license: hasLicense,
        has_cdl: hasCdl,
        cdl_class: cdlClass,
        transportation_ok: transport,
        bonding_eligible: bonding,
      })
      .eq("id", pid(i));
    if (error) throw new Error(`readiness ${i}: ${error.message}`);
  }

  // Reload readiness flags so we can compute plausible fit scores.
  const { data: readinessRows } = await db
    .from("participants")
    .select("id, current_tier, has_drivers_license, has_cdl, cdl_class, transportation_ok, bonding_eligible");
  const readinessById = new Map(
    ((readinessRows ?? []) as any[]).map((r) => [r.id, r]),
  );

  // Achieved milestone names per participant (drives requirement coverage).
  const achievedMilestoneNames = new Map<string, string[]>();
  for (const ms of milestones) {
    if (ms.status !== "achieved") continue;
    const arr = achievedMilestoneNames.get(ms.participant_id as string) ?? [];
    arr.push(ms.name as string);
    achievedMilestoneNames.set(ms.participant_id as string, arr);
  }

  // Lightweight fit scorer (mirrors lib/matching.ts weighting closely enough
  // for seeded, demoable scores).
  const TIER_SCORE: Record<ProgramTier, number> = { tier_1: 0.45, tier_2: 0.75, tier_3: 1 };
  function reqMet(req: string, r: any): boolean | null {
    const s = req.toLowerCase();
    if (s.includes("cdl")) {
      if (s.includes("class a")) return r.has_cdl && r.cdl_class === "A";
      if (s.includes("class b")) return r.has_cdl && (r.cdl_class === "A" || r.cdl_class === "B");
      return r.has_cdl;
    }
    if (s.includes("driver's license") || s.includes("drivers license") || s.includes("valid license"))
      return r.has_drivers_license;
    if (s.includes("transportation")) return r.transportation_ok;
    if (
      s.includes("willing") || s.includes("no experience") || s.includes("no license required") ||
      s.includes("able to") || s.includes("attitude") || s.includes("team player") ||
      s.includes("punctual") || s.includes("reliable attendance") || s.includes("flexible") ||
      s.includes("a plus") || s.includes("preferred") || s.includes("or willing to") || s.includes("basic math")
    )
      return null;
    return null;
  }
  function fitFor(partId: string, job: SeededJob): { score: number; missing: string[] } {
    const r = readinessById.get(partId);
    if (!r) return { score: 50, missing: [] };
    const tags = trackTagsByPart.get(partId) ?? new Set<string>();
    const milestonesA = achievedMilestoneNames.get(partId) ?? [];
    let trackScore = 0;
    const jt = job.matched_track ?? "";
    if (jt === "cdl") trackScore = r.has_cdl ? 1 : 0.1;
    else if (tags.has(jt)) trackScore = 1;
    else if (jt === "general") trackScore = 0.55;
    else if (jt) trackScore = 0.15;
    else trackScore = 0.5;
    // requirement coverage
    const reqs = job.requirements ?? [];
    const missing: string[] = [];
    let evaluated = 0;
    let met = 0;
    for (const req of reqs) {
      const res = reqMet(req, r);
      if (res === null) continue;
      evaluated += 1;
      if (res) met += 1;
      else missing.push(req);
    }
    void milestonesA;
    const reqScore = evaluated === 0 ? 1 : met / evaluated;
    const tierScore = TIER_SCORE[r.current_tier as ProgramTier];
    let score = trackScore * 50 + reqScore * 35 + tierScore * 15;
    if (job.reentry_friendly) score += 5;
    return { score: Math.round(Math.min(100, Math.max(0, score))), missing };
  }

  // Build a realistic application pipeline distributed across orgs/regions.
  console.log("→ Creating job applications…");
  const applications: Ins<"job_applications">[] = [];
  const APP_PIPELINE = ["matched", "interested", "preparing", "applied", "interviewing", "offer", "hired"] as const;

  for (let i = 0; i < participants.length; i++) {
    const m = meta[i];
    // Rank every open job by fit, take the participant's best matches.
    const scored = jobsById
      .map((job) => ({ job, ...fitFor(pid(i), job) }))
      .sort((a, b) => b.score - a.score);

    // Most active participants track 1–3 fitting jobs.
    if (m.status === "withdrawn" && !chance(0.3)) continue;
    const nApps = m.status === "completed" ? rndInt(1, 2) : rndInt(1, 3);
    const chosen = scored.slice(0, Math.max(nApps, 1));

    chosen.forEach((c, idx) => {
      // Status progression: top match for advanced/completed participants moves
      // further down the pipeline; others mostly matched/interested.
      let status: (typeof APP_PIPELINE)[number] = "interested";
      if (m.status === "completed" && idx === 0) {
        status = chance(0.6) ? "hired" : pick(["offer", "interviewing"] as const);
      } else if (m.tier === "tier_3" && idx === 0 && chance(0.6)) {
        status = pick(["applied", "interviewing", "offer"] as const);
      } else if (m.tier === "tier_2" && idx === 0 && chance(0.45)) {
        status = pick(["preparing", "applied"] as const);
      } else {
        status = idx === 0 ? pick(["interested", "preparing"] as const) : pick(["matched", "interested"] as const);
      }

      const applied = ["applied", "interviewing", "offer", "hired"].includes(status);
      applications.push({
        participant_id: pid(i),
        job_id: c.job.id,
        status,
        fit_score: c.score,
        missing_requirements: c.missing as unknown as Ins<"job_applications">["missing_requirements"],
        staff_id: STAFF_FOR_ORG[orgForParticipant(i)],
        staff_notes:
          status === "hired"
            ? "Hired — fair-chance placement confirmed; 30-day retention check scheduled."
            : status === "offer"
              ? "Offer extended; reviewing start date and transportation plan."
              : status === "interviewing"
                ? "Interview scheduled; completed mock interview prep."
                : status === "applied"
                  ? "Application submitted via fair-chance employer portal."
                  : null,
        applied_at: applied ? subDays(today, rndInt(2, 40)).toISOString() : null,
      });
    });
  }

  // Insert applications (idempotent: unique(participant_id, job_id) — upsert).
  for (let c = 0; c < applications.length; c += 500) {
    const chunk = applications.slice(c, c + 500);
    const { error } = await db
      .from("job_applications")
      .upsert(chunk as never, { onConflict: "participant_id,job_id" });
    if (error) throw new Error(`job_applications: ${error.message}`);
  }
  const hiredCount = applications.filter((a) => a.status === "hired").length;
  console.log(`   ✓ job_resources: ${resourceRows.length}`);
  console.log(`   ✓ job_opportunities: ${jobsById.length}`);
  console.log(`   ✓ job_applications: ${applications.length}  (hired: ${hiredCount})`);
  void jobBySlug;

  // --- summary ---------------------------------------------------------------
  const placedCount = outcomes.filter((o) =>
    ["placed", "retained_30", "retained_90", "retained_180"].includes(o.employment_status as string),
  ).length;
  console.log("\n✅ Seed complete.");
  console.log(`   Participants: ${participants.length}`);
  console.log(`   Modules: ${modules.length}  Employers: ${employers.length}`);
  console.log(`   Placements: ${placedCount}  WBL: ${wbl.length}`);
  console.log(
    `   Courses: ${courses.length}  Enrollments: ${courseProgress.length}  Lessons done: ${lessonProgress.length}  Quiz attempts: ${quizAttempts.length}`,
  );
  console.log(
    `   Jobs: ${jobsById.length}  Resources: ${resourceRows.length}  Applications: ${applications.length}  (hired: ${hiredCount})`,
  );
  console.log("\n   Demo logins (password Demo1234!):");
  console.log("     IEP master:  rhonda@ieppartners.demo · michelle@ieppartners.demo");
  console.log("     Org admins:  admin.newportnews@ · admin.greensville@ · admin.riverside@ieppartners.demo");
  console.log("     Org staff:   staff.newportnews@ · staff.greensville@ · staff.riverside@ieppartners.demo");
  console.log("     Legacy:      admin@ · staff@ · participant@ieppartners.demo");
  console.log("   Participants distributed across 3 facility orgs (~8 each).");
}

main().catch((e) => {
  console.error("\n✗ Seed failed:", e);
  process.exit(1);
});
