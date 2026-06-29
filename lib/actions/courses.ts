"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

export type QuizResult = {
  ok: true;
  score: number;
  passed: boolean;
  results: {
    questionId: string;
    correct: boolean;
    correctIndex: number;
    explanation: string | null;
  }[];
};

type CourseProgressInsert = Database["public"]["Tables"]["course_progress"]["Insert"];
type LessonProgressInsert =
  Database["public"]["Tables"]["course_lesson_progress"]["Insert"];
type QuizAttemptInsert = Database["public"]["Tables"]["quiz_attempts"]["Insert"];

/** Resolve the signed-in user's participant row (RLS-scoped). */
async function myParticipantId() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await sb
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const row = data as { id: string } | null;
  if (!row) throw new Error("No participant record for this account");
  return { participantId: row.id, sb };
}

function revalidateCourse(slug?: string | null) {
  revalidatePath("/me");
  revalidatePath("/me/courses");
  if (slug) revalidatePath(`/me/courses/${slug}`);
}

/**
 * Recompute course_progress for a participant: completion_pct from completed
 * lessons / total lessons, and status. A course is `completed` only when every
 * lesson is done AND (the course has no quiz OR the quiz has a passing attempt).
 */
async function recomputeCourseProgress(
  sb: ReturnType<typeof createClient>,
  participantId: string,
  courseId: string,
) {
  const [lessonsRes, doneRes, quizRes] = await Promise.all([
    sb.from("lessons").select("id").eq("course_id", courseId),
    sb
      .from("course_lesson_progress")
      .select("lesson_id, status, lesson:lessons!inner(course_id)")
      .eq("participant_id", participantId)
      .eq("status", "completed"),
    sb.from("quizzes").select("id").eq("course_id", courseId).maybeSingle(),
  ]);

  const lessonIds = new Set(
    ((lessonsRes.data ?? []) as { id: string }[]).map((l) => l.id),
  );
  const total = lessonIds.size;
  const doneRows = (doneRes.data ?? []) as { lesson_id: string }[];
  const done = doneRows.filter((r) => lessonIds.has(r.lesson_id)).length;
  const completionPct = total ? Math.round((done / total) * 100) : 0;

  let quizPassed = true; // no quiz => nothing to gate on
  const quiz = quizRes.data as { id: string } | null;
  if (quiz) {
    const passRes = await sb
      .from("quiz_attempts")
      .select("id")
      .eq("participant_id", participantId)
      .eq("quiz_id", quiz.id)
      .eq("passed", true)
      .limit(1);
    quizPassed = ((passRes.data ?? []) as unknown[]).length > 0;
  }

  const allLessonsDone = total > 0 && done >= total;
  const status: Database["public"]["Enums"]["progress_status"] =
    allLessonsDone && quizPassed
      ? "completed"
      : done > 0
        ? "in_progress"
        : "in_progress";

  const payload: CourseProgressInsert = {
    participant_id: participantId,
    course_id: courseId,
    status,
    completion_pct: completionPct,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
  await sb
    .from("course_progress")
    .upsert(payload, { onConflict: "participant_id,course_id" });

  return { status, completionPct };
}

/** Enroll / start a course for the current participant. */
export async function startCourse(courseId: string): Promise<Result> {
  try {
    const { participantId, sb } = await myParticipantId();
    // Upsert without clobbering an existing in-progress/completed row's status.
    const existing = await sb
      .from("course_progress")
      .select("id, status, started_at")
      .eq("participant_id", participantId)
      .eq("course_id", courseId)
      .maybeSingle();
    const row = existing.data as { id: string; status: string; started_at: string | null } | null;

    if (!row) {
      const payload: CourseProgressInsert = {
        participant_id: participantId,
        course_id: courseId,
        status: "in_progress",
        completion_pct: 0,
        started_at: new Date().toISOString(),
      };
      const { error } = await sb.from("course_progress").insert(payload);
      if (error) throw error;
    } else if (row.status === "not_started") {
      const { error } = await sb
        .from("course_progress")
        .update({ status: "in_progress", started_at: row.started_at ?? new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    }
    revalidateCourse();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start course" };
  }
}

/** Mark a lesson complete, then recompute the owning course's progress. */
export async function completeLesson(
  lessonId: string,
  courseId: string,
  slug?: string,
): Promise<Result> {
  try {
    const { participantId, sb } = await myParticipantId();
    const payload: LessonProgressInsert = {
      participant_id: participantId,
      lesson_id: lessonId,
      status: "completed",
      completed_at: new Date().toISOString(),
    };
    const { error } = await sb
      .from("course_lesson_progress")
      .upsert(payload, { onConflict: "participant_id,lesson_id" });
    if (error) throw error;

    // Make sure a course_progress row exists, then recompute.
    await sb
      .from("course_progress")
      .upsert(
        {
          participant_id: participantId,
          course_id: courseId,
          status: "in_progress",
          started_at: new Date().toISOString(),
        } as CourseProgressInsert,
        { onConflict: "participant_id,course_id", ignoreDuplicates: true },
      );
    await recomputeCourseProgress(sb, participantId, courseId);

    revalidateCourse(slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save progress" };
  }
}

/**
 * Grade and record a quiz attempt. Loads the questions server-side (so the
 * client never needs the correct answers ahead of time), computes the score,
 * stores the attempt, recomputes course progress, and returns per-question
 * feedback for the runner to display.
 */
export async function submitQuiz(
  quizId: string,
  courseId: string,
  answers: number[],
  slug?: string,
): Promise<QuizResult | { ok: false; error: string }> {
  try {
    const { participantId, sb } = await myParticipantId();

    const [quizRes, questionsRes] = await Promise.all([
      sb.from("quizzes").select("id, pass_score").eq("id", quizId).maybeSingle(),
      sb
        .from("quiz_questions")
        .select("id, sequence, correct_index, explanation")
        .eq("quiz_id", quizId)
        .order("sequence"),
    ]);
    const quiz = quizRes.data as { id: string; pass_score: number } | null;
    if (!quiz) throw new Error("Quiz not found");
    const questions = (questionsRes.data ?? []) as {
      id: string;
      sequence: number;
      correct_index: number;
      explanation: string | null;
    }[];

    const total = questions.length;
    let correct = 0;
    const results = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct_index;
      if (isCorrect) correct += 1;
      return {
        questionId: q.id,
        correct: isCorrect,
        correctIndex: q.correct_index,
        explanation: q.explanation,
      };
    });

    const score = total ? Math.round((correct / total) * 100) : 0;
    const passed = score >= quiz.pass_score;

    const attempt: QuizAttemptInsert = {
      participant_id: participantId,
      quiz_id: quizId,
      score,
      passed,
      answers: answers as unknown as Database["public"]["Tables"]["quiz_attempts"]["Insert"]["answers"],
    };
    const { error } = await sb.from("quiz_attempts").insert(attempt);
    if (error) throw error;

    // Ensure course_progress exists then recompute (passing the quiz may flip
    // the course to completed when all lessons are also done).
    await sb
      .from("course_progress")
      .upsert(
        {
          participant_id: participantId,
          course_id: courseId,
          status: "in_progress",
          started_at: new Date().toISOString(),
        } as CourseProgressInsert,
        { onConflict: "participant_id,course_id", ignoreDuplicates: true },
      );
    await recomputeCourseProgress(sb, participantId, courseId);

    revalidateCourse(slug);
    return { ok: true, score, passed, results };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not submit quiz" };
  }
}
