import { GraduationCap, Trophy, BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressBadge } from "@/components/shared/badges";
import { humanize } from "@/lib/utils";
import type { ParticipantCourseSummary } from "@/lib/queries/courses";
import type { ProgressStatus } from "@/types/db";

const TRACK_LABELS: Record<string, string> = {
  workforce_readiness: "Workforce Readiness",
  emotional_readiness: "Emotional Readiness",
  digital: "Digital",
  trades: "Trades",
};

/** Staff/admin read-only view of a participant's LMS progress + quiz scores. */
export function ParticipantCoursesSummary({
  summary,
}: {
  summary: ParticipantCourseSummary;
}) {
  if (summary.enrolled === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        This participant hasn&apos;t enrolled in any courses yet.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={<BookOpen className="h-4 w-4" />} label="Enrolled" value={summary.enrolled} />
        <MiniStat
          icon={<GraduationCap className="h-4 w-4" />}
          label="Completed"
          value={summary.completed}
        />
        <MiniStat
          icon={<Trophy className="h-4 w-4" />}
          label="Quizzes Passed"
          value={summary.quizzesPassed}
        />
        <MiniStat
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Avg Quiz Score"
          value={summary.avgQuizScore != null ? `${summary.avgQuizScore}%` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course progress &amp; quiz scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.courses.map((c) => (
            <div
              key={c.courseId}
              className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                  {c.isTrade && <Badge variant="violet">Trade</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {TRACK_LABELS[c.track] ?? humanize(c.track)}
                </p>
                <div className="mt-1.5 max-w-xs">
                  <Progress value={c.completionPct} className="h-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ProgressBadge status={c.status as ProgressStatus} />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Best quiz</p>
                  <p className="text-sm font-semibold text-foreground">
                    {c.bestQuizScore != null ? (
                      <span className={c.quizPassed ? "text-[#5FE08A]" : "text-[#F5B14C]"}>
                        {c.bestQuizScore}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-raised">
          {icon}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </Card>
  );
}
