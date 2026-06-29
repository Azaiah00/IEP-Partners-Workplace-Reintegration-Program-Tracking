import { BookOpen, GraduationCap, Trophy, CheckCircle2 } from "lucide-react";
import { requireRole, firstName, getMyOrgId } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries/admin";
import { getOrgLearningSummary } from "@/lib/queries/courses";
import { getOrganization } from "@/lib/queries/iep";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExportButton } from "@/components/admin/export-button";
import { PdfButton } from "@/components/reports/pdf-button";

export const metadata = { title: "Admin Dashboard · IEP Partners" };

const ROSTER_COLUMNS = [
  { key: "code" as const, label: "Participant Code" },
  { key: "name" as const, label: "Name" },
  { key: "tier" as const, label: "Tier" },
  { key: "status" as const, label: "Status" },
  { key: "region" as const, label: "Region" },
  { key: "completion" as const, label: "Completion %" },
  { key: "intake" as const, label: "Intake Date" },
];

export default async function AdminDashboard() {
  const profile = await requireRole("admin");
  // Org admins are scoped to their own org. (super_admin reaching /admin sees
  // all orgs since getMyOrgId() returns null for them.)
  const orgId = await getMyOrgId();
  const [d, org, learning] = await Promise.all([
    getAdminDashboard(orgId ?? undefined),
    orgId ? getOrganization(orgId) : Promise.resolve(null),
    getOrgLearningSummary(orgId ?? undefined),
  ]);
  const k = d.kpis;

  const pdfKpis = [
    { label: "Total Enrolled", value: k.total },
    { label: "Active", value: k.active },
    { label: "Completion Rate", value: `${k.completionRate}%` },
    { label: "Placement Rate", value: `${k.placementRate}%` },
    { label: "90-Day Retention", value: `${k.retention90}%` },
    { label: "At Risk", value: k.atRisk },
    { label: "Paid Work Experience (participants)", value: k.paidWorkParticipants },
    { label: "Paid Work Hours", value: k.paidWorkHours },
    { label: "Program Health", value: `${k.programHealth} (${k.programHealthLabel})` },
  ];

  const reportName = org ? `${org.name} — Program Report` : "Program Report";

  return (
    <>
      <GreetingHeader
        firstName={firstName(profile.full_name)}
        subtitle={
          org
            ? `${org.name} — Workplace Reintegration Program.`
            : "Organization-wide view of the Workplace Reintegration Program."
        }
        actions={
          <>
            <ExportButton
              rows={d.roster}
              columns={ROSTER_COLUMNS}
              filename="iep-participants.csv"
              label="Export roster"
            />
            <PdfButton
              mode="dashboard"
              title={reportName}
              subtitle={org ? `${org.city ?? ""}${org.city ? ", " : ""}${org.state ?? ""}`.trim() || undefined : undefined}
              kpis={pdfKpis}
              rows={{ columns: ROSTER_COLUMNS as any, data: d.roster as any }}
              filename="iep-admin-report.pdf"
            />
          </>
        }
      />

      <AdminDashboardView d={d} />

      {/* Learning (Courses LMS) KPIs */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Learning</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Course Enrollments"
            value={learning.enrollments}
            subLabel={`${learning.coursesCompleted} completed`}
            icon={<BookOpen className="h-4 w-4" />}
          />
          <StatCard
            label="Avg Course Completion"
            value={`${learning.avgCompletion}%`}
            subLabel="Across all enrollments"
            icon={<GraduationCap className="h-4 w-4" />}
          />
          <StatCard
            label="Quizzes Passed"
            value={learning.quizzesPassed}
            subLabel="Passing quiz attempts"
            icon={<Trophy className="h-4 w-4" />}
          />
          <StatCard
            label="Avg Quiz Score"
            value={learning.avgQuizScore != null ? `${learning.avgQuizScore}%` : "—"}
            subLabel="All attempts"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>
      </div>
    </>
  );
}
