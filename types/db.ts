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
export type UserRole = "participant" | "staff" | "admin";
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

// ---- Row shapes -------------------------------------------------------------
type Timestamps = { created_at: string };

export interface Profile extends Timestamps {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
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
      profiles: TableShape<Profile, "created_at", "avatar_url" | "full_name" | "email" | "role">;
      participants: TableShape<
        Participant,
        "id" | "created_at" | "updated_at",
        "profile_id" | "date_of_birth" | "phone" | "referral_source" | "region" | "intake_date" | "assigned_staff_id" | "status" | "current_tier" | "notes"
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
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: UserRole };
      my_participant_id: { Args: Record<string, never>; Returns: string };
      is_staff_or_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
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
    };
    CompositeTypes: Record<string, never>;
  };
}
