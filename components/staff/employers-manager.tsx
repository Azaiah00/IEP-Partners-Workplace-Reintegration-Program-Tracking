"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Building2 } from "lucide-react";
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
import { addEmployer, setEmployerStage } from "@/lib/actions/staff";
import { humanize } from "@/lib/utils";
import type { Employer, EmployerStage } from "@/types/db";

const STAGES: EmployerStage[] = ["prospect", "contacted", "partner", "hiring", "inactive"];
const STAGE_DOT: Record<EmployerStage, string> = {
  prospect: "bg-muted-foreground",
  contacted: "bg-[#5B9DFF]",
  partner: "bg-primary",
  hiring: "bg-[#5FE08A]",
  inactive: "bg-[#FF6B6B]",
};

export function EmployersManager({ employers }: { employers: Employer[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddEmployerDialog />
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Employer</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="w-44">Stage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employers.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-raised text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">{e.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{e.industry ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {e.contact_name ?? "—"}
                  {e.contact_email ? (
                    <span className="block text-xs">{e.contact_email}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{e.region ?? "—"}</TableCell>
                <TableCell>
                  <Select
                    value={e.stage}
                    onValueChange={(v) =>
                      start(async () => {
                        const res = await setEmployerStage(e.id, v as EmployerStage);
                        if (res.ok) router.refresh();
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STAGE_DOT[e.stage]}`} />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {humanize(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {employers.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No employers yet. Add your first partner.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pending && (
        <p className="text-xs text-muted-foreground">Saving…</p>
      )}
    </div>
  );
}

function AddEmployerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    contact_name: "",
    contact_email: "",
    region: "",
    stage: "prospect" as EmployerStage,
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setError(null);
    start(async () => {
      const res = await addEmployer(form);
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        setForm({ name: "", industry: "", contact_name: "", contact_email: "", region: "", stage: "prospect" });
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add employer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add employer</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          </Field>
          <Field label="Contact name">
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </Field>
          <Field label="Contact email">
            <Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
          </Field>
          <Field label="Region">
            <Input value={form.region} onChange={(e) => set("region", e.target.value)} />
          </Field>
          <Field label="Stage">
            <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending || !form.name.trim()} size="sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add employer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
