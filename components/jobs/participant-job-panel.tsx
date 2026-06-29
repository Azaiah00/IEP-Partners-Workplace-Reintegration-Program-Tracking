"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ShieldCheck, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FitRing } from "@/components/jobs/fit-ring";
import { setReadiness, type ReadinessFields } from "@/lib/actions/jobs";
import { FIT_LABEL_TEXT } from "@/lib/matching";
import { humanize } from "@/lib/utils";
import type { MatchedJob, PipelineApplication } from "@/lib/queries/jobs";

type Readiness = {
  has_drivers_license: boolean;
  has_cdl: boolean;
  cdl_class: string | null;
  transportation_ok: boolean;
  bonding_eligible: boolean;
};

export function ParticipantJobPanel({
  participantId,
  readiness,
  topMatches,
  applications,
}: {
  participantId: string;
  readiness: Readiness;
  topMatches: MatchedJob[];
  applications: PipelineApplication[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ReadinessCard participantId={participantId} initial={readiness} />
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-primary" /> Top job matches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topMatches.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No open opportunities to match yet.
            </p>
          )}
          {topMatches.map((m) => {
            const variant =
              m.fit.label === "ready"
                ? "success"
                : m.fit.label === "almost"
                  ? "warning"
                  : "info";
            return (
              <div
                key={m.job.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <FitRing score={m.fit.score} label={m.fit.label} size={44} stroke={5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.job.title}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {m.job.employer}
                    {m.job.region ? ` · ${m.job.region}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={variant as never}>{FIT_LABEL_TEXT[m.fit.label]}</Badge>
                  {m.job.reentry_friendly && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <ShieldCheck className="h-3 w-3" /> Fair chance
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {applications.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Active applications
              </p>
              <div className="flex flex-wrap gap-2">
                {applications.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-full border border-border bg-raised/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    {a.jobTitle} · {humanize(a.status)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReadinessCard({
  participantId,
  initial,
}: {
  participantId: string;
  initial: Readiness;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<Readiness>(initial);

  function save(patch: ReadinessFields) {
    const next = { ...state, ...patch } as Readiness;
    setState(next);
    start(async () => {
      const res = await setReadiness(patch, participantId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Job readiness
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Toggle
          label="Driver's license"
          value={state.has_drivers_license}
          onChange={(v) => save({ has_drivers_license: v })}
        />
        <Toggle
          label="Reliable transportation"
          value={state.transportation_ok}
          onChange={(v) => save({ transportation_ok: v })}
        />
        <Toggle
          label="Bonding eligible"
          value={state.bonding_eligible}
          onChange={(v) => save({ bonding_eligible: v })}
        />
        <Toggle
          label="Holds a CDL"
          value={state.has_cdl}
          onChange={(v) => save({ has_cdl: v, cdl_class: v ? state.cdl_class ?? "A" : null })}
        />
        {state.has_cdl && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">CDL class</span>
            <Select
              value={state.cdl_class ?? "A"}
              onValueChange={(v) => save({ cdl_class: v })}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Class A</SelectItem>
                <SelectItem value="B">Class B</SelectItem>
                <SelectItem value="C">Class C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <Button
        type="button"
        size="sm"
        variant={value ? "default" : "secondary"}
        onClick={() => onChange(!value)}
        className="h-7 min-w-[64px] px-3 text-xs"
      >
        {value ? "Yes" : "No"}
      </Button>
    </div>
  );
}
