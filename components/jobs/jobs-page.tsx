import { getMyOrgId } from "@/lib/auth";
import {
  getJobBoard,
  getJobFacets,
  getOrgApplications,
  getOpenJobOptions,
  getReadyParticipantsForJob,
} from "@/lib/queries/jobs";
import { PageHeader } from "@/components/layout/page-header";
import { StaffJobsDashboard } from "@/components/jobs/staff-jobs-dashboard";

/**
 * Shared server view for the staff / admin / IEP Jobs surfaces. Loads the full
 * board, the org's application pipeline, and (optionally, via ?job=) the
 * "who's ready" list for a chosen opportunity. Org scoping is resolved from the
 * caller's profile (super_admin / IEP sees all).
 */
export async function JobsPageView({
  searchParams,
  subtitle,
}: {
  searchParams?: { job?: string };
  subtitle?: string;
}) {
  const orgId = (await getMyOrgId()) ?? undefined;

  const [jobs, facets, applications, jobOptions] = await Promise.all([
    getJobBoard(),
    getJobFacets(),
    getOrgApplications(orgId),
    getOpenJobOptions(),
  ]);

  // Default the "who's ready" tab to the first job (or ?job=).
  const selectedJobId = searchParams?.job ?? jobOptions[0]?.id ?? null;
  let readyByDefault = null;
  if (selectedJobId) {
    const { job, participants } = await getReadyParticipantsForJob(
      selectedJobId,
      orgId,
    );
    if (job) {
      readyByDefault = {
        jobId: job.id,
        jobTitle: job.title,
        participants,
      };
    }
  }

  const ready = applications.filter((a) =>
    ["offer", "hired"].includes(a.status),
  ).length;

  return (
    <>
      <PageHeader
        title="Virginia Jobs & Opportunities"
        subtitle={
          subtitle ??
          "Live Virginia opportunities, readiness matching across your caseload, and the application pipeline from match to hire."
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Open opportunities" value={jobs.length} />
        <Kpi label="Active applications" value={applications.length} />
        <Kpi label="Offers / hires" value={ready} accent="#5FE08A" />
        <Kpi
          label="Fair-chance roles"
          value={jobs.filter((j) => j.reentry_friendly).length}
        />
      </div>
      <StaffJobsDashboard
        jobs={jobs}
        regions={facets.regions}
        tracks={facets.tracks}
        applications={applications}
        jobOptions={jobOptions}
        readyByDefault={readyByDefault}
      />
    </>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p
        className="text-2xl font-bold tracking-tight text-foreground"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
