import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getMatchedJobsForParticipant,
  getJobResources,
} from "@/lib/queries/jobs";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { JobMatches } from "@/components/jobs/job-matches";
import { ResourcesSidebar } from "@/components/jobs/resources-sidebar";

export const metadata = { title: "Opportunities · IEP Partners" };

/** Resolve the signed-in user's participant id (RLS-scoped, lightweight). */
async function currentParticipantId(): Promise<string | null> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export default async function OpportunitiesPage() {
  await requireRole("participant");
  const participantId = await currentParticipantId();

  const [matches, resources] = await Promise.all([
    participantId
      ? getMatchedJobsForParticipant(participantId)
      : Promise.resolve([]),
    getJobResources(),
  ]);

  const ready = matches.filter((m) => m.fit.label === "ready").length;
  const almost = matches.filter((m) => m.fit.label === "almost").length;
  const tracked = matches.filter((m) => m.application).length;

  return (
    <>
      <PageHeader
        title="Opportunities"
        subtitle="Virginia jobs matched to your readiness, your completed trades training, and your goals. Fair-chance employers welcome returning citizens."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Ready to apply" value={ready} accent="#5FE08A" />
        <Stat label="Almost ready" value={almost} accent="#F5B14C" />
        <Stat label="Jobs you're tracking" value={tracked} accent="#A8E55F" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Your matched opportunities
          </h2>
          <JobMatches matches={matches} />
        </div>
        <aside>
          <ResourcesSidebar data={resources} />
        </aside>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ color: accent }}
        >
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
