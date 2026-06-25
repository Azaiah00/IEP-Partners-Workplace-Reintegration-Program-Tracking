"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { markAttendance } from "@/lib/actions/staff";
import { humanize, cn } from "@/lib/utils";
import type { AttendanceStatus, Attendance } from "@/types/db";

const OPTIONS: { value: AttendanceStatus; label: string; cls: string }[] = [
  { value: "present", label: "Present", cls: "data-[on=true]:bg-[#5FE08A]/20 data-[on=true]:text-[#5FE08A] data-[on=true]:border-[#5FE08A]/40" },
  { value: "late", label: "Late", cls: "data-[on=true]:bg-[#F5B14C]/20 data-[on=true]:text-[#F5B14C] data-[on=true]:border-[#F5B14C]/40" },
  { value: "excused", label: "Excused", cls: "data-[on=true]:bg-[#5B9DFF]/20 data-[on=true]:text-[#5B9DFF] data-[on=true]:border-[#5B9DFF]/40" },
  { value: "absent", label: "Absent", cls: "data-[on=true]:bg-[#FF6B6B]/20 data-[on=true]:text-[#FF6B6B] data-[on=true]:border-[#FF6B6B]/40" },
];

const BADGE: Record<AttendanceStatus, "success" | "warning" | "info" | "danger"> = {
  present: "success",
  late: "warning",
  excused: "info",
  absent: "danger",
};

export function AttendanceEditor({
  participantId,
  attendance,
}: {
  participantId: string;
  attendance: Attendance[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<AttendanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingForDate = attendance.find((a) => a.session_date === date)?.status;

  function mark(status: AttendanceStatus) {
    setBusy(status);
    setError(null);
    start(async () => {
      const res = await markAttendance(participantId, date, status);
      setBusy(null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="att-date">Session date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                data-on={existingForDate === o.value}
                onClick={() => mark(o.value)}
                disabled={pending}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  o.cls,
                )}
              >
                {busy === o.value && pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {existingForDate && (
          <p className="mt-3 text-xs text-muted-foreground">
            Marked <span className="font-medium text-foreground">{humanize(existingForDate)}</span> for {date}.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-foreground">{a.session_date}</TableCell>
                <TableCell>
                  <Badge variant={BADGE[a.status]}>{humanize(a.status)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.notes ?? "—"}</TableCell>
              </TableRow>
            ))}
            {attendance.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  No attendance recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
