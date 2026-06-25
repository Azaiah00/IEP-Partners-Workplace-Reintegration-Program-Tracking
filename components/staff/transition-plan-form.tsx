"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveTransitionPlan } from "@/lib/actions/staff";
import type { TransitionPlan } from "@/types/db";

const toLines = (arr: string[]) => arr.join("\n");
const fromLines = (s: string) =>
  s.split("\n").map((x) => x.trim()).filter(Boolean);

export function TransitionPlanForm({
  participantId,
  plan,
}: {
  participantId: string;
  plan: TransitionPlan | null;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(plan?.summary ?? "");
  const [target, setTarget] = useState(plan?.target_career ?? "");
  const [barriers, setBarriers] = useState(toLines(plan?.barriers ?? []));
  const [support, setSupport] = useState(toLines(plan?.support_services ?? []));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveTransitionPlan({
        participantId,
        summary,
        target_career: target,
        barriers: fromLines(barriers),
        support_services: fromLines(support),
      });
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: "Transition plan saved." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="tp-summary">Plan summary</Label>
        <Textarea
          id="tp-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Individualized transition plan overview…"
          className="min-h-[96px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tp-target">Target career</Label>
        <Input
          id="tp-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g. Skilled Trades / Construction"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tp-barriers">Barriers (one per line)</Label>
          <Textarea
            id="tp-barriers"
            value={barriers}
            onChange={(e) => setBarriers(e.target.value)}
            placeholder={"Transportation\nHousing instability"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tp-support">Support services (one per line)</Label>
          <Textarea
            id="tp-support"
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            placeholder={"Bus pass assistance\nLegal aid clinic"}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} size="sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save plan
        </Button>
        {msg && (
          <span className={msg.ok ? "text-xs text-[#5FE08A]" : "text-xs text-destructive"}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
