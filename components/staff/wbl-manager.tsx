"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
  participantName: string;
  employerName: string;
};

export function WblManager({
  rows,
  participants,
  employers,
}: {
  rows: WblRow[];
  participants: { id: string; label: string }[];
  employers: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddWblDialog participants={participants} employers={employers} />
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Participant</TableHead>
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
                <TableCell className="font-medium text-foreground">{w.participantName}</TableCell>
                <TableCell className="text-muted-foreground">{humanize(w.type)}</TableCell>
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
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
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

function AddWblDialog({
  participants,
  employers,
}: {
  participants: { id: string; label: string }[];
  employers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [type, setType] = useState<WblType>("job_shadow");
  const [startDate, setStartDate] = useState("");
  const [hours, setHours] = useState("");

  function submit() {
    if (!participantId) {
      setError("Select a participant.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await addWbl({
        participantId,
        employerId: employerId || "",
        type,
        start_date: startDate || undefined,
        hours: hours ? Number(hours) : 0,
      });
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        setParticipantId("");
        setEmployerId("");
        setStartDate("");
        setHours("");
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Log WBL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log work-based learning</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Participant *</Label>
            <Select value={participantId} onValueChange={setParticipantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
              <Label htmlFor="w-start">Start date</Label>
              <Input id="w-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-hours">Hours</Label>
              <Input id="w-hours" type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending} size="sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
