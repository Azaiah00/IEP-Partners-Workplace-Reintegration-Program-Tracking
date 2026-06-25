import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTrend = {
  value: string;
  direction: "up" | "down" | "flat";
  /** When true, a "down" movement is still good (e.g. fewer at-risk). */
  invertColor?: boolean;
};

/**
 * Signature stat card: small muted label, big bold value, sub-label,
 * and a corner trend pill. Optional mini sparkline slot at the bottom.
 */
export function StatCard({
  label,
  value,
  subLabel,
  trend,
  icon,
  sparkline,
  className,
}: {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: StatTrend;
  icon?: React.ReactNode;
  sparkline?: React.ReactNode;
  className?: string;
}) {
  const good =
    trend &&
    (trend.direction === "up"
      ? !trend.invertColor
      : trend.direction === "down"
        ? !!trend.invertColor
        : true);

  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-raised text-muted-foreground">
              {icon}
            </span>
          ) : null}
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.direction === "flat"
                ? "bg-muted-foreground/10 text-muted-foreground"
                : good
                  ? "bg-[#5FE08A]/15 text-[#5FE08A]"
                  : "bg-[#FF6B6B]/15 text-[#FF6B6B]",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trend.direction === "down" ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {trend.value}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        {subLabel ? (
          <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>
        ) : null}
      </div>

      {sparkline ? <div className="mt-3 h-10">{sparkline}</div> : null}
    </Card>
  );
}
