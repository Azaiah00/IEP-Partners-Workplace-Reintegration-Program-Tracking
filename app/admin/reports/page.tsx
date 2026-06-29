import {
  Users,
  Activity,
  GraduationCap,
  Briefcase,
  TrendingUp,
  DollarSign,
  BookOpen,
  Trophy,
  Award,
  CalendarCheck,
  Building2,
  ClipboardList,
  Target,
  FileText,
} from "lucide-react";
import { requireRole, getMyOrgId } from "@/lib/auth";
import { getAdminDashboard, getOrgRoster } from "@/lib/queries/admin";
import { getOrgLearningSummary } from "@/lib/queries/courses";
import { getOrgApplications } from "@/lib/queries/jobs";
import { getOrganization } from "@/lib/queries/iep";
import {
  getWioaOutcomes,
  getAttendanceReport,
  getCourseScoresReport,
  getWblReport,
  getEmployerEngagementReport,
  getWioaReport,
  ATTENDANCE_COLUMNS,
  COURSE_SCORES_COLUMNS,
  WBL_COLUMNS,
  EMPLOYER_COLUMNS,
  WIOA_REPORT_COLUMNS,
} from "@/lib/queries/wioa";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExportButton } from "@/components/admin/export-button";
import { PdfButton } from "@/components/reports/pdf-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Reports · IEP Partners" };

const ROSTER_COLUMNS = [
  { key: "code" as const, label: "Participant Code" },
  { key: "name" as const, label: "Name" },
  { key: "tier" as const, label: "Tier" },
  { key: "status" as const, label: "Status" },
  { key: "region" as const, label: "Region" },
  { key: "completion" as const, label: "Curriculum %" },
  { key: "courseCompletion" as const, label: "Courses %" },
  { key: "attendanceRate" as const, label: "Attendance %" },
  { key: "staffName" as const, label: "Case Manager" },
  { key: "intakeDate" as const, label: "Intake Date" },
];

const OUTCOME_COLUMNS = [
  { key: "label" as const, label: "Metric" },
  { key: "value" as const, label: "Value" },
];

const JOBS_COLUMNS = [
  { key: "participant" as const, label: "Participant" },
  { key: "jobTitle" as const, label: "Job Title" },
  { key: "employer" as const, label: "Employer" },
  { key: "region" as const, label: "Region" },
  { key: "fitScore" as const, label: "Fit" },
  { key: "status" as const, label: "Status" },
  { key: "applied" as const, label: "Applied" },
];

