import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, getMyOrgId } from "@/lib/auth";
import { getParticipantDetail } from "@/lib/queries/staff";
import { getParticipantCourseSummary } from "@/lib/queries/courses";
import {
  getTopMatchesForParticipant,
  getApplicationsForParticipant,
} from "@/lib/queries/jobs";
import { ParticipantJobPanel } from "@/components/jobs/participant-job-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TierBadge, StatusBadge } from "@/components/shared/badges";
import { ParticipantTabs } from "@/components/staff/participant-tabs";
import { PdfButton } from "@/components/reports/pdf-button";
import { initials, humanize } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const detail = await getParticipantDetail(params.id);
  return {
    title: detail ? `${detail.participant.name} · IEP Partners` : "Participant",
  };
}

export default async function AdminParticipantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("admin");
  const orgId = await getMyOrgId();
  const detail = await getParticipantDetail(params.id);

  // Org guard: org admins may only view participants in their own organization.
  // super_admin (orgId === null) may view any participant.
  if (!detail) redirect("/admin/participants");
  if (orgId && detail.participant.organization_id !== orgId) {
    redirect("/admin/participants");
  }

  const p = detail.participant;
  const courseSummary = await getParticipantCourseSummary(params.id);
  const [topMatches, jobApplications] = await Promise.all([
    getTopMatchesForParticipant(params.id, 3),
    getApplicationsForParticipant(params.id),
  ]);

  // Curriculum completion from lesson progress (mirrors caseload calc).
  const totalLessons = detail.lessons.length;
  const doneLessons = detail.lessons.filter((l) => l.status === "completed").length;
  const completion = totalLessons
    ? Math.round((doneLessons / totalLessons) * 100)
    : 0;

  const reportData = {
    code: p.participant_code,
    name: p.name,
    tier: humanize(p.current_tier),
    status: humanize(p.status),
    region: p.region ?? "Unassigned",
    staffName: p.staffName,
    intakeDate: p.intake_date,
    completion,
    goals: detail.goals.map((g) => ({
      title: g.title,
      status: humanize(g.status),
    })),
    milestones: detail.milestones.map((m) => ({
      name: m.name,
      status: humanize(m.status),
    })),
    outcome: detail.outcome
      ? {
          status: humanize(detail.outcome.employment_status),
          jobTitle: detail.outcome.job_title,
          wage: detail.outcome.hourly_wage,
        }
      : null,
    courses: {
      enrolled: courseSummary.enrolled,
      completed: courseSummary.completed,
      quizzesPassed: courseSummary.quizzesPassed,
      avgQuizScore: courseSummary.avgQuizScore,
      rows: courseSummary.courses.map((c) => ({
        title: c.title,
        status: humanize(c.status),
        completion: c.completionPct,
        bestQuizScore: c.bestQuizScore,
      })),
    },
  };

  return (
    <>
      <Link
        href="/admin/participants"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to participants
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
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={p.current_tier} />
          <StatusBadge status={p.status} />
          <PdfButton
            mode="participant"
            data={reportData}
            subtitle={`${p.participant_code} · ${p.region ?? "Unassigned"}`}
            label="Download PDF"
          />
        </div>
      </div>

      <ParticipantTabs detail={detail} courseSummary={courseSummary} />

      <ParticipantJobPanel
        participantId={p.id}
        readiness={{
          has_drivers_license: p.has_drivers_license,
          has_cdl: p.has_cdl,
          cdl_class: p.cdl_class,
          transportation_ok: p.transportation_ok,
          bonding_eligible: p.bonding_eligible,
        }}
        topMatches={topMatches}
        applications={jobApplications}
      />
    </>
  );
}
