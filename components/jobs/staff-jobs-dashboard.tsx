"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Loader2,
  Users,
  Briefcase,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FitRing } from "@/components/jobs/fit-ring";
import {
  updateApplicationStatus,
  matchParticipantToJob,
} from "@/lib/actions/jobs";
import { FIT_LABEL_TEXT } from "@/lib/matching";
import { humanize } from "@/lib/utils";
import type { JobOpportunity, ApplicationStatus } from "@/types/db";
import type {
  PipelineApplication,
  ReadyParticipant,
} from "@/lib/queries/jobs";

const PIPELINE_ORDER: ApplicationStatus[] = [
  "matched",
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "offer",
  "hired",
  "not_pursued",
];

const STATUS_VARIANT: Record<ApplicationStatus, string> = {
  matched: "muted",
  interested: "info",
  preparing: "info",
  applied: "violet",
  interviewing: "warning",
  offer: "success",
  hired: "success",
  not_pursued: "danger",
};

function wageLabel(min: number | null, max: number | null, unit: string | null) {
  if (min == null && max == null) return "Wage varies";
  const u = unit === "hour" ? "/hr" : unit ? `/${unit}` : "";
  if (min != null && max != null) return `$${min}–$${max}${u}`;
  return `$${min ?? max}${u}`;
}

export function StaffJobsDashboard({
  jobs,
  regions,
  tracks,
  applications,
  jobOptions,
  readyByDefault,
}: {
  jobs: JobOpportunity[];
  regions: string[];
  tracks: string[];
  applications: PipelineApplication[];
  jobOptions: { id: string; label: string; matched_track: string | null }[];
  readyByDefault: {
    jobId: string;
    jobTitle: string;
    participants: ReadyParticipant[];
  } | null;
}) {
  return (
    <Tabs defaultValue="board" className="w-full">
      <TabsList>
        <TabsTrigger value="board">
          <Briefcase className="mr-1.5 h-4 w-4" /> Job Board
        </TabsTrigger>
        <TabsTrigger value="pipeline">
          <Users className="mr-1.5 h-4 w-4" /> Applications Pipeline
        </TabsTrigger>
        <TabsTrigger value="matches">
          <Filter className="mr-1.5 h-4 w-4" /> Who&apos;s Ready
        </TabsTrigger>
      </TabsList>

      <TabsContent value="board">
        <JobBoard jobs={jobs} regions={regions} tracks={tracks} />
      </TabsContent>
      <TabsContent value="pipeline">
        <Pipeline applications={applications} />
      </TabsContent>
      <TabsContent value="matches">
        <MatchesView jobOptions={jobOptions} initial={readyByDefault} />
      </TabsContent>
    </Tabs>
  );
}

