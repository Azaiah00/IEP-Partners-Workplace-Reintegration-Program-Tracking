import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseCatalog } from "@/lib/queries/courses";
import { PageHeader } from "@/components/layout/page-header";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { Card } from "@/components/ui/card";

export const metadata = { title: "My Learning · IEP Partners" };

/** Resolve the signed-in user's participant id (RLS-scoped, lightweight). */
async function currentParticipantId(): Promise<string | null> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export default async function MyLearningPage() {
  await requireRole("participant");
  const participantId = await currentParticipantId();
  const courses = await getCourseCatalog(participantId ?? undefined);

  const started = courses.filter((c) => c.status !== "not_started").length;

  return (
    <>
      <PageHeader
        title="My Learning"
        subtitle="Self-paced courses across workforce readiness, emotional readiness, digital skills, and the trades."
      />
      {courses.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No courses are available yet. Check back soon.
        </Card>
      ) : (
        <>
          {started > 0 && (
            <p className="text-sm text-muted-foreground">
              You&apos;re enrolled in{" "}
              <span className="font-semibold text-foreground">{started}</span>{" "}
              {started === 1 ? "course" : "courses"}.
            </p>
          )}
          <CourseCatalog courses={courses} />
        </>
      )}
    </>
  );
}
