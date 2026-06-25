import { requireRole } from "@/lib/auth";
import { getMyOverview } from "@/lib/queries/participant";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressView } from "@/components/participant/progress-view";
import { TierBadge } from "@/components/shared/badges";
import { Card } from "@/components/ui/card";

export const metadata = { title: "My Progress · IEP Partners" };

export default async function MyProgressPage() {
  await requireRole("participant");
  const o = await getMyOverview();
  if (!o) return null;

  return (
    <>
      <PageHeader
        title="My Progress"
        subtitle="Your curriculum modules and completion status."
        actions={<TierBadge tier={o.participant.current_tier} />}
      />
      {o.lessons.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Your curriculum hasn&apos;t been set up yet.
        </Card>
      ) : (
        <ProgressView lessons={o.lessons} />
      )}
    </>
  );
}