export default async function AdminReportsPage() {
  await requireRole("admin");
  const orgId = await getMyOrgId();
  const scoped = orgId ?? undefined;

  const [
    d,
    roster,
    learning,
    org,
    wioa,
    attendance,
    courseScores,
    wbl,
    employers,
    wioaReport,
    applications,
  ] = await Promise.all([
    getAdminDashboard(scoped),
    getOrgRoster(scoped),
    getOrgLearningSummary(scoped),
    orgId ? getOrganization(orgId) : Promise.resolve(null),
    getWioaOutcomes(orgId),
    getAttendanceReport(orgId),
    getCourseScoresReport(orgId),
    getWblReport(orgId),
    getEmployerEngagementReport(orgId),
    getWioaReport(orgId),
    getOrgApplications(scoped),
  ]);
  const k = d.kpis;

  const orgName = org ? org.name : "All Organizations";
  const orgSubtitle = org
    ? `${org.county ?? ""}${org.county ? ", " : ""}${org.state ?? ""}`.trim() || undefined
    : "IEP Partners — all organizations";
  // Common subtitle for every report (org + generation context).
  const reportSubtitle = `${orgName}${orgSubtitle ? ` · ${orgSubtitle}` : ""}`;

  // Retention from the outcome funnel: [Placed, 30-Day, 90-Day, 180-Day].
  const placed = d.funnel[0]?.value ?? 0;
  const ret30 = d.funnel[1]?.value ?? 0;
  const ret90 = d.funnel[2]?.value ?? 0;
  const ret180 = d.funnel[3]?.value ?? 0;
  const pct = (n: number) => (placed ? Math.round((n / placed) * 100) : 0);

  const rosterRows = roster.map((r) => ({
    code: r.code,
    name: r.name,
    tier: humanize(r.tier),
    status: humanize(r.status),
    region: r.region,
    completion: r.completion,
    courseCompletion: r.courseCompletion,
    attendanceRate: r.attendanceRate,
    staffName: r.staffName,
    intakeDate: r.intakeDate,
  }));

  // ---- Program Summary report KPIs ----
  const summaryKpis = [
    { label: "Total Enrolled", value: k.total },
    { label: "Active", value: k.active },
    { label: "Completion Rate", value: `${k.completionRate}%` },
    { label: "Placement Rate", value: `${k.placementRate}%` },
    { label: "90-Day Retention", value: `${k.retention90}%` },
    { label: "At Risk", value: k.atRisk },
    { label: "Paid Work Experience (participants)", value: k.paidWorkParticipants },
    { label: "Paid Work Hours", value: k.paidWorkHours },
    { label: "Course Enrollments", value: learning.enrollments },
    { label: "Avg Course Completion", value: `${learning.avgCompletion}%` },
    { label: "Quizzes Passed", value: learning.quizzesPassed },
    { label: "Program Health", value: `${k.programHealth} (${k.programHealthLabel})` },
  ];

  // ---- Outcomes / Placements report rows ----
  const outcomeRows = [
    { label: "Participants Placed", value: String(placed) },
    { label: "Placement Rate", value: `${k.placementRate}%` },
    { label: "Average Hourly Wage", value: k.avgWage ? `$${k.avgWage.toFixed(2)}` : "—" },
    { label: "Retained 30 Days", value: `${ret30} (${pct(ret30)}%)` },
    { label: "Retained 90 Days", value: `${ret90} (${pct(ret90)}%)` },
    { label: "Retained 180 Days", value: `${ret180} (${pct(ret180)}%)` },
    { label: "Paid Work Experience Participants", value: String(k.paidWorkParticipants) },
    { label: "Paid Work Hours Logged", value: String(k.paidWorkHours) },
  ];

  // ---- WIOA indicator KPIs (for the strip + report card) ----
  const wioaByKey = new Map(wioa.indicators.map((i) => [i.key, i]));
  const wioaKpis = wioa.indicators.map((i) => ({
    label: i.label,
    value: i.value ?? `${i.rate}% (${i.numerator}/${i.denominator})`,
  }));

  // ---- Jobs pipeline rows ----
  const jobsRows = applications.map((a) => ({
    participant: a.participantName,
    jobTitle: a.jobTitle,
    employer: a.employer,
    region: a.region ?? "—",
    fitScore: a.fit_score != null ? `${a.fit_score}%` : "—",
    status: humanize(a.status),
    applied: a.applied_at ? a.applied_at.slice(0, 10) : "—",
  }));

  return (
    <>
      <PageHeader
        title="Reports Library"
        subtitle={`${orgName} — headline outcomes, WIOA indicators and downloadable program reports.`}
        actions={
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Program Summary`}
            subtitle={orgSubtitle}
            kpis={summaryKpis}
            rows={{ columns: ROSTER_COLUMNS as any, data: rosterRows as any }}
            filename="program-summary.pdf"
          />
        }
      />

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Enrolled"
          value={k.total}
          subLabel={`${k.active} active`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Completion Rate"
          value={`${k.completionRate}%`}
          subLabel="Program completion"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Placement Rate"
          value={`${k.placementRate}%`}
          subLabel={`${placed} placed`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="90-Day Retention"
          value={`${k.retention90}%`}
          subLabel="Of placed participants"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Active Participants"
          value={k.active}
          subLabel={`${k.atRisk} at risk`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Paid Work Experience"
          value={k.paidWorkParticipants}
          subLabel={`${k.paidWorkHours} hours logged`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Course Enrollments"
          value={learning.enrollments}
          subLabel={`${learning.avgCompletion}% avg completion`}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Quizzes Passed"
          value={learning.quizzesPassed}
          subLabel={
            learning.avgQuizScore != null
              ? `${learning.avgQuizScore}% avg score`
              : "Passing attempts"
          }
          icon={<Trophy className="h-4 w-4" />}
        />
      </div>

      {/* WIOA indicator strip */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            WIOA Outcome Indicators
          </h2>
          <p className="text-xs text-muted-foreground">
            Program approximations of the federal WIOA primary indicators, computed
            from program data. Not state-validated figures.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Employment Rate (Q2)"
            value={`${wioaByKey.get("employment_rate_q2")?.rate ?? 0}%`}
            subLabel={`${wioaByKey.get("employment_rate_q2")?.numerator ?? 0} of ${wioaByKey.get("employment_rate_q2")?.denominator ?? 0} exited`}
            icon={<Briefcase className="h-4 w-4" />}
          />
          <StatCard
            label="Employment Rate (Q4)"
            value={`${wioaByKey.get("employment_rate_q4")?.rate ?? 0}%`}
            subLabel="90/180-day retained"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="Credential Attainment"
            value={`${wioaByKey.get("credential_attainment_rate")?.rate ?? 0}%`}
            subLabel={`${wioaByKey.get("credential_attainment_rate")?.numerator ?? 0} with credential`}
            icon={<Award className="h-4 w-4" />}
          />
          <StatCard
            label="Measurable Skill Gains"
            value={`${wioaByKey.get("measurable_skill_gains_rate")?.rate ?? 0}%`}
            subLabel={`Median wage ${wioa.medianHourlyWage != null ? `$${wioa.medianHourlyWage.toFixed(2)}/hr` : "—"}`}
            icon={<Target className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Report Library sections */}
      <ReportSection title="Outcomes">
        <ReportCard
          icon={<FileText className="h-4 w-4" />}
          title="Program Summary"
          description="Headline KPIs across enrollment, completion, placement, retention & learning, with the full participant roster."
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Program Summary`}
            subtitle={reportSubtitle}
            kpis={summaryKpis}
            rows={{ columns: ROSTER_COLUMNS as any, data: rosterRows as any }}
            filename="program-summary.pdf"
            label="PDF"
          />
          <ExportButton
            rows={summaryKpis.map((x) => ({ label: x.label, value: String(x.value) }))}
            columns={[
              { key: "label", label: "Metric" },
              { key: "value", label: "Value" },
            ]}
            filename="program-summary.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<Briefcase className="h-4 w-4" />}
          title="Outcomes & Placements"
          description="Placement rate, average wage, 30/90/180-day retention and paid work experience."
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Outcomes & Placements`}
            subtitle={reportSubtitle}
            kpis={summaryKpis.filter((x) =>
              [
                "Placement Rate",
                "90-Day Retention",
                "Paid Work Experience (participants)",
                "Paid Work Hours",
              ].includes(x.label),
            )}
            rows={{ columns: OUTCOME_COLUMNS as any, data: outcomeRows as any }}
            filename="outcomes-placements.pdf"
            label="PDF"
          />
          <ExportButton
            rows={outcomeRows}
            columns={OUTCOME_COLUMNS}
            filename="outcomes-placements.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<Award className="h-4 w-4" />}
          title="WIOA Outcomes"
          description="Program approximations of the WIOA primary indicators: employment rate, median earnings, credential attainment, MSG & retention."
          empty={wioaReport.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — WIOA Outcomes (Program Approximation)`}
            subtitle={reportSubtitle}
            kpis={wioaKpis}
            rows={{ columns: WIOA_REPORT_COLUMNS as any, data: wioaReport.rows }}
            filename="wioa-outcomes.pdf"
            label="PDF"
          />
          <ExportButton
            rows={wioaReport.rows}
            columns={WIOA_REPORT_COLUMNS}
            filename="wioa-outcomes.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>

      <ReportSection title="Participation & Learning">
        <ReportCard
          icon={<CalendarCheck className="h-4 w-4" />}
          title="Attendance Report"
          description="Per participant: sessions, present / absent / late / excused counts and overall attendance rate."
          empty={attendance.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Attendance Report`}
            subtitle={reportSubtitle}
            kpis={[{ label: "Participants", value: attendance.rows.length }]}
            rows={{ columns: ATTENDANCE_COLUMNS as any, data: attendance.rows }}
            filename="attendance-report.pdf"
            label="PDF"
          />
          <ExportButton
            rows={attendance.rows}
            columns={ATTENDANCE_COLUMNS}
            filename="attendance-report.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<BookOpen className="h-4 w-4" />}
          title="Course & Quiz Scores"
          description="Per participant: courses enrolled & completed, average quiz score and quizzes passed."
          empty={courseScores.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Course & Quiz Scores`}
            subtitle={reportSubtitle}
            kpis={[
              { label: "Course Enrollments", value: learning.enrollments },
              { label: "Quizzes Passed", value: learning.quizzesPassed },
            ]}
            rows={{ columns: COURSE_SCORES_COLUMNS as any, data: courseScores.rows }}
            filename="course-quiz-scores.pdf"
            label="PDF"
          />
          <ExportButton
            rows={courseScores.rows}
            columns={COURSE_SCORES_COLUMNS}
            filename="course-quiz-scores.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>

      <ReportSection title="Workforce">
        <ReportCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Work-Based Learning"
          description="Every WBL record: participant, employer, type, hours, status and dates."
          empty={wbl.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Work-Based Learning`}
            subtitle={reportSubtitle}
            kpis={[
              { label: "Paid Work Participants", value: k.paidWorkParticipants },
              { label: "Paid Work Hours", value: k.paidWorkHours },
            ]}
            rows={{ columns: WBL_COLUMNS as any, data: wbl.rows }}
            filename="work-based-learning.pdf"
            label="PDF"
          />
          <ExportButton
            rows={wbl.rows}
            columns={WBL_COLUMNS}
            filename="work-based-learning.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<Building2 className="h-4 w-4" />}
          title="Employer Engagement"
          description="Per employer: industry, stage, contact, region and linked work-based learning / placements."
          empty={employers.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Employer Engagement`}
            subtitle={reportSubtitle}
            kpis={[{ label: "Employers", value: employers.rows.length }]}
            rows={{ columns: EMPLOYER_COLUMNS as any, data: employers.rows }}
            filename="employer-engagement.pdf"
            label="PDF"
          />
          <ExportButton
            rows={employers.rows}
            columns={EMPLOYER_COLUMNS}
            filename="employer-engagement.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<ClipboardList className="h-4 w-4" />}
          title="Jobs Pipeline"
          description="Every application: participant, job title, employer, region, fit score, status and applied date."
          empty={jobsRows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Jobs Pipeline`}
            subtitle={reportSubtitle}
            kpis={[{ label: "Applications", value: jobsRows.length }]}
            rows={{ columns: JOBS_COLUMNS as any, data: jobsRows as any }}
            filename="jobs-pipeline.pdf"
            label="PDF"
          />
          <ExportButton
            rows={jobsRows}
            columns={JOBS_COLUMNS}
            filename="jobs-pipeline.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>

      <ReportSection title="Roster">
        <ReportCard
          icon={<Users className="h-4 w-4" />}
          title="Participant Roster"
          description="Every participant with tier, status, curriculum & course completion, attendance and assigned case manager."
          empty={rosterRows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title={`${orgName} — Participant Roster`}
            subtitle={reportSubtitle}
            kpis={[
              { label: "Total Participants", value: roster.length },
              { label: "Active", value: k.active },
              { label: "At Risk", value: k.atRisk },
            ]}
            rows={{ columns: ROSTER_COLUMNS as any, data: rosterRows as any }}
            filename="participant-roster.pdf"
            label="PDF"
          />
          <ExportButton
            rows={rosterRows}
            columns={ROSTER_COLUMNS}
            filename="participant-roster.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>
    </>
  );
}

/** A titled group of report cards. */
function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{children}</div>
    </div>
  );
}

/** A single report card: icon + title + description + action buttons. */
function ReportCard({
  icon,
  title,
  description,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-raised text-muted-foreground">
            {icon}
          </span>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap items-center gap-2">
        {empty ? (
          <span className="text-xs text-muted-foreground">
            No data available yet.
          </span>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
