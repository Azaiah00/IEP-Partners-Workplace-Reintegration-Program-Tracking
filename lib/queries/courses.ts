import { createClient } from "@/lib/supabase/server";
import { getMyOrgId } from "@/lib/auth";
import type {
  Course,
  Lesson,
  Quiz,
  QuizQuestion,
  CourseProgress,
  ProgressStatus,
} from "@/types/db";

/** Catalog card with this participant's progress overlay (if any). */
export type CatalogCourse = Course & {
  status: ProgressStatus;
  completion_pct: number;
};

/** Every active course, ordered by track then sequence (the catalog). */
export async function getCourseCatalog(participantId?: string): Promise<CatalogCourse[]> {
  const sb = createClient();
  const coursesRes = await sb
    .from("courses")
    .select("*")
    .eq("is_active", true)
    .order("track")
    .order("sequence");
  const courses = (coursesRes.data ?? []) as Course[];

  let progress: { course_id: string; status: ProgressStatus; completion_pct: number }[] = [];
  if (participantId) {
    const progRes = await sb
      .from("course_progress")
      .select("course_id, status, completion_pct")
      .eq("participant_id", participantId);
    progress = (progRes.data ?? []) as typeof progress;
  }
  const byCourse = new Map(progress.map((p) => [p.course_id, p]));

  return courses.map((c) => {
    const p = byCourse.get(c.id);
    return {
      ...c,
      status: (p?.status ?? "not_started") as ProgressStatus,
      completion_pct: p?.completion_pct ?? 0,
    };
  });
}

export type CourseLessonView = Lesson & { completed: boolean };

export type CoursePlayerData = {
  course: Course;
  lessons: CourseLessonView[];
  quiz: (Quiz & { questions: QuizQuestion[] }) | null;
  progress: CourseProgress | null;
  latestAttempt: {
    id: string;
    score: number;
    passed: boolean;
    taken_at: string;
  } | null;
};

/**
 * Full course player payload for one participant: the course, its ordered
 * lessons (with this participant's completion overlay), the quiz + questions,
 * the course_progress row, and the participant's latest quiz attempt.
 *
 * The quiz questions include correct_index/explanation — this is fine because
 * RLS already exposes them to any signed-in user, and the client quiz runner
 * intentionally never reveals them before submission.
 */
