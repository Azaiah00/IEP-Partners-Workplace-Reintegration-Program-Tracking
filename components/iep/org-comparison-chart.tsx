"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type OrgBar = { name: string; value: number };

const COLORS = ["#A8E55F", "#5B9DFF", "#A78BFA", "#F6C453", "#5FE08A"];

/**
 * At-a-glance horizontal bar comparison of organizations by a single metric
 * (e.g. participants or placement rate). Used on the IEP master overview.
 */
export function OrgComparisonChart({
  data,
  height = 300,
  unit = "",
}: {
  data: OrgBar[];
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#262B36" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#8C94A3", fontSize: 12 }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#8C94A3", fontSize: 11 }}
          width={150}
        />
        <Tooltip
          cursor={{ fill: "#262B3633" }}
          formatter={(v: number) => [`${v}${unit}`, "Value"]}
          contentStyle={{
            background: "#1E222B",
            border: "1px solid #262B36",
            borderRadius: 12,
            color: "#F4F6F8",
            fontSize: 12,
          }}
          labelStyle={{ color: "#8C94A3" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
