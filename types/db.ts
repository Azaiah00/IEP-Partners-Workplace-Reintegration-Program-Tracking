// Supabase database types for the IEP Partners portal.
// Hand-authored to match supabase/migrations/0001_schema.sql exactly.
// Regenerate with `npm run db:types` if you wire up the Supabase CLI.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---- Enums ------------------------------------------------------------------
export type UserRole = "participant" | "staff" | "admin" | "super_admin";
export type OrgType =
  | "iep_master"
  | "correctional_facility"
  | "jail"
  | "agency";
export type ProgramTier = "tier_1" | "tier_2" | "tier_3";
export type EnrollmentStatus =
  | "enrolled"
  | "active"
  | "on_hold"
  | "completed"
  | "withdrawn";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type AttendanceStatus = "present" | "absent" | "excused" | "late";
export type MilestoneStatus = "pending" | "achieved";
export type GoalStatus = "open" | "in_progress" | "achieved" | "deferred";
export type WblType =
  | "job_shadow"
  | "work_based_learning"
  | "paid_work_experience";
export type EmploymentStatus =
  | "unemployed"
  | "searching"
  | "placed"
  | "retained_30"
  | "retained_90"
  | "retained_180";
export type DocType = "resume" | "certificate" | "credential" | "other";
export type EmployerStage =
  | "prospect"
  | "contacted"
  | "partner"
  | "hiring"
  | "inactive";
export type AssessmentType =
  | "workforce_readiness"
  | "career_interest"
  | "skills_self_eval";
export type LessonKind = "reading" | "simulation" | "video" | "quiz";

// ---- Jobs / Opportunity engine enums (0008_jobs_engine.sql) ------------------
export type JobEmploymentType =
  | "full_time"
  | "part_time"
  | "temp"
  | "apprenticeship";
export type JobStatus = "open" | "filled" | "closed";
export type ApplicationStatus =
  | "matched"
  | "interested"
  | "preparing"
  | "applied"
  | "interviewing"
  | "offer"
  | "hired"
  | "not_pursued";

// ---- Row shapes -------------------------------------------------------------
type Timestamps = { created_at: string };

