"use client";

import { format, parseISO } from "date-fns";
import { FileText, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LessonsChecklist } from "@/components/staff/lessons-checklist";
import { AttendanceEditor } from "@/components/staff/attendance-editor";
import { CaseNotesPanel } from "@/components/staff/case-notes-panel";
import { TransitionPlanForm } from "@/components/staff/transition-plan-form";
import { GoalsMilestones } from "@/components/staff/goals-milestones";
import { OutcomeForm } from "@/components/staff/outcome-form";
import { WblPanel } from "@/components/staff/wbl-panel";
import { humanize } from "@/lib/utils";
import type { ParticipantDetail } from "@/lib/queries/staff";

const TABS = [
  "Overview",
  "Attendance",
  "Lessons",
  "Assessments",
  "Case Notes",
  "Transition Plan",
  "Goals & Milestones",
  "Documents",
  "WBL",
  "Outcome",
] as const;

export function ParticipantTabs({ detail }: { detail: ParticipantDetail }) {
  const p = detail.participant;

  return (
    <Tabs defaultValue="Overview" className="w-full">
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Overview */}
      <TabsContent value="Overview">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Fact label="Participant code" value={p.participant_code} />
              <Fact label="Assigned staff" value={p.staffName} />
              <Fact label="Referral source" value={p.referral_source ?? "—"} />
              <Fact label="Region" value={p.region ?? "—"} />
              <Fact label="Phone" value={p.phone ?? "—"} />
              <Fact
                label="Date of birth"
                value={p.date_of_birth ? format(parseISO(p.date_of_birth), "MMM d, yyyy") : "—"}
              />
              <Fact label="Intake date" value={format(parseISO(p.intake_date), "MMM d, yyyy")} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Enrollment history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.enrollments.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{humanize(e.tier)}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.start_date} {e.target_end_date ? `→ ${e.target_end_date}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {Math.round(e.completion_pct)}%
                    </span>
                    <Badge variant={e.status === "completed" ? "success" : "info"}>
                      {humanize(e.status)}
                    </Badge>
                  </div>
                </div>
              ))}
              {detail.enrollments.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No enrollments.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="Attendance">
        <AttendanceEditor participantId={p.id} attendance={detail.attendance} />
      </TabsContent>

      <TabsContent value="Lessons">
        <LessonsChecklist participantId={p.id} lessons={detail.lessons} />
      </TabsContent>

      {/* Assessments */}
      <TabsContent value="Assessments">
        <div className="grid gap-4 md:grid-cols-2">
          {detail.assessments.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="info">{humanize(a.type)}</Badge>
                  {a.score != null && (
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {a.score}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{a.summary}</p>
                <p className="text-xs text-muted-foreground">Taken {a.taken_on}</p>
              </CardContent>
            </Card>
          ))}
          {detail.assessments.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No assessments recorded.</p>
          )}
          {detail.interests.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Career Interest Inventory</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {detail.interests.map((i) => (
                  <Badge key={i.id} variant="secondary">
                    {i.rank}. {i.interest}
                    {i.riasec_or_sector ? ` · ${i.riasec_or_sector}` : ""}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="Case Notes">
        <CaseNotesPanel participantId={p.id} notes={detail.caseNotes} />
      </TabsContent>

      <TabsContent value="Transition Plan">
        <TransitionPlanForm participantId={p.id} plan={detail.transitionPlan} />
      </TabsContent>

      <TabsContent value="Goals & Milestones">
        <GoalsMilestones
          participantId={p.id}
          goals={detail.goals}
          milestones={detail.milestones}
        />
      </TabsContent>

      {/* Documents (read view; participants upload from their own portal) */}
      <TabsContent value="Documents">
        <div className="space-y-2">
          {detail.documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-raised text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">{humanize(d.type)} · {d.created_at.slice(0, 10)}</p>
              </div>
              <Badge variant={d.storage_path ? "success" : "muted"}>
                {d.storage_path ? (
                  <>
                    <Download className="h-3 w-3" /> File
                  </>
                ) : (
                  "Metadata only"
                )}
              </Badge>
            </div>
          ))}
          {detail.documents.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No documents on file.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="WBL">
        <WblPanel participantId={p.id} rows={detail.wbl} employers={detail.employers} />
      </TabsContent>

      <TabsContent value="Outcome">
        <OutcomeForm participantId={p.id} outcome={detail.outcome} employers={detail.employers} />
      </TabsContent>
    </Tabs>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
