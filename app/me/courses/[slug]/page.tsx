import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseForParticipant } from "@/lib/queries/courses";
import { startCourse } from "@/lib/actions/courses";
import { CoursePlayer } from "@/components/courses/course-player";
import { TierBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";

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

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const pid = await currentParticipantId();
  if (!pid) return { title: "Course · IEP Partners" };
  const data = await getCourseForParticipant(params.slug, pid);
  return { title: data ? `${data.course.title} · IEP Partners` : "Course" };
}

export default async function CoursePlayerPage({
  params,
}: {
  params: { slug: string };
}) {
  await requireRole("participant");
  const participantId = await currentParticipantId();
  if (!participantId) notFound();

  let data = await getCourseForParticipant(params.slug, participantId);
  if (!data) notFound();

  // Auto-enroll on first visit so progress can be tracked.
  if (!data.progress) {
    await startCourse(data.course.id);
    data = (await getCourseForParticipant(params.slug, participantId)) ?? data;
  }

  const { course } = data;

  return (
    <>
      <Link
        href="/me/courses"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to My Learning
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {course.title}
          </h1>
          {course.description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {course.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {course.tier && <TierBadge tier={course.tier} />}
          {course.is_trade && <Badge variant="violet">Trade</Badge>}
          {course.est_hours != null && (
            <Badge variant="secondary">{course.est_hours} hrs</Badge>
          )}
        </div>
      </div>

      <CoursePlayer data={data} />
    </>
  );
}
