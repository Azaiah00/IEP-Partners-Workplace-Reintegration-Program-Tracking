import { cn } from "@/lib/utils";

const COLORS = ["#A8E55F", "#5FE08A", "#5B9DFF", "#A78BFA"];

/** Shrinking horizontal funnel: Placed → 30 → 90 → 180-day retention. */
export function RetentionFunnel({
  steps,
}: {
  steps: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const retained = i === 0 ? 100 : Math.round((s.value / (steps[0].value || 1)) * 100);
        return (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="text-muted-foreground">
                {s.value}
                {i > 0 && (
                  <span className="ml-1 text-muted-foreground/70">
                    ({retained}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-lg bg-raised">
              <div
                className={cn(
                  "flex h-full items-center rounded-lg px-2 text-xs font-semibold text-[#0F1115] transition-all",
                )}
                style={{
                  width: `${Math.max(pct, 8)}%`,
                  background: COLORS[i % COLORS.length],
                }}
              >
                {s.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
