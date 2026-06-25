import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProgressBadge } from "@/components/shared/badges";
import { humanize, cn } from "@/lib/utils";
import type { ProgramTier, ProgressStatus } from "@/types/db";

type Lesson = {
  id: string;
  status: string;
  moduleName: string;
  tier: ProgramTier;
  description: string | null;
};

export function ProgressView({ lessons }: { lessons: Lesson[] }) {
  const done = lessons.filter((l) => l.status === "completed").length;
  const total = lessons.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const tiers = Array.from(new Set(lessons.map((l) => l.tier)));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {done} of {total} modules complete
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2.5" />
      </div>

      {tiers.map((tier) => (
        <div key={tier} className="space-y-2">
          <Badge variant="secondary">{humanize(tier)}</Badge>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {lessons
              .filter((l) => l.tier === tier)
              .map((l) => {
                const completed = l.status === "completed";
                return (
                  <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {completed && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          completed ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {l.moduleName}
                      </p>
                      {l.description && (
                        <p className="text-xs text-muted-foreground">{l.description}</p>
                      )}
                    </div>
                    <ProgressBadge status={l.status as ProgressStatus} />
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
