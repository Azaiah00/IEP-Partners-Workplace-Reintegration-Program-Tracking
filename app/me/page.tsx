import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  GraduationCap,
  Trophy,
  Layers,
  Check,
  Circle,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { requireRole, firstName } from "@/lib/auth";
import { getMyOverview } from "@/lib/queries/participant";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RadialProgress } from "@/components/dashboard/radial-progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TierBadge, StatusBadge } from "@/components/shared/badges";
import { humanize, cn } from "@/lib/utils";

export const metadata = { title: "My Dashboard · IEP Partners" };

export default async function ParticipantDashboard() {
  const profile = await requireRole("participant");
  const o = await getMyOverview();

  if (!o) {
    return (
      <>
        <GreetingHeader firstName={firstName(profile.full_name)} />
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Your participant record isn&apos;t set up yet. Please contact your case
            manager.
          </p>
        </Card>
      </>
    );
  }

  const p = o.participant;
  const modulesDone = o.lessons.filter((l) => l.status === "completed").length;
  const milestonesDone = o.milestones.filter((m) => m.status === "achieved").length;
  const wblHours = o.wbl.reduce((s, w) => s + w.hours, 0);

  return (
    <>
      <GreetingHeader
        firstName={firstName(p.name)}
        subtitle="Track your progress through the Workplace Reintegration Program."
        actions={
          <div className="flex items-center gap-2">
            <TierBadge tier={p.current_tier} />
            <StatusBadge status={p.status} />
          </div>
        }
      />

      {/* Spotlight + stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="spotlight-card border-0 lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-xs font-medium uppercase tracking-wide text-[#5a5440]">
              Overall completion
            </span>
            <RadialProgress value={o.completion} color="#5FA346" size={150} />
            <p className="text-sm text-[#4a4536]">
              You&apos;ve completed{" "}
              <span className="font-semibold text-[#1a1c22]">{modulesDone}</span> of{" "}
              {o.lessons.length} modules in your pathway.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard label="Current Tier" value={humanize(p.current_tier)} subLabel="Active pathway" icon={<Layers className="h-4 w-4" />} />
          <StatCard label="Modules Complete" value={`${modulesDone}/${o.lessons.length}`} subLabel="Curriculum progress" icon={<GraduationCap className="h-4 w-4" />} />
          <StatCard label="Milestones" value={`${milestonesDone}/${o.milestones.length}`} subLabel="Readiness milestones" icon={<Trophy className="h-4 w-4" />} />
          <StatCard label="WBL Hours" value={wblHours} subLabel="Work-based learning" icon={<Briefcase className="h-4 w-4" />} />
        </div>
      </div>

      {/* Profile + milestones */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Your program details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Fact label="Participant code" value={p.participant_code} />
            <Fact label="Case manager" value={p.staffName} />
            <Fact label="Region" value={p.region ?? "—"} />
            <Fact label="Intake date" value={format(parseISO(p.intake_date), "MMM d, yyyy")} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>Your employment-readiness journey</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/me/goals">
                View goals <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-1 border-l border-border pl-5">
              {o.milestones.map((m) => {
                const achieved = m.status === "achieved";
                return (
                  <li key={m.id} className="relative py-2">
                    <span
                      className={cn(
                        "absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border",
                        achieved
                          ? "border-[#5FE08A] bg-[#5FE08A]/20 text-[#5FE08A]"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {achieved ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm", achieved ? "text-foreground" : "text-muted-foreground")}>
                        {m.name}
                      </span>
                      {achieved && m.achieved_on && (
                        <span className="text-xs text-muted-foreground">{m.achieved_on}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Assessments + progress CTA */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assessments</CardTitle>
            <CardDescription>Workforce readiness &amp; career interest</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {o.assessments.map((a) => (
              <div key={a.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="info">{humanize(a.type)}</Badge>
                  {a.score != null && (
                    <span className="text-xl font-bold text-foreground">{a.score}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{a.summary}</p>
              </div>
            ))}
            {o.assessments.length === 0 && (
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Keep going</CardTitle>
            <CardDescription>Continue your curriculum</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/me/progress">
                View my progress <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
