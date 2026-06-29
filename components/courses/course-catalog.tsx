"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowRight, BookOpen, Wrench, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressBadge } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import type { CatalogCourse } from "@/lib/queries/courses";
import type { ProgramTier } from "@/types/db";

const TRACK_LABELS: Record<string, string> = {
  workforce_readiness: "Workforce Readiness",
  emotional_readiness: "Emotional Readiness",
  digital: "Digital Skills",
  trades: "Trades",
};

const TRACK_ORDER = ["workforce_readiness", "emotional_readiness", "digital", "trades"];

const TIER_LABEL: Record<ProgramTier, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
};

function resolveIcon(name: string | null): LucideIcon {
  if (name && name in Icons) {
    return (Icons as unknown as Record<string, LucideIcon>)[name];
  }
  return BookOpen;
}

export function CourseCatalog({ courses }: { courses: CatalogCourse[] }) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, CatalogCourse[]>();
    for (const c of courses) {
      const arr = map.get(c.track) ?? [];
      arr.push(c);
      map.set(c.track, arr);
    }
    return Array.from(map.entries()).sort(
      (a, b) =>
        (TRACK_ORDER.indexOf(a[0]) === -1 ? 99 : TRACK_ORDER.indexOf(a[0])) -
        (TRACK_ORDER.indexOf(b[0]) === -1 ? 99 : TRACK_ORDER.indexOf(b[0])),
    );
  }, [courses]);

  return (
    <div className="space-y-8">
      {grouped.map(([track, list]) => (
        <section key={track} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {TRACK_LABELS[track] ?? track}
            </h2>
            <Badge variant="secondary">{list.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CourseCard({ course }: { course: CatalogCourse }) {
  const Icon = resolveIcon(course.icon);
  const started = course.status !== "not_started";

  return (
    <Link
      href={`/me/courses/${course.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {course.tier && (
            <Badge variant="outline">{TIER_LABEL[course.tier]}</Badge>
          )}
          {course.is_trade && (
            <Badge variant="violet">
              <Wrench className="h-3 w-3" /> Trade
            </Badge>
          )}
        </div>
      </div>

      <h3 className="mt-4 text-sm font-semibold leading-snug text-foreground">
        {course.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
        {course.description}
      </p>

      <div className="mt-4 space-y-2.5">
        {started && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <ProgressBadge status={course.status} />
              <span className="text-muted-foreground">{course.completion_pct}%</span>
            </div>
            <Progress value={course.completion_pct} className="h-1.5" />
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {course.est_hours != null ? `${course.est_hours} hrs` : ""}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium text-primary",
              "transition-transform group-hover:translate-x-0.5",
            )}
          >
            {started ? "Continue" : "Start course"} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
