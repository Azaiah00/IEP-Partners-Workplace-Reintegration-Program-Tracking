"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveOutcome } from "@/lib/actions/staff";
import { humanize } from "@/lib/utils";
import type { Outcome, EmploymentStatus } from "@/types/db";

const STATUSES: EmploymentStatus[] = [
  "unemployed",
  "searching",
  "placed",
  "retained_30",
  "retained_90",
  "retained_180",
];

export function OutcomeForm({
  participantId,
  outcome,
  employers,
}: {
  participantId: string;
  outcome: Outcome | null;
  employers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<EmploymentStatus>(outcome?.employment_status ?? "unemployed");
  const [employerId, setEmployerId] = useState(outcome?.employer_id ?? "");
  const [jobTitle, setJobTitle] = useState(outcome?.job_title ?? "");
  const [wage, setWage] = useState(outcome?.hourly_wage?.toString() ?? "");
  const [placementDate, setPlacementDate] = useState(outcome?.placement_date ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveOutcome({
        outcomeId: outcome?.id,
        participantId,
        employment_status: status,
        employerId: employerId || "",
        job_title: jobTitle || undefined,
        hourly_wage: wage ? Number(wage) : null,
        placement_date: placementDate || undefined,
      });
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: "Outcome saved." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Employment status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as EmploymentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.startsWith("retained")
                    ? `Retained ${s.split("_")[1]}d`
                    : humanize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Employer</Label>
          <Select value={employerId || "none"} onValueChange={(v) => setEmployerId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select employer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {employers.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job">Job title</Label>
          <Input id="job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Warehouse Associate" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wage">Hourly wage</Label>
            <Input id="wage" type="number" step="0.25" value={wage} onChange={(e) => setWage(e.target.value)} placeholder="18.50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdate">Placement date</Label>
            <Input id="pdate" type="date" value={placementDate} onChange={(e) => setPlacementDate(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} size="sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save outcome
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
