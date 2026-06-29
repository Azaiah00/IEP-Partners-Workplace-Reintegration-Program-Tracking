import {
  Award,
  Briefcase,
  TrendingUp,
  Target,
  CalendarCheck,
  BookOpen,
  DollarSign,
  Building2,
  ClipboardList,
  FileText,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMasterOverview } from "@/lib/queries/iep";
import { getOrgApplications } from "@/lib/queries/jobs";
import {
  getWioaOutcomes,
  getWioaByOrg,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Reports · IEP Partners" };

const ROLLUP_COLUMNS = [
  { key: "name" as const, label: "Organization" },
  { key: "type" as const, label: "Type" },
  { key: "participants" as const, label: "Participants" },
  { key: "active" as const, label: "Active" },
  { key: "completionRate" as const, label: "Completion %" },
  { key: "placements" as const, label: "Placements" },
  { key: "placementRate" as const, label: "Placement %" },
  { key: "paidWorkExperience" as const, label: "Paid Work Exp." },
  { key: "staffCount" as const, label: "Staff" },
];

const WIOA_BY_ORG_COLUMNS = [
  { key: "orgName" as const, label: "Organization" },
  { key: "participants" as const, label: "Participants" },
  { key: "employmentQ2" as const, label: "Emp. Q2 %" },
  { key: "employmentQ4" as const, label: "Emp. Q4 %" },
  { key: "credential" as const, label: "Credential %" },
  { key: "msg" as const, label: "MSG %" },
  { key: "retention" as const, label: "Retention %" },
  { key: "medianWage" as const, label: "Median Wage" },
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

export default async function IepReportsPage() {
  await requireRole("super_admin");

  const [
    overview,
    wioa,
    wioaByOrg,
    attendance,
    courseScores,
    wbl,
    employers,
    wioaReport,
    applications,
  ] = await Promise.all([
    getMasterOverview(),
    getWioaOutcomes(null),
    getWioaByOrg(),
    getAttendanceReport(null),
    getCourseScoresReport(null),
    getWblReport(null),
    getEmployerEngagementReport(null),
    getWioaReport(null),
    getOrgApplications(undefined),
  ]);
  const t = overview.totals;
  const subtitle = "IEP Partners — all organizations";

  const rows = overview.orgs.map((r) => ({
    name: r.org.name,
    type: humanize(r.org.type),
    participants: r.participants,
    active: r.active,
    completionRate: r.completionRate,
    placements: r.placements,
    placementRate: r.placementRate,
    paidWorkExperience: r.paidWorkExperience,
    staffCount: r.staffCount,
  }));

  const pdfKpis = [
    { label: "Organizations", value: t.organizations },
    { label: "Total Participants", value: t.participants },
    { label: "Active", value: t.active },
    { label: "Overall Completion Rate", value: `${t.completionRate}%` },
    { label: "Overall Placement Rate", value: `${t.placementRate}%` },
    { label: "Paid Work Experience (participants)", value: t.paidWorkExperience },
    { label: "Staff", value: t.staffCount },
  ];

  // ---- WIOA (overall + per-org) ----
  const wioaByKey = new Map(wioa.indicators.map((i) => [i.key, i]));
  const wioaKpis = wioa.indicators.map((i) => ({
    label: i.label,
    value: i.value ?? `${i.rate}% (${i.numerator}/${i.denominator})`,
  }));
  const wioaOrgRows = wioaByOrg.map((o) => ({
    orgName: o.orgName,
    participants: o.participants,
    employmentQ2: `${o.employmentQ2}%`,
    employmentQ4: `${o.employmentQ4}%`,
    credential: `${o.credential}%`,
    msg: `${o.msg}%`,
    retention: `${o.retention}%`,
    medianWage: o.medianWage != null ? `$${o.medianWage.toFixed(2)}` : "—",
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
        title="Reports"
        subtitle="Cross-organization rollup for the Workplace Reintegration Program."
        actions={
          <>
            <ExportButton
              rows={rows}
              columns={ROLLUP_COLUMNS}
              filename="iep-org-rollup.csv"
              label="Export CSV"
            />
            <PdfButton
              mode="dashboard"
              title="Cross-Organization Rollup Report"
              subtitle={subtitle}
              kpis={pdfKpis}
              rows={{ columns: ROLLUP_COLUMNS as any, data: rows }}
              filename="iep-rollup-report.pdf"
            />
          </>
        }
      />

      {/* Cross-facility WIOA indicator strip */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            WIOA Outcome Indicators — All Facilities
          </h2>
          <p className="text-xs text-muted-foreground">
            Program approximations of the federal WIOA primary indicators across
            every organization. Not state-validated figures.
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

      {/* Per-facility WIOA comparison */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>WIOA Indicators by Facility</CardTitle>
              <CardDescription>
                Cross-facility comparison of the WIOA primary indicator
                approximations
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <PdfButton
                mode="dashboard"
                title="WIOA Indicators by Facility (Program Approximation)"
                subtitle={subtitle}
                kpis={wioaKpis}
                rows={{ columns: WIOA_BY_ORG_COLUMNS as any, data: wioaOrgRows as any }}
                filename="wioa-by-facility.pdf"
                label="PDF"
              />
              <ExportButton
                rows={wioaOrgRows}
                columns={WIOA_BY_ORG_COLUMNS}
                filename="wioa-by-facility.csv"
                label="CSV"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {wioaOrgRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organizations with participant data yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                  <TableHead className="text-right">Emp. Q2 %</TableHead>
                  <TableHead className="text-right">Emp. Q4 %</TableHead>
                  <TableHead className="text-right">Credential %</TableHead>
                  <TableHead className="text-right">MSG %</TableHead>
                  <TableHead className="text-right">Retention %</TableHead>
                  <TableHead className="text-right">Median Wage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wioaByOrg.map((o) => (
                  <TableRow key={o.orgId}>
                    <TableCell className="font-medium text-foreground">
                      {o.orgName}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.participants}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.employmentQ2}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.employmentQ4}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.credential}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.msg}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.retention}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.medianWage != null ? `$${o.medianWage.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization Rollup</CardTitle>
          <CardDescription>
            Participants, completion, placement &amp; paid work experience by site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Completion %</TableHead>
                <TableHead className="text-right">Placements</TableHead>
                <TableHead className="text-right">Placement %</TableHead>
                <TableHead className="text-right">Paid Work Exp.</TableHead>
                <TableHead className="text-right">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.orgs.map((r) => (
                <TableRow key={r.org.id}>
                  <TableCell className="font-medium text-foreground">
                    {r.org.name}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.participants}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.active}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.completionRate}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.placements}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.placementRate}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.paidWorkExperience}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.staffCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Aggregated downloadable reports (all organizations) */}
      <ReportSection title="Outcomes">
        <ReportCard
          icon={<Award className="h-4 w-4" />}
          title="WIOA Outcomes"
          description="Program approximations of the WIOA primary indicators aggregated across all facilities."
          empty={wioaReport.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="WIOA Outcomes — All Facilities (Program Approximation)"
            subtitle={subtitle}
            kpis={wioaKpis}
            rows={{ columns: WIOA_REPORT_COLUMNS as any, data: wioaReport.rows }}
            filename="wioa-outcomes-all.pdf"
            label="PDF"
          />
          <ExportButton
            rows={wioaReport.rows}
            columns={WIOA_REPORT_COLUMNS}
            filename="wioa-outcomes-all.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>

      <ReportSection title="Participation & Learning">
        <ReportCard
          icon={<CalendarCheck className="h-4 w-4" />}
          title="Attendance Report"
          description="Per participant attendance breakdown across every facility."
          empty={attendance.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="Attendance Report — All Facilities"
            subtitle={subtitle}
            kpis={[{ label: "Participants", value: attendance.rows.length }]}
            rows={{ columns: ATTENDANCE_COLUMNS as any, data: attendance.rows }}
            filename="attendance-report-all.pdf"
            label="PDF"
          />
          <ExportButton
            rows={attendance.rows}
            columns={ATTENDANCE_COLUMNS}
            filename="attendance-report-all.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<BookOpen className="h-4 w-4" />}
          title="Course & Quiz Scores"
          description="Per participant learning summary across every facility."
          empty={courseScores.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="Course & Quiz Scores — All Facilities"
            subtitle={subtitle}
            kpis={[{ label: "Participants", value: courseScores.rows.length }]}
            rows={{ columns: COURSE_SCORES_COLUMNS as any, data: courseScores.rows }}
            filename="course-quiz-scores-all.pdf"
            label="PDF"
          />
          <ExportButton
            rows={courseScores.rows}
            columns={COURSE_SCORES_COLUMNS}
            filename="course-quiz-scores-all.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>

      <ReportSection title="Workforce">
        <ReportCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Work-Based Learning"
          description="Every WBL record across all facilities: participant, employer, type, hours, status & dates."
          empty={wbl.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="Work-Based Learning — All Facilities"
            subtitle={subtitle}
            kpis={[{ label: "Records", value: wbl.rows.length }]}
            rows={{ columns: WBL_COLUMNS as any, data: wbl.rows }}
            filename="work-based-learning-all.pdf"
            label="PDF"
          />
          <ExportButton
            rows={wbl.rows}
            columns={WBL_COLUMNS}
            filename="work-based-learning-all.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<Building2 className="h-4 w-4" />}
          title="Employer Engagement"
          description="Employer directory with linked work-based learning and placements."
          empty={employers.rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="Employer Engagement — All Facilities"
            subtitle={subtitle}
            kpis={[{ label: "Employers", value: employers.rows.length }]}
            rows={{ columns: EMPLOYER_COLUMNS as any, data: employers.rows }}
            filename="employer-engagement-all.pdf"
            label="PDF"
          />
          <ExportButton
            rows={employers.rows}
            columns={EMPLOYER_COLUMNS}
            filename="employer-engagement-all.csv"
            label="CSV"
          />
        </ReportCard>

        <ReportCard
          icon={<ClipboardList className="h-4 w-4" />}
          title="Jobs Pipeline"
          description="Every application across all facilities: participant, job, employer, fit & status."
          empty={jobsRows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="Jobs Pipeline — All Facilities"
            subtitle={subtitle}
            kpis={[{ label: "Applications", value: jobsRows.length }]}
            rows={{ columns: JOBS_COLUMNS as any, data: jobsRows as any }}
            filename="jobs-pipeline-all.pdf"
            label="PDF"
          />
          <ExportButton
            rows={jobsRows}
            columns={JOBS_COLUMNS}
            filename="jobs-pipeline-all.csv"
            label="CSV"
          />
        </ReportCard>
      </ReportSection>

      <ReportSection title="Roster">
        <ReportCard
          icon={<FileText className="h-4 w-4" />}
          title="Organization Rollup"
          description="Participants, completion, placement & paid work experience by site."
          empty={rows.length === 0}
        >
          <PdfButton
            mode="dashboard"
            title="Cross-Organization Rollup Report"
            subtitle={subtitle}
            kpis={pdfKpis}
            rows={{ columns: ROLLUP_COLUMNS as any, data: rows }}
            filename="iep-rollup-report.pdf"
            label="PDF"
          />
          <ExportButton
            rows={rows}
            columns={ROLLUP_COLUMNS}
            filename="iep-org-rollup.csv"
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
