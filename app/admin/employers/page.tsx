import { requireRole, getMyOrgId } from "@/lib/auth";
import { getEmployers } from "@/lib/queries/staff";
import { getOrganization } from "@/lib/queries/iep";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/admin/export-button";
import { EmployersManager } from "@/components/staff/employers-manager";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Employers · IEP Partners" };

const CSV_COLUMNS = [
  { key: "name" as const, label: "Employer" },
  { key: "industry" as const, label: "Industry" },
  { key: "contact_name" as const, label: "Contact" },
  { key: "contact_email" as const, label: "Email" },
  { key: "region" as const, label: "Region" },
  { key: "stage" as const, label: "Stage" },
];

export default async function AdminEmployersPage() {
  await requireRole("admin");
  const orgId = await getMyOrgId();
  const [employers, org] = await Promise.all([
    getEmployers(),
    orgId ? getOrganization(orgId) : Promise.resolve(null),
  ]);

  const exportRows = employers.map((e) => ({
    name: e.name,
    industry: e.industry ?? "",
    contact_name: e.contact_name ?? "",
    contact_email: e.contact_email ?? "",
    region: e.region ?? "",
    stage: humanize(e.stage),
  }));

  return (
    <>
      <PageHeader
        title="Employers"
        subtitle={
          org
            ? `${org.name} — employer partners through the engagement pipeline: prospect → contacted → partner → hiring.`
            : "Employer partners through the engagement pipeline: prospect → contacted → partner → hiring."
        }
        actions={
          <ExportButton
            rows={exportRows}
            columns={CSV_COLUMNS}
            filename="employers.csv"
            label="Export CSV"
          />
        }
      />
      <EmployersManager employers={employers} />
    </>
  );
}
