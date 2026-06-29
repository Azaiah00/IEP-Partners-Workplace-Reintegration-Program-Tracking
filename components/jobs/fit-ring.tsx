import { FIT_LABEL_COLOR, type FitLabel } from "@/lib/matching";

/**
 * Compact SVG fit-score ring (no recharts dependency, safe in server cards).
 * Shows the score in the center with the label-colored arc.
 */
export function FitRing({
  score,
  label,
  size = 56,
  stroke = 6,
}: {
  score: number;
  label: FitLabel;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const dash = (clamped / 100) * c;
  const color = FIT_LABEL_COLOR[label];

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Fit score ${clamped}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1E222B"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tracking-tight text-foreground">
        {clamped}
      </span>
    </div>
  );
}
