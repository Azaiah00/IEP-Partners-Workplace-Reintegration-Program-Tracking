import {
  Users,
  Activity,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  TriangleAlert,
  DollarSign,
  Eye,
  Footprints,
  HandCoins,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RadialProgress } from "@/components/dashboard/radial-progress";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RetentionFunnel } from "@/components/admin/retention-funnel";
import { RegionalTable } from "@/components/admin/regional-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { AdminDashboard } from "@/lib/queries/admin";

/**
 * The admin dashboard body. Shared by the org-admin dashboard (/admin) and the
 * IEP master org drill-in (/iep/organizations/[id]) so both show the identical
 * org-scoped view.
 */
export function AdminDashboardView({ d }: { d: AdminDashboard }) {
  const k = d.kpis;
  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Enrolled"
          value={k.total}
          subLabel={`${d.regions.length} regions`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active"
          value={k.active}
          subLabel="Currently in curriculum"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Completion Rate"
          value={`${k.completionRate}%`}
          subLabel="Finished their tier"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Placement Rate"
          value={`${k.placementRate}%`}
          subLabel={`${k.placedCount} placed · avg ${formatCurrency(k.avgWage)}/hr`}
          icon={<Briefcase className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="90-Day Retention"
          value={`${k.retention90}%`}
          subLabel="Of all placements"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="At Risk"
          value={k.atRisk}
          subLabel="Attendance / pace flags"
          icon={<TriangleAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Avg. Placement Wage"
          value={formatCurrency(k.avgWage)}
          subLabel="Per hour"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <Card className="spotlight-card border-0 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[#5a5440]">
              Program Health
            </span>
          </div>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <RadialProgress value={k.programHealth} size={92} color="#5FA346" />
            <div>
              <p className="text-xl font-bold text-[#1a1c22]">
                {k.programHealthLabel}
              </p>
              <p className="text-xs text-[#5a5440]">
                Attendance · pace · outcomes
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Paid work experience (admins asked to see this) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paid Work Experience"
          value={k.paidWorkParticipants}
          subLabel="Participants with paid placements"
          icon={<HandCoins className="h-4 w-4" />}
        />
        <StatCard
          label="Paid Hours Logged"
          value={k.paidWorkHours.toLocaleString()}
          subLabel="Total paid work-experience hours"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Paid Placements"
          value={d.paidWork.placements}
          subLabel="Paid work-experience records"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="WBL Total"
          value={d.participation.jobShadow + d.participation.wbl + d.participation.paid}
          subLabel="All work-based learning records"
          icon={<Footprints className="h-4 w-4" />}
        />
      </div>

      {/* Trend + tier distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Enrollment &amp; Completion</CardTitle>
              <CardDescription>Cumulative over the last 10 weeks</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Enrolled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#5B9DFF]" /> Modules
                completed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={d.trend}
              series={[
                { key: "enrolled", name: "Enrolled", color: "#A8E55F" },
                { key: "completed", name: "Modules completed", color: "#5B9DFF" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
            <CardDescription>Participants by active tier</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={d.tiers} centerLabel="enrolled" />
          </CardContent>
        </Card>
      </div>

      {/* Outcomes + participation */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Retention Funnel</CardTitle>
            <CardDescription>Placement through 180-day retention</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionFunnel steps={d.funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work-Based Learning</CardTitle>
            <CardDescription>Participation by type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <ParticipationRow
              icon={<Eye className="h-4 w-4" />}
              label="Job Shadowing"
              value={d.participation.jobShadow}
            />
            <ParticipationRow
              icon={<Footprints className="h-4 w-4" />}
              label="Work-Based Learning"
              value={d.participation.wbl}
            />
            <ParticipationRow
              icon={<HandCoins className="h-4 w-4" />}
              label="Paid Work Experience"
              value={d.participation.paid}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Enrollments, completions &amp; placements</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={d.activity} />
          </CardContent>
        </Card>
      </div>

      {/* Regional reporting */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Reporting</CardTitle>
          <CardDescription>
            Enrollment and completion by region (stand-in for state-level rollups)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegionalTable regions={d.regions} />
        </CardContent>
      </Card>
    </>
  );
}

function ParticipationRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-raised text-primary">
        {icon}
      </span>
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        {value}
      </span>
    </div>
  );
}