// --- Job board ---------------------------------------------------------------
function JobBoard({
  jobs,
  regions,
  tracks,
}: {
  jobs: JobOpportunity[];
  regions: string[];
  tracks: string[];
}) {
  const [region, setRegion] = useState<string>("all");
  const [track, setTrack] = useState<string>("all");
  const [reentry, setReentry] = useState(false);

  const filtered = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (region === "all" || j.region === region) &&
          (track === "all" || j.matched_track === track) &&
          (!reentry || j.reentry_friendly),
      ),
    [jobs, region, track, reentry],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={track} onValueChange={setTrack}>
          <SelectTrigger className="h-9 w-52">
            <SelectValue placeholder="Track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tracks</SelectItem>
            {tracks.map((t) => (
              <SelectItem key={t} value={t}>
                {humanize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={reentry ? "default" : "secondary"}
          size="sm"
          onClick={() => setReentry((v) => !v)}
        >
          <ShieldCheck className="h-4 w-4" /> Fair chance only
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((job) => (
          <Card key={job.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {job.title}
                </h3>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {job.employer}
                </p>
              </div>
              {job.reentry_friendly && (
                <Badge variant="default" className="shrink-0">
                  <ShieldCheck className="h-3 w-3" /> Fair chance
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.region ?? "—"}
              </span>
              <span className="font-medium text-foreground">
                {wageLabel(job.wage_min, job.wage_max, job.wage_unit)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {job.matched_track && (
                <Badge variant="secondary">{humanize(job.matched_track)}</Badge>
              )}
              <Badge variant="secondary">{humanize(job.employment_type)}</Badge>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No opportunities match these filters.
          </Card>
        )}
      </div>
    </div>
  );
}

// --- Pipeline ----------------------------------------------------------------
function Pipeline({ applications }: { applications: PipelineApplication[] }) {
  const grouped = useMemo(() => {
    const g = new Map<ApplicationStatus, PipelineApplication[]>();
    for (const s of PIPELINE_ORDER) g.set(s, []);
    for (const a of applications) g.get(a.status)?.push(a);
    return g;
  }, [applications]);

  if (applications.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No applications yet. Use the &quot;Who&apos;s Ready&quot; tab to match
        participants to opportunities.
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {PIPELINE_ORDER.map((status) => {
        const rows = grouped.get(status) ?? [];
        if (rows.length === 0 && (status === "matched" || status === "not_pursued"))
          return null;
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Badge variant={STATUS_VARIANT[status] as never}>
                {humanize(status)}
              </Badge>
              <span className="text-xs text-muted-foreground">{rows.length}</span>
            </div>
            {rows.map((a) => (
              <PipelineCard key={a.id} app={a} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({ app }: { app: PipelineApplication }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState(app.staff_notes ?? "");
  const [open, setOpen] = useState(false);

  function advance(status: ApplicationStatus) {
    start(async () => {
      const res = await updateApplicationStatus(app.id, status, notes);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/staff/participants/${app.participantId}`}
          className="truncate text-sm font-medium text-foreground hover:text-primary"
        >
          {app.participantName}
        </Link>
        {app.fit_score != null && (
          <span className="shrink-0 text-xs font-semibold text-primary">
            {app.fit_score}
          </span>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">{app.jobTitle}</p>
      <p className="truncate text-xs text-muted-foreground">{app.employer}</p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-xs font-medium text-primary hover:underline"
      >
        {open ? "Hide" : "Manage"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <Select
            value={app.status}
            onValueChange={(v) => advance(v as ApplicationStatus)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Staff notes…"
            className="min-h-[56px] text-xs"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() => advance(app.status)}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save notes"}
          </Button>
        </div>
      )}
    </Card>
  );
}

// --- Matches (who's ready for a job) ----------------------------------------
function MatchesView({
  jobOptions,
  initial,
}: {
  jobOptions: { id: string; label: string; matched_track: string | null }[];
  initial: {
    jobId: string;
    jobTitle: string;
    participants: ReadyParticipant[];
  } | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(
    initial?.jobId ?? jobOptions[0]?.id ?? "",
  );

  // Navigate with a query param so the server reloads the ready list for the job.
  function selectJob(jobId: string) {
    setSelected(jobId);
    router.push(`?job=${jobId}`, { scroll: false });
  }

  const list = initial?.jobId === selected ? initial.participants : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selected} onValueChange={selectJob}>
          <SelectTrigger className="h-9 w-full max-w-md">
            <SelectValue placeholder="Choose an opportunity" />
          </SelectTrigger>
          <SelectContent>
            {jobOptions.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {initial && (
          <span className="text-xs text-muted-foreground">
            {list.length} ready / almost ready
          </span>
        )}
      </div>

      {!initial ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Select an opportunity to see who in your caseload is ready.
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No one in your caseload is ready (60+ fit) for{" "}
          <span className="font-medium text-foreground">{initial.jobTitle}</span>{" "}
          yet.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <ReadyCard key={p.participantId} p={p} jobId={selected} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReadyCard({ p, jobId }: { p: ReadyParticipant; jobId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function match() {
    start(async () => {
      const res = await matchParticipantToJob(p.participantId, jobId, "preparing");
      if (res.ok) router.refresh();
    });
  }

  const variant =
    p.fit.label === "ready" ? "success" : p.fit.label === "almost" ? "warning" : "info";

  return (
    <Card className="flex items-start gap-3 p-4">
      <FitRing score={p.fit.score} label={p.fit.label} size={48} stroke={5} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/staff/participants/${p.participantId}`}
          className="block truncate text-sm font-semibold text-foreground hover:text-primary"
        >
          {p.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {p.code} · {humanize(p.tier)}
        </p>
        <Badge variant={variant as never} className="mt-1.5">
          {FIT_LABEL_TEXT[p.fit.label]}
        </Badge>
        {p.fit.missing.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Needs: {p.fit.missing.slice(0, 2).join(", ")}
          </p>
        )}
        <div className="mt-2">
          {p.applicationStatus ? (
            <Badge variant="secondary">{humanize(p.applicationStatus)}</Badge>
          ) : (
            <Button size="sm" variant="secondary" onClick={match} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start preparing"
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
