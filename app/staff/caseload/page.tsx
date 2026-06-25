import { requireRole } from "@/lib/auth";
import { getCaseload } from "@/lib/queries/staff";
import { PageHeader } from "@/components/layout/page-header";
import { CaseloadTable } from "@/components/staff/caseload-table";

export const metadata = { title: "Caseload · IEP Partners" };

export default async function CaseloadPage() {
  await requireRole(["staff", "admin"]);
  const caseload = await getCaseload();
  return (
    <>
      <PageHeader
        title="Caseload"
        subtitle="All assigned participants — search, filter, and open records."
      />
      <CaseloadTable rows={caseload} />
    </>
  );
}
