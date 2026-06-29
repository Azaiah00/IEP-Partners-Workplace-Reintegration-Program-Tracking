import { Users } from "lucide-react";
import { requireRole, getMyOrgId } from "@/lib/auth";
import { getOrgRoster } from "@/lib/queries/admin";
import { getOrganization } from "@/lib/queries/iep";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/states";
import { ExportButton } from "@/components/admin/export-button";
import { PdfButton } from "@/components/reports/pdf-button";
import { RosterTable } from "@/components/admin/roster-table";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Participants · IEP Partners" };

const CSV_COLUMNS = [
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

export default async function AdminParticipantsPage() {
  await requireRole("admin");
  const orgId = await getMyOrgId();
  const [roster, org] = await Promise.all([
    getOrgRoster(orgId ?? undefined),
    orgId ? getOrganization(orgId) : Promise.resolve(null),
  ]);

  // Flattened, human-readable rows for CSV + PDF export.
  const exportRows = roster.map((r) => ({
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

  return (
    <>
      <PageHeader
        title="Participants"
        subtitle={
          org
            ? `${org.name} — full participant roster with curriculum, course & attendance progress.`
            : "Full participant roster across all organizations."
        }
        actions={
          <>
            <ExportButton
              rows={exportRows}
              columns={CSV_COLUMNS}
              filename="participant-roster.csv"
              label="Export CSV"
            />
            <PdfButton
              mode="dashboard"
              title={org ? `${org.name} — Participant Roster` : "Participant Roster"}
              subtitle={
                org
                  ? `${org.county ?? ""}${org.county ? ", " : ""}${org.state ?? ""}`.trim() ||
                    undefined
                  : undefined
              }
              kpis={[
                { label: "Total Participants", value: roster.length },
                {
                  label: "Active",
                  value: roster.filter((r) => r.status === "active").length,
                },
                {
                  label: "At Risk",
                  value: roster.filter((r) => r.atRisk).length,
                },
              ]}
              rows={{ columns: CSV_COLUMNS as any, data: exportRows as any }}
              filename="participant-roster.pdf"
            />
          </>
        }
      />

      {roster.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No participants yet"
          description="When participants are enrolled in this organization's program, they'll appear here with their curriculum, course and attendance progress."
        />
      ) : (
        <RosterTable rows={roster} />
      )}
    </>
  );
}
