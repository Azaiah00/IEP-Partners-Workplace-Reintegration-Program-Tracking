import { BookOpen, GraduationCap, Layers, Trophy } from "lucide-react";
import { requireRole, getMyOrgId } from "@/lib/auth";
import { getOrgCurriculumOverview } from "@/lib/queries/admin";
import { getOrganization } from "@/lib/queries/iep";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/states";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Curriculum · IEP Partners" };

export default async function AdminCurriculumPage() {
  await requireRole("admin");
  const orgId = await getMyOrgId();
  const [overview, org] = await Promise.all([
    getOrgCurriculumOverview(orgId ?? undefined),
    orgId ? getOrganization(orgId) : Promise.resolve(null),
  ]);
  const t = overview.totals;

  return (
    <>
      <PageHeader
        title="Curriculum"
        subtitle={
          org
            ? `${org.name} — the 3-tier program curriculum and course catalog with this organization's progress.`
            : "The 3-tier program curriculum and course catalog with program-wide progress."
        }
      />

      {/* Headline curriculum KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Module Completion"
          value={`${t.moduleCompletion}%`}
          subLabel="Across all curriculum modules"
          icon={<Layers className="h-4 w-4" />}
        />
        <StatCard
          label="Course Enrollments"
          value={t.courseEnrollments}
          subLabel="LMS catalog enrollments"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Avg Course Completion"
          value={`${t.avgCourseCompletion}%`}
          subLabel="Across all enrollments"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Quizzes Passed"
          value={t.quizzesPassed}
          subLabel="Passing quiz attempts"
          icon={<Trophy className="h-4 w-4" />}
        />
      </div>

      {/* 3-tier program curriculum */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Program Curriculum</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {overview.tiers.map((tier) => (
            <Card key={tier.tier} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-sm">{tier.label}</CardTitle>
                <CardDescription>
                  {tier.modules.length} module{tier.modules.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {tier.modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modules defined.</p>
                ) : (
                  tier.modules.map((m) => (
                    <div key={m.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {m.name}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {m.completion}%
                        </span>
                      </div>
                      <Progress value={m.completion} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {m.completed} of {m.enrolled} participants completed
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Course catalog by track */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Course Catalog</h2>
        {overview.tracks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses in the catalog"
            description="When the learning catalog is published, courses will appear here grouped by track with enrollment and completion stats."
          />
        ) : (
          <div className="space-y-6">
            {overview.tracks.map((track) => (
              <div key={track.track} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {track.label}
                  </h3>
                  <Badge variant="muted">{track.courses.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {track.courses.map((c) => (
                    <Card key={c.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm leading-snug">
                            {c.title}
                          </CardTitle>
                          {c.isTrade && <Badge variant="violet">Trade</Badge>}
                        </div>
                        <CardDescription>
                          {c.estHours != null ? `${c.estHours} hrs · ` : ""}
                          {c.enrolled} enrolled
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress value={c.avgCompletion} className="h-2 flex-1" />
                          <span className="w-9 text-right text-xs font-medium text-foreground">
                            {c.avgCompletion}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{c.completed} completed</span>
                          <span>·</span>
                          <span>{c.quizzesPassed} quizzes passed</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
