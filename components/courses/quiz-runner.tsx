"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitQuiz, type QuizResult } from "@/lib/actions/courses";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/db";

type Question = Pick<QuizQuestion, "id" | "prompt" | "options" | "sequence">;

/**
 * Client quiz runner. Renders questions as a list, the learner selects one
 * option each, and Submit grades server-side (so correct answers are never
 * present in the client before submission). For the Emotional Intelligence
 * course (track === "emotional_readiness") the framing softens to a gentle
 * "self-reflection check".
 */
export function QuizRunner({
  quizId,
  courseId,
  courseSlug,
  title,
  passScore,
  questions,
  track,
  previousScore,
}: {
  quizId: string;
  courseId: string;
  courseSlug: string;
  title: string;
  passScore: number;
  questions: Question[];
  track: string;
  previousScore?: number | null;
}) {
  const router = useRouter();
  const reflection = track === "emotional_readiness";
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [result, setResult] = React.useState<QuizResult | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sorted = [...questions].sort((a, b) => a.sequence - b.sequence);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === sorted.length;

  async function onSubmit() {
    setError(null);
    setPending(true);
    const ordered = sorted.map((_, i) => answers[i] ?? -1);
    const res = await submitQuiz(quizId, courseId, ordered, courseSlug);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res);
    router.refresh();
  }

  function retake() {
    setAnswers({});
    setResult(null);
    setError(null);
  }

  // ---- Results view -------------------------------------------------------
  if (result) {
    const resultsBySeq = new Map(result.results.map((r) => [r.questionId, r]));
    return (
      <div className="space-y-5">
        <ScoreBanner
          score={result.score}
          passed={result.passed}
          passScore={passScore}
          reflection={reflection}
        />
        <ol className="space-y-3">
          {sorted.map((q, i) => {
            const r = resultsBySeq.get(q.id);
            const chosen = answers[i];
            return (
              <li
                key={q.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-2">
                  {r?.correct ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5FE08A]" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B6B]" />
                  )}
                  <p className="text-sm font-medium text-foreground">{q.prompt}</p>
                </div>
                <div className="mt-3 space-y-1.5 pl-6">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === r?.correctIndex;
                    const isChosen = oi === chosen;
                    return (
                      <div
                        key={oi}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm",
                          isCorrect
                            ? "bg-[#5FE08A]/12 text-[#5FE08A]"
                            : isChosen
                              ? "bg-[#FF6B6B]/12 text-[#FF6B6B]"
                              : "text-muted-foreground",
                        )}
                      >
                        {opt}
                        {isCorrect && " ✓"}
                        {isChosen && !isCorrect && " (your answer)"}
                      </div>
                    );
                  })}
                </div>
                {r?.explanation && (
                  <p className="mt-3 pl-6 text-xs text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                    {r.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <Button variant="secondary" onClick={retake}>
          <RotateCcw className="h-4 w-4" />
          {reflection ? "Reflect again" : "Retake quiz"}
        </Button>
      </div>
    );
  }

  // ---- Question list ------------------------------------------------------
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{title}</span>
          <span className="text-muted-foreground">
            {answeredCount} of {sorted.length} answered
          </span>
        </div>
        <Progress value={(answeredCount / sorted.length) * 100} className="h-2" />
        {reflection ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This is a gentle self-reflection check — there are no wrong answers.
            Choose the response that feels most true for you.
          </p>
        ) : previousScore != null ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Your best score so far: <span className="font-semibold">{previousScore}%</span>{" "}
            (passing is {passScore}%).
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Passing score is {passScore}%.
          </p>
        )}
      </div>

      <ol className="space-y-4">
        {sorted.map((q, i) => (
          <li key={q.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              <span className="mr-2 text-muted-foreground">{i + 1}.</span>
              {q.prompt}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt, oi) => {
                const selected = answers[i] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded-xl bg-[#FF6B6B]/12 px-4 py-2.5 text-sm text-[#FF6B6B]">
          {error}
        </p>
      )}

      <Button onClick={onSubmit} disabled={!allAnswered || pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
        {reflection ? "See my reflection" : "Submit quiz"}
      </Button>
      {!allAnswered && (
        <p className="text-xs text-muted-foreground">
          Answer all {sorted.length} questions to continue.
        </p>
      )}
    </div>
  );
}

function ScoreBanner({
  score,
  passed,
  passScore,
  reflection,
}: {
  score: number;
  passed: boolean;
  passScore: number;
  reflection: boolean;
}) {
  if (reflection) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">
              Reflection complete
            </p>
            <p className="text-sm text-muted-foreground">
              Thank you for checking in with yourself. Review the notes below for
              ideas to keep growing.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        passed
          ? "border-[#5FE08A]/30 bg-[#5FE08A]/10"
          : "border-[#F5B14C]/30 bg-[#F5B14C]/10",
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold",
            passed ? "bg-[#5FE08A]/20 text-[#5FE08A]" : "bg-[#F5B14C]/20 text-[#F5B14C]",
          )}
        >
          {score}
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">
            {passed ? "Passed!" : "Almost there"}
          </p>
          <p className="text-sm text-muted-foreground">
            You scored {score}% — {passed ? `at or above the ${passScore}% pass mark.` : `passing is ${passScore}%. Review the answers and try again.`}
          </p>
        </div>
      </div>
    </div>
  );
}
