"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, Circle, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addGoal, setGoalStatus, toggleMilestone } from "@/lib/actions/staff";
import { humanize, cn } from "@/lib/utils";
import type { Goal, Milestone, GoalStatus } from "@/types/db";

const GOAL_STATUSES: GoalStatus[] = ["open", "in_progress", "achieved", "deferred"];
const GOAL_VARIANT: Record<GoalStatus, "muted" | "info" | "success" | "warning"> = {
  open: "muted",
  in_progress: "info",
  achieved: "success",
  deferred: "warning",
};

export function GoalsMilestones({
  participantId,
  goals,
  milestones,
}: {
  participantId: string;
  goals: Goal[];
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const refresh = () => router.refresh();

  function add() {
    if (!title.trim()) return;
    setError(null);
    start(async () => {
      const res = await addGoal(participantId, title, date || null);
      if (!res.ok) setError(res.error);
      else {
        setTitle("");
        setDate("");
        refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Goals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Goals</h3>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a goal…"
            />
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Button onClick={add} disabled={pending} size="sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <ul className="space-y-2">
          {goals.map((g) => (
            <li
              key={g.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{g.title}</p>
                {g.target_date && (
                  <p className="text-xs text-muted-foreground">Target {g.target_date}</p>
                )}
              </div>
              <Select
                value={g.status}
                onValueChange={(v) =>
                  start(async () => {
                    const res = await setGoalStatus(g.id, participantId, v as GoalStatus);
                    if (res.ok) refresh();
                  })
                }
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={GOAL_VARIANT[g.status]}>{humanize(g.status)}</Badge>
            </li>
          ))}
          {goals.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No goals yet.</li>
          )}
        </ul>
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#F5B14C]" />
          <h3 className="text-sm font-semibold">Employment-readiness milestones</h3>
        </div>
        <ul className="space-y-2">
          {milestones.map((m) => {
            const achieved = m.status === "achieved";
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <button
                  onClick={() =>
                    start(async () => {
                      const res = await toggleMilestone(m.id, participantId, !achieved);
                      if (res.ok) refresh();
                    })
                  }
                  disabled={pending}
                  aria-pressed={achieved}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    achieved
                      ? "border-[#5FE08A] bg-[#5FE08A]/20 text-[#5FE08A]"
                      : "border-border text-muted-foreground hover:border-primary/60",
                  )}
                >
                  {achieved ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    achieved ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {m.name}
                </span>
                {achieved && m.achieved_on && (
                  <span className="text-xs text-muted-foreground">{m.achieved_on}</span>
                )}
              </li>
            );
          })}
          {milestones.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No milestones yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
