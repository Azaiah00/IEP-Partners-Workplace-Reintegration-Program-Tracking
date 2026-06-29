import { requireRole } from "@/lib/auth";
import { JobsPageView } from "@/components/jobs/jobs-page";

export const metadata = { title: "Opportunities · IEP Partners" };

export default async function IepJobsPage({
  searchParams,
}: {
  searchParams?: { job?: string };
}) {
  await requireRole("super_admin");
  return (
    <JobsPageView
      searchParams={searchParams}
      subtitle="Network-wide Virginia opportunities, readiness matching, and the application pipeline across every partner organization."
    />
  );
}
