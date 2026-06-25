"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TierBadge } from "@/components/shared/badges";
import { markAttendance } from "@/lib/actions/staff";
import { initials, cn } from "@/lib/utils";
import type { AttendanceStatus, ProgramTier } from "@/types/db";

type RosterItem = {
  id: string;
  code: string;
  name: string;
  tier: ProgramTier;
  status: string | null;
};

const OPTS: { value: AttendanceStatus; label: string; on: string }[] = [
  { value: "present", label: "P", on: "bg-[#5FE08A]/20 text-[#5FE08A] border-[#5FE08A]/40" },
  { value: "late", label: "L", on: "bg-[#F5B14C]/20 text-[#F5B14C] border-[#F5B14C]/40" },
  { value: "excused", label: "E", on: "bg-[#5B9DFF]/20 text-[#5B9DFF] border-[#5B9DFF]/40" },
  { value: "absent", label: "A", on: "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/40" },
];

export function AttendanceRoster({
  date,
  rows,
}: {
  date: string;
  rows: RosterItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  // local optimistic overlay of marks set this session
  const [marks, setMarks] = useState<Record<string, string>>(
    Object.fromEntries(rows.filter((r) => r.status).map((r) => [r.id, r.status as string])),
  );

  function changeDate(d: string) {
    router.push(`/staff/attendance?date=${d}`);
  }

  function mark(id: string, status: AttendanceStatus) {
    setBusy(id + status);
    start(async () => {
      const res = await markAttendance(id, date, status);
      setBusy(null);
      if (res.ok) {
        setMarks((m) => ({ ...m, [id]: status }));
        router.refresh();
      }
    });
  }

  function markAllPresent() {
    start(async () => {
      for (const r of rows) {
        if (marks[r.id]) continue;
        await markAttendance(r.id, date, "present");
        setMarks((m) => ({ ...m, [r.id]: "present" }));
      }
      router.refresh();
    });
  }

  const markedCount = rows.filter((r) => marks[r.id]).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="roster-date">Session date</Label>
          <Input
            id="roster-date"
            type="date"
            value={date}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => changeDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {markedCount} of {rows.length} marked
          </span>
          <Button onClick={markAllPresent} disabled={pending} variant="secondary" size="sm" className="w-full sm:w-auto">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mark remaining present
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback>{initials(r.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.code}</p>
              </div>
              <TierBadge tier={r.tier} />
            </div>
            <div className="flex shrink-0 gap-1.5 self-end sm:self-center">
              {OPTS.map((o) => {
                const active = marks[r.id] === o.value;
                const isBusy = busy === r.id + o.value && pending;
                return (
                  <button
                    key={o.value}
                    onClick={() => mark(r.id, o.value)}
                    disabled={pending}
                    title={o.value}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                      active
                        ? o.on
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No active participants to take attendance for.
          </p>
        )}
      </div>
    </div>
  );
}
