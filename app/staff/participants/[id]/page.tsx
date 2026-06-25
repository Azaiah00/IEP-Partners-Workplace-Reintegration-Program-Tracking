import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getParticipantDetail } from "@/lib/queries/staff";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TierBadge, StatusBadge } from "@/components/shared/badges";
import { ParticipantTabs } from "@/components/staff/participant-tabs";
import { initials } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const detail = await getParticipantDetail(params.id);
  return { title: detail ? `${detail.participant.name} · IEP Partners` : "Participant" };
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["staff", "admin"]);
  const detail = await getParticipantDetail(params.id);
  if (!detail) notFound();
  const p = detail.participant;

  return (
    <>
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to caseload
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-1 ring-border">
            <AvatarFallback className="text-base">{initials(p.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {p.participant_code} · {p.region ?? "Unassigned"} · Case manager {p.staffName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier={p.current_tier} />
          <StatusBadge status={p.status} />
        </div>
      </div>

      <ParticipantTabs detail={detail} />
    </>
  );
}
