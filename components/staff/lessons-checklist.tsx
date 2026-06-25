"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProgressBadge } from "@/components/shared/badges";
import { markLesson } from "@/lib/actions/staff";
import { humanize, cn } from "@/lib/utils";
import type { ProgressStatus, ProgramTier } from "@/types/db";

type Lesson = {
  id: string;
  module_id: string;
  status: string;
  moduleName: string;
  tier: ProgramTier;
};

export function LessonsChecklist({
  participantId,
  lessons,
}: {
  participantId: string;
  lessons: Lesson[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = lessons.filter((l) => l.status === "completed").length;
  const total = lessons.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function toggle(l: Lesson) {
    const next: ProgressStatus = l.status === "completed" ? "in_progress" : "completed";
    setBusyId(l.module_id);
    setError(null);
    start(async () => {
      const res = await markLesson(participantId, l.module_id, next);
      setBusyId(null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const tiers = Array.from(new Set(lessons.map((l) => l.tier)));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {done} of {total} modules complete
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2.5" />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {tiers.map((tier) => (
        <div key={tier} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{humanize(tier)}</Badge>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {lessons
              .filter((l) => l.tier === tier)
              .map((l) => {
                const completed = l.status === "completed";
                const busy = busyId === l.module_id && pending;
                return (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggle(l)}
                      disabled={busy}
                      aria-pressed={completed}
                      aria-label={`Mark ${l.moduleName} ${completed ? "incomplete" : "complete"}`}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : completed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        completed ? "text-muted-foreground line-through" : "text-foreground",
                      )}
                    >
                      {l.moduleName}
                    </span>
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
