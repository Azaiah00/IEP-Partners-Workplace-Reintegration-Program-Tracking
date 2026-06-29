"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Building2,
  Check,
  Heart,
  Loader2,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FitRing } from "@/components/jobs/fit-ring";
import { trackJob, untrackJob } from "@/lib/actions/jobs";
import { FIT_LABEL_TEXT } from "@/lib/matching";
import { humanize } from "@/lib/utils";
import type { MatchedJob } from "@/lib/queries/jobs";

function wageLabel(min: number | null, max: number | null, unit: string | null) {
  if (min == null && max == null) return "Wage varies";
  const u = unit === "hour" ? "/hr" : unit ? `/${unit}` : "";
  if (min != null && max != null) return `$${min}–$${max}${u}`;
  return `$${min ?? max}${u}`;
}

export function JobMatches({ matches }: { matches: MatchedJob[] }) {
  if (matches.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No open opportunities right now. Check back soon — new Virginia jobs are
        added regularly.
      </Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {matches.map((m) => (
        <JobCard key={m.job.id} match={m} />
      ))}
    </div>
  );
}

function JobCard({ match }: { match: MatchedJob }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { job, fit, application } = match;
  const tracked = !!application;

  function toggle() {
    setError(null);
    start(async () => {
      const res = tracked ? await untrackJob(job.id) : await trackJob(job.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const labelVariant =
    fit.label === "ready" ? "success" : fit.label === "almost" ? "warning" : "info";

  return (
    <Card className="flex flex-col gap-4 p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start gap-4">
        <FitRing score={fit.score} label={fit.label} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={labelVariant}>{FIT_LABEL_TEXT[fit.label]}</Badge>
            {job.reentry_friendly && (
              <Badge variant="default">
                <ShieldCheck className="h-3 w-3" /> Fair chance
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-foreground">
            {job.title}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {job.employer}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.city ? `${job.city}` : ""}
          {job.region ? ` · ${job.region}` : ""}
        </span>
        <span className="font-medium text-foreground">
          {wageLabel(job.wage_min, job.wage_max, job.wage_unit)}
        </span>
        <Badge variant="secondary">{humanize(job.employment_type)}</Badge>
      </div>

      {job.description && (
        <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
      )}

      {fit.label !== "ready" && fit.missing.length > 0 && (
        <div className="rounded-xl border border-border bg-raised/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-[#F5B14C]" /> To get ready
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fit.missing.map((req) => (
              <span
                key={req}
                className="rounded-full bg-[#F5B14C]/10 px-2.5 py-0.5 text-xs text-[#F5B14C]"
              >
                {req}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          onClick={toggle}
          disabled={pending}
          variant={tracked ? "secondary" : "default"}
          size="sm"
          className="flex-1"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : tracked ? (
            <>
              <Check className="h-4 w-4" /> Tracking
              {application?.status ? ` · ${humanize(application.status)}` : ""}
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" /> I&apos;m interested
            </>
          )}
        </Button>
        {job.source_url && (
          <Button asChild variant="ghost" size="sm">
            <a href={job.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> View
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}
