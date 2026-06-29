"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Circle,
  BookOpen,
  PlayCircle,
  Sparkles,
  Trophy,
  ArrowRight,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { TradeSimulation } from "@/components/courses/trade-simulation";
import { QuizRunner } from "@/components/courses/quiz-runner";
import { completeLesson } from "@/lib/actions/courses";
import { cn } from "@/lib/utils";
import type { CoursePlayerData } from "@/lib/queries/courses";
import type { LessonKind } from "@/types/db";

const KIND_ICON: Record<LessonKind, typeof BookOpen> = {
  reading: BookOpen,
  simulation: Sparkles,
  video: PlayCircle,
  quiz: Trophy,
};

export function CoursePlayer({ data }: { data: CoursePlayerData }) {
  const router = useRouter();
  const { course, lessons, quiz, latestAttempt } = data;

  // "quiz" is a synthetic final step appended after the lessons.
  const totalSteps = lessons.length + (quiz ? 1 : 0);
  const firstIncomplete = lessons.findIndex((l) => !l.completed);
  const [active, setActive] = React.useState(
    firstIncomplete === -1 ? (quiz ? lessons.length : Math.max(0, lessons.length - 1)) : firstIncomplete,
  );
  const [pending, setPending] = React.useState(false);

  const doneCount = lessons.filter((l) => l.completed).length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  const isQuizStep = quiz != null && active === lessons.length;
  const lesson = isQuizStep ? null : lessons[active];

  async function markComplete() {
    if (!lesson) return;
    setPending(true);
    const res = await completeLesson(lesson.id, course.id, course.slug);
    setPending(false);
    if (res.ok) {
      router.refresh();
      // Advance to the next step.
      setActive((a) => Math.min(a + 1, totalSteps - 1));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* ---- Sidebar: lesson list ---- */}
      <aside className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Course progress</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {doneCount} of {lessons.length} lessons complete
          </p>
        </div>

        <nav className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {lessons.map((l, i) => {
              const Icon = KIND_ICON[l.kind];
              const isActive = i === active;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                      isActive ? "bg-primary/10" : "hover:bg-raised/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        l.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {l.completed ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          isActive ? "text-foreground" : l.completed ? "text-muted-foreground" : "text-foreground/90",
                        )}
                      >
                        {l.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {l.kind === "simulation" ? "Simulation" : l.kind === "video" ? "Video" : "Reading"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {quiz && (
              <li>
                <button
                  onClick={() => setActive(lessons.length)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                    isQuizStep ? "bg-primary/10" : "hover:bg-raised/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      latestAttempt?.passed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {latestAttempt?.passed ? <Check className="h-3.5 w-3.5" /> : <Trophy className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-medium", isQuizStep ? "text-foreground" : "text-foreground/90")}>
                      {quiz.title}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {latestAttempt
                        ? `Best score ${latestAttempt.score}%`
                        : course.track === "emotional_readiness"
                          ? "Self-reflection"
                          : `Quiz · ${quiz.questions.length} questions`}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* ---- Main: lesson content / quiz ---- */}
      <div className="min-w-0">
        {isQuizStep && quiz ? (
          <div className="space-y-4">
            <Header
              eyebrow={course.track === "emotional_readiness" ? "Self-Reflection" : "Knowledge Check"}
              title={quiz.title}
            />
            <QuizRunner
              quizId={quiz.id}
              courseId={course.id}
              courseSlug={course.slug}
              title={quiz.title}
              passScore={quiz.pass_score}
              questions={quiz.questions}
              track={course.track}
              previousScore={latestAttempt?.score ?? null}
            />
          </div>
        ) : lesson ? (
          <div className="space-y-5">
            <Header
              eyebrow={`Lesson ${active + 1} of ${lessons.length}`}
              title={lesson.title}
              badge={lesson.completed ? <Badge variant="success">Completed</Badge> : undefined}
            />

            {lesson.kind === "simulation" ? (
              <div className="space-y-4">
                {lesson.content && <LessonMarkdown content={lesson.content} />}
                <TradeSimulation simType={lesson.sim_type} inspiration={lesson.sim_inspiration} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6">
                {lesson.content ? (
                  <LessonMarkdown content={lesson.content} />
                ) : (
                  <p className="text-sm text-muted-foreground">No content for this lesson yet.</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={markComplete} disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : lesson.completed ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {active < totalSteps - 1
                  ? lesson.completed
                    ? "Next"
                    : "Mark complete & continue"
                  : lesson.completed
                    ? "Finish"
                    : "Mark complete"}
              </Button>
              {active > 0 && (
                <Button variant="ghost" onClick={() => setActive((a) => a - 1)}>
                  Previous
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            <Lock className="mx-auto mb-2 h-5 w-5" />
            This course has no lessons yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Header({
  eyebrow,
  title,
  badge,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-primary">{eyebrow}</p>
      <div className="mt-1 flex items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {badge}
      </div>
    </div>
  );
}
