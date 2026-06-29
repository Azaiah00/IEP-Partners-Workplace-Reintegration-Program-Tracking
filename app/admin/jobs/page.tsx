import { requireRole } from "@/lib/auth";
import { JobsPageView } from "@/components/jobs/jobs-page";

export const metadata = { title: "Jobs & Opportunities · IEP Partners" };

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: { job?: string };
}) {
  await requireRole("admin");
  return (
    <JobsPageView
      searchParams={searchParams}
      subtitle="Your organization's Virginia opportunity pipeline: open roles, caseload readiness matching, and applications from match to hire."
    />
  );
}
