import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";
import type {
  ProgramTier,
  EnrollmentStatus,
  EmploymentStatus,
  ProgressStatus,
} from "@/types/db";

const TIER: Record<ProgramTier, { label: string; variant: BadgeProps["variant"] }> = {
  tier_1: { label: "Tier 1", variant: "default" },
  tier_2: { label: "Tier 2", variant: "info" },
  tier_3: { label: "Tier 3", variant: "violet" },
};

const STATUS: Record<EnrollmentStatus, BadgeProps["variant"]> = {
  enrolled: "muted",
  active: "success",
  on_hold: "warning",
  completed: "default",
  withdrawn: "danger",
};

const EMPLOYMENT: Record<EmploymentStatus, BadgeProps["variant"]> = {
  unemployed: "muted",
  searching: "warning",
  placed: "success",
  retained_30: "success",
  retained_90: "success",
  retained_180: "success",
};

const PROGRESS: Record<ProgressStatus, { label: string; variant: BadgeProps["variant"] }> = {
  not_started: { label: "Not started", variant: "muted" },
  in_progress: { label: "In progress", variant: "info" },
  completed: { label: "Completed", variant: "success" },
};

export function TierBadge({ tier }: { tier: ProgramTier }) {
  const t = TIER[tier];
  return <Badge variant={t.variant}>{t.label}</Badge>;
}

export function StatusBadge({ status }: { status: EnrollmentStatus }) {
  return <Badge variant={STATUS[status]}>{humanize(status)}</Badge>;
}

export function EmploymentBadge({ status }: { status: EmploymentStatus }) {
  const label =
    status === "retained_30"
      ? "Retained 30d"
      : status === "retained_90"
        ? "Retained 90d"
        : status === "retained_180"
          ? "Retained 180d"
          : humanize(status);
  return <Badge variant={EMPLOYMENT[status]}>{label}</Badge>;
}

export function ProgressBadge({ status }: { status: ProgressStatus }) {
  const p = PROGRESS[status];
  return <Badge variant={p.variant}>{p.label}</Badge>;
}