export interface Organization extends Timestamps {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  city: string | null;
  county: string | null;
  state: string | null;
  capacity: number | null;
  operator: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface Profile extends Timestamps {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  organization_id: string | null;
}

export interface Participant extends Timestamps {
  id: string;
  profile_id: string | null;
  participant_code: string;
  date_of_birth: string | null;
  phone: string | null;
  referral_source: string | null;
  region: string | null;
  intake_date: string;
  assigned_staff_id: string | null;
  status: EnrollmentStatus;
  current_tier: ProgramTier;
  notes: string | null;
  organization_id: string | null;
  // Consent & data-governance fields (added in 0006_multi_tenant.sql)
  consent_signed_at: string | null;
  consent_program: boolean;
  consent_outcome_followup: boolean;
  consent_wage_match: boolean;
  consent_research_deid: boolean;
  consent_aggregate_reporting: boolean;
  consent_employer_matching: boolean;
  consent_health: boolean;
  consent_justice: boolean;
  data_retention_until: string | null;
  // Job-readiness fields (added in 0008_jobs_engine.sql)
  has_drivers_license: boolean;
  has_cdl: boolean;
  cdl_class: string | null;
  transportation_ok: boolean;
  bonding_eligible: boolean;
  updated_at: string;
}

export interface Enrollment extends Timestamps {
  id: string;
  participant_id: string;
  tier: ProgramTier;
  start_date: string;
  target_end_date: string | null;
  status: EnrollmentStatus;
  completion_pct: number;
  updated_at: string;
}

export interface CurriculumModule extends Timestamps {
  id: string;
  tier: ProgramTier;
  name: string;
  description: string | null;
  sequence: number;
}

export interface LessonProgress extends Timestamps {
  id: string;
  participant_id: string;
  module_id: string;
  status: ProgressStatus;
  completed_at: string | null;
  staff_id: string | null;
}

export interface Attendance extends Timestamps {
  id: string;
  participant_id: string;
  session_date: string;
  status: AttendanceStatus;
  staff_id: string | null;
  notes: string | null;
}

export interface Assessment extends Timestamps {
  id: string;
  participant_id: string;
  type: AssessmentType;
  score: number | null;
  summary: string | null;
  taken_on: string;
  staff_id: string | null;
}

export interface CareerInterest extends Timestamps {
  id: string;
  participant_id: string;
  interest: string;
  riasec_or_sector: string | null;
  rank: number;
}

export interface Goal extends Timestamps {
  id: string;
  participant_id: string;
  title: string;
  detail: string | null;
  status: GoalStatus;
  target_date: string | null;
  created_by: string | null;
}

export interface Milestone extends Timestamps {
  id: string;
  participant_id: string;
  name: string;
  status: MilestoneStatus;
  achieved_on: string | null;
  sequence: number;
}

export interface CaseNote extends Timestamps {
  id: string;
  participant_id: string;
  staff_id: string | null;
  note: string;
  category: string | null;
}

export interface TransitionPlan extends Timestamps {
  id: string;
  participant_id: string;
  summary: string | null;
  barriers: string[];
  support_services: string[];
  target_career: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface DocumentRow extends Timestamps {
  id: string;
  participant_id: string;
  type: DocType;
  title: string;
  storage_path: string | null;
  uploaded_by: string | null;
}

export interface Employer extends Timestamps {
  id: string;
  name: string;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  stage: EmployerStage;
  region: string | null;
  notes: string | null;
  owner_staff_id: string | null;
  updated_at: string;
}

export interface WorkBasedLearning extends Timestamps {
  id: string;
  participant_id: string;
  employer_id: string | null;
  type: WblType;
  start_date: string | null;
  end_date: string | null;
  hours: number;
  status: string | null;
  notes: string | null;
}

export interface Outcome extends Timestamps {
  id: string;
  participant_id: string;
  employment_status: EmploymentStatus;
  employer_id: string | null;
  job_title: string | null;
  hourly_wage: number | null;
  placement_date: string | null;
  retention_check_date: string | null;
  updated_at: string;
}

// ---- Courses / LMS (0007_courses.sql) ---------------------------------------
export interface Course {
  id: string;
  slug: string;
  track: string; // workforce_readiness | emotional_readiness | digital | trades
  title: string;
  description: string | null;
  tier: ProgramTier | null;
  is_trade: boolean;
  icon: string | null;
  est_hours: number | null;
  sequence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  kind: LessonKind;
  sequence: number;
  content: string | null;
  sim_type: string | null;
  sim_inspiration: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  pass_score: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  sequence: number;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

export interface CourseProgress {
  id: string;
  participant_id: string;
  course_id: string;
  status: ProgressStatus;
  completion_pct: number;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface CourseLessonProgress {
  id: string;
  participant_id: string;
  lesson_id: string;
  status: ProgressStatus;
  completed_at: string | null;
}

export interface QuizAttempt {
  id: string;
  participant_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  answers: Json | null;
  taken_at: string;
}

// ---- Jobs / Opportunity engine (0008_jobs_engine.sql) -----------------------
export interface JobResource {
  id: string;
  name: string;
  category: string | null; // 'resource' | 'sector' | program type
  description: string | null;
  url: string | null;
  meta: Json | null; // e.g. { outlook, typical_wage } for sectors
  created_at: string;
}

export interface JobOpportunity {
  id: string;
  slug: string;
  title: string;
  employer: string;
  industry: string | null;
  city: string | null;
  region: string | null;
  wage_min: number | null;
  wage_max: number | null;
  wage_unit: string | null;
  employment_type: JobEmploymentType;
  reentry_friendly: boolean;
  requirements: string[] | null;
  matched_track: string | null;
  description: string | null;
  source_url: string | null;
  posted_date: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  participant_id: string;
  job_id: string;
  status: ApplicationStatus;
  fit_score: number | null;
  missing_requirements: string[] | null;
  staff_notes: string | null;
  staff_id: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Generic table mapping for supabase-js ----------------------------------
type TableShape<Row, Generated extends keyof Row, Optional extends keyof Row> = {
  Row: Row;
  Insert: Omit<Row, Generated | Optional> &
    Partial<Pick<Row, Generated | Optional>>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      organizations: TableShape<
        Organization,
        "id" | "created_at" | "updated_at",
        "type" | "city" | "county" | "state" | "capacity" | "operator" | "website" | "notes" | "is_active"
      >;
      profiles: TableShape<Profile, "created_at", "avatar_url" | "full_name" | "email" | "role" | "organization_id">;
      participants: TableShape<
        Participant,
        "id" | "created_at" | "updated_at",
        "profile_id" | "date_of_birth" | "phone" | "referral_source" | "region" | "intake_date" | "assigned_staff_id" | "status" | "current_tier" | "notes" | "organization_id" | "consent_signed_at" | "consent_program" | "consent_outcome_followup" | "consent_wage_match" | "consent_research_deid" | "consent_aggregate_reporting" | "consent_employer_matching" | "consent_health" | "consent_justice" | "data_retention_until" | "has_drivers_license" | "has_cdl" | "cdl_class" | "transportation_ok" | "bonding_eligible"
      >;
      enrollments: TableShape<
        Enrollment,
        "id" | "created_at" | "updated_at",
        "start_date" | "target_end_date" | "status" | "completion_pct"
      >;
      curriculum_modules: TableShape<
        CurriculumModule,
        "id" | "created_at",
        "description" | "sequence"
      >;
      lesson_progress: TableShape<
        LessonProgress,
        "id" | "created_at",
        "status" | "completed_at" | "staff_id"
      >;
      attendance: TableShape<
        Attendance,
        "id" | "created_at",
        "session_date" | "status" | "staff_id" | "notes"
      >;
      assessments: TableShape<
        Assessment,
        "id" | "created_at",
        "score" | "summary" | "taken_on" | "staff_id"
      >;
      career_interests: TableShape<
        CareerInterest,
        "id" | "created_at",
        "riasec_or_sector" | "rank"
      >;
      goals: TableShape<
        Goal,
        "id" | "created_at",
        "detail" | "status" | "target_date" | "created_by"
      >;
      milestones: TableShape<
        Milestone,
        "id" | "created_at",
        "status" | "achieved_on" | "sequence"
      >;
      case_notes: TableShape<
        CaseNote,
        "id" | "created_at",
        "staff_id" | "category"
      >;
      transition_plans: TableShape<
        TransitionPlan,
        "id" | "created_at" | "updated_at",
        "summary" | "barriers" | "support_services" | "target_career" | "updated_by"
      >;
      documents: TableShape<
        DocumentRow,
        "id" | "created_at",
        "type" | "storage_path" | "uploaded_by"
      >;
      employers: TableShape<
        Employer,
        "id" | "created_at" | "updated_at",
        "industry" | "contact_name" | "contact_email" | "stage" | "region" | "notes" | "owner_staff_id"
      >;
      work_based_learning: TableShape<
        WorkBasedLearning,
        "id" | "created_at",
        "employer_id" | "start_date" | "end_date" | "hours" | "status" | "notes"
      >;
      outcomes: TableShape<
        Outcome,
        "id" | "created_at" | "updated_at",
        "employment_status" | "employer_id" | "job_title" | "hourly_wage" | "placement_date" | "retention_check_date"
      >;
      courses: TableShape<
        Course,
        "id" | "created_at" | "updated_at",
        "description" | "tier" | "is_trade" | "icon" | "est_hours" | "sequence" | "is_active"
      >;
      lessons: TableShape<
        Lesson,
        "id" | "created_at",
        "kind" | "sequence" | "content" | "sim_type" | "sim_inspiration"
      >;
      quizzes: TableShape<Quiz, "id" | "created_at", "pass_score">;
      quiz_questions: TableShape<
        QuizQuestion,
        "id",
        "sequence" | "explanation"
      >;
      course_progress: TableShape<
        CourseProgress,
        "id" | "updated_at",
        "status" | "completion_pct" | "started_at" | "completed_at"
      >;
      course_lesson_progress: TableShape<
        CourseLessonProgress,
        "id",
        "status" | "completed_at"
      >;
      quiz_attempts: TableShape<
        QuizAttempt,
        "id" | "taken_at",
        "passed" | "answers"
      >;
      job_resources: TableShape<
        JobResource,
        "id" | "created_at",
        "category" | "description" | "url" | "meta"
      >;
      job_opportunities: TableShape<
        JobOpportunity,
        "id" | "created_at" | "updated_at",
        "industry" | "city" | "region" | "wage_min" | "wage_max" | "wage_unit" | "employment_type" | "reentry_friendly" | "requirements" | "matched_track" | "description" | "source_url" | "posted_date" | "status"
      >;
      job_applications: TableShape<
        JobApplication,
        "id" | "created_at" | "updated_at",
        "status" | "fit_score" | "missing_requirements" | "staff_notes" | "staff_id" | "applied_at"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: UserRole };
      my_participant_id: { Args: Record<string, never>; Returns: string };
      is_staff_or_admin: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      my_org: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      org_type: OrgType;
      program_tier: ProgramTier;
      enrollment_status: EnrollmentStatus;
      progress_status: ProgressStatus;
      attendance_status: AttendanceStatus;
      milestone_status: MilestoneStatus;
      goal_status: GoalStatus;
      wbl_type: WblType;
      employment_status: EmploymentStatus;
      doc_type: DocType;
      employer_stage: EmployerStage;
      assessment_type: AssessmentType;
      lesson_kind: LessonKind;
      job_employment_type: JobEmploymentType;
      job_status: JobStatus;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
