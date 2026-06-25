"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { addWbl } from "@/lib/actions/staff";
import { humanize } from "@/lib/utils";
import type { WblType } from "@/types/db";

const TYPES: WblType[] = ["job_shadow", "work_based_learning", "paid_work_experience"];

type WblRow = {
  id: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
  hours: number;
  status: string | null;
  employerName: string;
};

export function WblPanel({
  participantId,
  rows,
  employers,
}: {
  participantId: string;
  rows: WblRow[];
  employers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [type, setType] = useState<WblType>("job_shadow");
  const [employerId, setEmployerId] = useState("");
  const [start, setStart] = useState("");
  const [hours, setHours] = useState("");
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startT(async () => {
      const res = await addWbl({
        participantId,
        employerId: employerId || "",
        type,
        start_date: start || undefined,
        hours: hours ? Number(hours) : 0,
      });
      if (!res.ok) setError(res.error);
      else {
        setEmployerId("");
        setStart("");
        setHours("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.7fr_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as WblType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {humanize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Employer</Label>
          <Select value={employerId || "none"} onValueChange={(v) => setEmployerId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
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
          <Label htmlFor="wbl-start">Start date</Label>
          <Input id="wbl-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wbl-hours">Hours</Label>
          <Input id="wbl-hours" type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" />
        </div>
        <Button onClick={add} disabled={pending} size="sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Log
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Type</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium text-foreground">{humanize(w.type)}</TableCell>
                <TableCell className="text-muted-foreground">{w.employerName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {w.start_date ?? "—"}
                  {w.end_date ? ` → ${w.end_date}` : ""}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{w.hours}</TableCell>
                <TableCell>
                  <Badge variant={w.status === "completed" ? "success" : "info"}>
                    {humanize(w.status ?? "—")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No work-based learning logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
