import { requireRole } from "@/lib/auth";
import { getEmployers } from "@/lib/queries/staff";
import { PageHeader } from "@/components/layout/page-header";
import { EmployersManager } from "@/components/staff/employers-manager";
import type { Employer } from "@/types/db";

export const metadata = { title: "Employer Engagement · IEP Partners" };

export default async function EmployersPage() {
  await requireRole(["staff", "admin"]);
  const employers = (await getEmployers()) as Employer[];
  return (
    <>
      <PageHeader
        title="Employer Engagement"
        subtitle="Track partners through the engagement pipeline: prospect → contacted → partner → hiring."
      />
      <EmployersManager employers={employers} />
    </>
  );
}
