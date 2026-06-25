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
} from "lucide-react";
import { requireRole, firstName } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries/admin";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RadialProgress } from "@/components/dashboard/radial-progress";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RetentionFunnel } from "@/components/admin/retention-funnel";
import { RegionalTable } from "@/components/admin/regional-table";
import { ExportButton } from "@/components/admin/export-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard · IEP Partners" };

const ROSTER_COLUMNS = [
  { key: "code" as const, label: "Participant Code" },
  { key: "name" as const, label: "Name" },
  { key: "tier" as const, label: "Tier" },
  { key: "status" as const, label: "Status" },
  { key: "region" as const, label: "Region" },
  { key: "completion" as const, label: "Completion %" },
  { key: "intake" as const, label: "Intake Date" },
];

export default async function AdminDashboard() {
  const profile = await requireRole("admin");
  const d = await getAdminDashboard();
  const k = d.kpis;

  return (
    <>
      <GreetingHeader
        firstName={firstName(profile.full_name)}
        subtitle="Organization-wide view of the Workplace Reintegration Program."
        actions={
          <ExportButton
            rows={d.roster}
            columns={ROSTER_COLUMNS}
            filename="iep-participants.csv"
            label="Export roster"
          />
        }
      />

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
          <div className="mt-2 flex items-center gap-3">
            <RadialProgress
              value={k.programHealth}
              size={92}
              color="#5FA346"
            />
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

      {/* Trend + tier distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Enrollment &amp; Completion</CardTitle>
              <CardDescription>Cumulative over the last 10 weeks</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