export async function getCourseForParticipant(
  slug: string,
  participantId: string,
): Promise<CoursePlayerData | null> {
  const sb = createClient();

  const courseRes = await sb
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!courseRes.data) return null;
  const course = courseRes.data as Course;

  const [lessonsRes, quizRes, lessonProgRes, courseProgRes] = await Promise.all([
    sb.from("lessons").select("*").eq("course_id", course.id).order("sequence"),
    sb.from("quizzes").select("*").eq("course_id", course.id).maybeSingle(),
    sb
      .from("course_lesson_progress")
      .select("lesson_id, status")
      .eq("participant_id", participantId),
    sb
      .from("course_progress")
      .select("*")
      .eq("participant_id", participantId)
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  const lessonRows = (lessonsRes.data ?? []) as Lesson[];
  const doneLessons = new Set(
    ((lessonProgRes.data ?? []) as { lesson_id: string; status: ProgressStatus }[])
      .filter((r) => r.status === "completed")
      .map((r) => r.lesson_id),
  );
  const lessons: CourseLessonView[] = lessonRows.map((l) => ({
    ...l,
    completed: doneLessons.has(l.id),
  }));

  let quiz: (Quiz & { questions: QuizQuestion[] }) | null = null;
  let latestAttempt: CoursePlayerData["latestAttempt"] = null;
  if (quizRes.data) {
    const q = quizRes.data as Quiz;
    const questionsRes = await sb
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", q.id)
      .order("sequence");
    quiz = { ...q, questions: (questionsRes.data ?? []) as QuizQuestion[] };

    const attemptRes = await sb
      .from("quiz_attempts")
      .select("id, score, passed, taken_at")
      .eq("participant_id", participantId)
      .eq("quiz_id", q.id)
      .order("taken_at", { ascending: false })
      .limit(1);
    latestAttempt = ((attemptRes.data ?? [])[0] ?? null) as typeof latestAttempt;
  }

  return {
    course,
    lessons,
    quiz,
    progress: (courseProgRes.data ?? null) as CourseProgress | null,
    latestAttempt,
  };
}

export type MyCourseRow = {
  course: Course;
  status: ProgressStatus;
  completion_pct: number;
  started_at: string | null;
  completed_at: string | null;
};

/** course_progress rows joined to courses, for the "My Learning" overview. */
export async function getParticipantCourses(
  participantId: string,
): Promise<MyCourseRow[]> {
  const sb = createClient();
  const res = await sb
    .from("course_progress")
    .select("status, completion_pct, started_at, completed_at, course:courses(*)")
    .eq("participant_id", participantId)
    .order("updated_at", { ascending: false });

  return ((res.data ?? []) as any[])
    .map((r) => {
      const course = (Array.isArray(r.course) ? r.course[0] : r.course) as Course | null;
      if (!course) return null;
      return {
        course,
        status: r.status as ProgressStatus,
        completion_pct: r.completion_pct as number,
        started_at: r.started_at as string | null,
        completed_at: r.completed_at as string | null,
      };
    })
    .filter((r): r is MyCourseRow => r !== null);
}

export type ParticipantCourseSummary = {
  enrolled: number;
  completed: number;
  avgQuizScore: number | null;
  quizzesPassed: number;
  courses: {
    courseId: string;
    title: string;
    track: string;
    isTrade: boolean;
    status: ProgressStatus;
    completionPct: number;
    bestQuizScore: number | null;
    quizPassed: boolean;
  }[];
};

/**
 * Per-participant learning summary for staff/admin views: enrollment/completion
 * counts, average quiz score, count of courses with a passing quiz, and a
 * per-course breakdown with the participant's best quiz score.
 */
export async function getParticipantCourseSummary(
  participantId: string,
): Promise<ParticipantCourseSummary> {
  const sb = createClient();

  const [progressRes, quizzesRes, attemptsRes] = await Promise.all([
    sb
      .from("course_progress")
      .select("course_id, status, completion_pct, course:courses(id, title, track, is_trade)")
      .eq("participant_id", participantId),
    sb.from("quizzes").select("id, course_id"),
    sb
      .from("quiz_attempts")
      .select("quiz_id, score, passed")
      .eq("participant_id", participantId),
  ]);

  const progress = (progressRes.data ?? []) as any[];
  const quizzes = (quizzesRes.data ?? []) as { id: string; course_id: string }[];
  const attempts = (attemptsRes.data ?? []) as {
    quiz_id: string;
    score: number;
    passed: boolean;
  }[];

  // Map course -> quiz id, and quiz -> best attempt.
  const quizByCourse = new Map(quizzes.map((q) => [q.course_id, q.id]));
  const bestByQuiz = new Map<string, { score: number; passed: boolean }>();
  for (const a of attempts) {
    const prev = bestByQuiz.get(a.quiz_id);
    if (!prev || a.score > prev.score) {
      bestByQuiz.set(a.quiz_id, { score: a.score, passed: a.passed || (prev?.passed ?? false) });
    } else if (a.passed) {
      bestByQuiz.set(a.quiz_id, { ...prev, passed: true });
    }
  }

  const courses = progress.map((p) => {
    const course = (Array.isArray(p.course) ? p.course[0] : p.course) as {
      id: string;
      title: string;
      track: string;
      is_trade: boolean;
    } | null;
    const quizId = course ? quizByCourse.get(course.id) : undefined;
    const best = quizId ? bestByQuiz.get(quizId) : undefined;
    return {
      courseId: course?.id ?? p.course_id,
      title: course?.title ?? "Course",
      track: course?.track ?? "",
      isTrade: course?.is_trade ?? false,
      status: p.status as ProgressStatus,
      completionPct: p.completion_pct as number,
      bestQuizScore: best?.score ?? null,
      quizPassed: best?.passed ?? false,
    };
  });

  const enrolled = courses.length;
  const completed = courses.filter((c) => c.status === "completed").length;
  const scored = courses
    .map((c) => c.bestQuizScore)
    .filter((s): s is number => s != null);
  const avgQuizScore = scored.length
    ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
    : null;
  const quizzesPassed = courses.filter((c) => c.quizPassed).length;

  return { enrolled, completed, avgQuizScore, quizzesPassed, courses };
}

export type OrgLearningSummary = {
  enrollments: number;
  coursesCompleted: number;
  avgCompletion: number;
  quizzesPassed: number;
  avgQuizScore: number | null;
};

/**
 * Lightweight org-wide learning KPIs for the admin dashboard. Scoped to the
 * org's participants when orgId is provided (super_admin / unscoped sees all).
 */
export async function getOrgLearningSummary(
  orgId?: string,
): Promise<OrgLearningSummary> {
  const sb = createClient();

  let partIds: string[] | null = null;
  if (orgId) {
    const partsRes = await sb
      .from("participants")
      .select("id")
      .eq("organization_id", orgId);
    partIds = ((partsRes.data ?? []) as { id: string }[]).map((p) => p.id);
    if (partIds.length === 0) {
      return {
        enrollments: 0,
        coursesCompleted: 0,
        avgCompletion: 0,
        quizzesPassed: 0,
        avgQuizScore: null,
      };
    }
  }

  let progressQuery = sb
    .from("course_progress")
    .select("participant_id, status, completion_pct");
  let attemptsQuery = sb
    .from("quiz_attempts")
    .select("participant_id, score, passed");
  if (partIds) {
    progressQuery = progressQuery.in("participant_id", partIds);
    attemptsQuery = attemptsQuery.in("participant_id", partIds);
  }

  const [progressRes, attemptsRes] = await Promise.all([
    progressQuery,
    attemptsQuery,
  ]);
  const progress = (progressRes.data ?? []) as {
    status: ProgressStatus;
    completion_pct: number;
  }[];
  const attempts = (attemptsRes.data ?? []) as { score: number; passed: boolean }[];

  const enrollments = progress.length;
  const coursesCompleted = progress.filter((p) => p.status === "completed").length;
  const avgCompletion = enrollments
    ? Math.round(progress.reduce((a, p) => a + p.completion_pct, 0) / enrollments)
    : 0;
  const quizzesPassed = attempts.filter((a) => a.passed).length;
  const avgQuizScore = attempts.length
    ? Math.round(attempts.reduce((a, x) => a + x.score, 0) / attempts.length)
    : null;

  return { enrollments, coursesCompleted, avgCompletion, quizzesPassed, avgQuizScore };
}

/** Convenience for the admin page (resolves org scoping like the dashboard). */
export async function getOrgLearningSummaryForCurrentUser(): Promise<OrgLearningSummary> {
  const orgId = await getMyOrgId();
  return getOrgLearningSummary(orgId ?? undefined);
}
