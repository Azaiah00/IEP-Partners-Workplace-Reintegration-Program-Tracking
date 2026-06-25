import { Check, Circle, Target, Trophy, Briefcase } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMyOverview } from "@/lib/queries/participant";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanize, cn } from "@/lib/utils";
import type { GoalStatus } from "@/types/db";

export const metadata = { title: "Goals & Milestones · IEP Partners" };

const GOAL_VARIANT: Record<GoalStatus, "muted" | "info" | "success" | "warning"> = {
  open: "muted",
  in_progress: "info",
  achieved: "success",
  deferred: "warning",
};

export default async function MyGoalsPage() {
  await requireRole("participant");
  const o = await getMyOverview();
  if (!o) return null;

  return (
    <>
      <PageHeader
        title="Goals & Milestones"
        subtitle="Your personal goals, readiness milestones, and work-based learning."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle>My Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {o.goals.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{g.title}</p>
                  {g.target_date && (
                    <p className="text-xs text-muted-foreground">Target {g.target_date}</p>
                  )}
                </div>
                <Badge variant={GOAL_VARIANT[g.status]}>{humanize(g.status)}</Badge>
              </div>
            ))}
            {o.goals.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No goals set yet. Your case manager will help you set goals.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Trophy className="h-4 w-4 text-[#F5B14C]" />
            <CardTitle>Readiness Milestones</CardTitle>
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

      {o.interests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Career Interests</CardTitle>
            <CardDescription>From your Career Interest Inventory</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {o.interests.map((i) => (
              <Badge key={i.id} variant="secondary">
                {i.rank}. {i.interest}
                {i.riasec_or_sector ? ` · ${i.riasec_or_sector}` : ""}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Briefcase className="h-4 w-4 text-[#5B9DFF]" />
          <CardTitle>Job Shadow / Work-Based Learning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {o.wbl.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{humanize(w.type)}</p>
                <p className="text-xs text-muted-foreground">
                  {w.start_date ?? "—"}
                  {w.end_date ? ` → ${w.end_date}` : ""} · {w.hours} hrs
                </p>
              </div>
              <Badge variant={w.status === "completed" ? "success" : "info"}>
                {humanize(w.status ?? "—")}
              </Badge>
            </div>
          ))}
          {o.wbl.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No work-based learning activities yet.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
