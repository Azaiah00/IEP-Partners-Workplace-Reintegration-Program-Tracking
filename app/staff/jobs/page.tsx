import { requireRole } from "@/lib/auth";
import { JobsPageView } from "@/components/jobs/jobs-page";

export const metadata = { title: "Jobs & Opportunities · IEP Partners" };

export default async function StaffJobsPage({
  searchParams,
}: {
  searchParams?: { job?: string };
}) {
  await requireRole(["staff", "admin"]);
  return <JobsPageView searchParams={searchParams} />;
}
