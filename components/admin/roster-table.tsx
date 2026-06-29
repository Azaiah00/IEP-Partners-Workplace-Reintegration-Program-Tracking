"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, TriangleAlert, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TierBadge, StatusBadge } from "@/components/shared/badges";
import { initials, humanize } from "@/lib/utils";
import type { OrgRosterRow } from "@/lib/queries/admin";

const TIER_FILTERS = ["all", "tier_1", "tier_2", "tier_3"] as const;
const STATUS_FILTERS = [
  "all",
  "active",
  "completed",
  "on_hold",
  "withdrawn",
  "enrolled",
] as const;

type SortKey = "name" | "completion" | "courseCompletion" | "attendanceRate";

export function RosterTable({ rows }: { rows: OrgRosterRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<(typeof TIER_FILTERS)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(k === "name");
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (tier !== "all" && r.tier !== tier) return false;
      if (status !== "all" && r.status !== status) return false;
      if (riskOnly && !r.atRisk) return false;
      if (
        needle &&
        !`${r.name} ${r.code} ${r.region} ${r.staffName}`.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
    out.sort((a, b) => {
      let cmp: number;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return asc ? cmp : -cmp;
    });
    return out;
  }, [rows, q, tier, status, riskOnly, sortKey, asc]);

  const SortHead = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
        sortKey === k ? "text-foreground" : ""
      }`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, code, region, or case manager…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills
            options={TIER_FILTERS}
            value={tier}
            onChange={setTier}
            labelFor={(v) => (v === "all" ? "All tiers" : humanize(v))}
          />
          <button
            onClick={() => setRiskOnly((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              riskOnly
                ? "border-[#FF6B6B]/40 bg-[#FF6B6B]/15 text-[#FF6B6B]"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <TriangleAlert className="h-3.5 w-3.5" />
            At risk
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPills
          options={STATUS_FILTERS}
          value={status}
          onChange={setStatus}
          labelFor={(v) => (v === "all" ? "All statuses" : humanize(v))}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortHead label="Participant" k="name" />
              </TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[16%]">
                <SortHead label="Curriculum" k="completion" />
              </TableHead>
              <TableHead className="w-[16%]">
                <SortHead label="Courses" k="courseCompletion" />
              </TableHead>
              <TableHead>
                <SortHead label="Attendance" k="attendanceRate" />
              </TableHead>
              <TableHead>Case Manager</TableHead>
              <TableHead>Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/participants/${r.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{initials(r.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/participants/${r.id}`}
                          className="font-medium text-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.name}
                        </Link>
                        {r.atRisk && (
                          <TriangleAlert className="h-3.5 w-3.5 text-[#FF6B6B]" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.code} · {r.region}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <TierBadge tier={r.tier} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={r.completion} className="h-2 flex-1" />
                    <span className="w-9 text-right text-xs font-medium text-foreground">
                      {r.completion}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={r.courseCompletion} className="h-2 flex-1" />
                    <span className="w-9 text-right text-xs font-medium text-foreground">
                      {r.courseCompletion}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.attendanceRate >= 80
                        ? "success"
                        : r.attendanceRate >= 70
                          ? "warning"
                          : "danger"
                    }
                  >
                    {r.attendanceRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.staffName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.lastActivity
                    ? formatDistanceToNow(parseISO(r.lastActivity), {
                        addSuffix: true,
                      })
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No participants match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} participants.
      </p>
    </div>
  );
}

function FilterPills<T extends string>({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelFor: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {labelFor(o)}
        </button>
      ))}
    </div>
  );
}
