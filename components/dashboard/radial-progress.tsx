"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

/**
 * Donut/radial gauge for percentages — curriculum completion,
 * "Program Health", etc. Centered value + caption overlaid.
 */
export function RadialProgress({
  value,
  label,
  caption,
  size = 180,
  color = "#A8E55F",
}: {
  value: number;
  label?: string;
  caption?: string;
  size?: number;
  color?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const data = [{ name: "progress", value: clamped, fill: color }];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "#1E222B" }}
            dataKey="value"
            cornerRadius={999}
            angleAxisId={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {Math.round(clamped)}
          <span className="text-lg text-muted-foreground">%</span>
        </span>
        {label ? (
          <span className="mt-0.5 text-sm font-medium text-foreground">
            {label}
          </span>
        ) : null}
        {caption ? (
          <span className="text-xs text-muted-foreground">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
