import Link from "next/link";
import {
  Building2,
  Users,
  Activity,
  GraduationCap,
  Briefcase,
  HandCoins,
  ArrowRight,
} from "lucide-react";
import { requireRole, firstName } from "@/lib/auth";
import { getMasterOverview } from "@/lib/queries/iep";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrgComparisonChart } from "@/components/iep/org-comparison-chart";
import { ExportButton } from "@/components/admin/export-button";
import { PdfButton } from "@/components/reports/pdf-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "IEP Master Overview · IEP Partners" };

const ROLLUP_COLUMNS = [
  { key: "name" as const, label: "Organization" },
  { key: "type" as const, label: "Type" },
  { key: "participants" as const, label: "Participants" },
  { key: "active" as const, label: "Active" },
  { key: "completionRate" as const, label: "Completion %" },
  { key: "placements" as const, label: "Placements" },
  { key: "placementRate" as const, label: "Placement %" },
  { key: "paidWorkExperience" as const, label: "Paid Work Exp." },
  { key: "staffCount" as const, label: "Staff" },
];

function typeLabel(t: string) {
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function IepOverviewPage() {
  const profile = await requireRole("super_admin");
  const overview = await getMasterOverview();
  const t = overview.totals;

  const exportRows = overview.orgs.map((r) => ({
    name: r.org.name,
    type: typeLabel(r.org.type),
    participants: r.participants,
    active: r.active,
    completionRate: r.completionRate,
    placements: r.placements,
    placementRate: r.placementRate,
    paidWorkExperience: r.paidWorkExperience,
    staffCount: r.staffCount,
  }));

  const pdfKpis = [
    { label: "Organizations", value: t.organizations },
    { label: "Total Participants", value: t.participants },
    { label: "Active", value: t.active },
    { label: "Overall Completion Rate", value: `${t.completionRate}%` },
    { label: "Overall Placement Rate", value: `${t.placementRate}%` },
    { label: "Paid Work Experience (participants)", value: t.paidWorkExperience },
    { label: "Staff", value: t.staffCount },
  ];

  return (
    <>
      <GreetingHeader
        firstName={firstName(profile.full_name)}
        subtitle="IEP Partners master oversight — all client organizations."
        actions={
          <>
            <ExportButton
              rows={exportRows}
              columns={ROLLUP_COLUMNS}
              filename="iep-org-rollup.csv"
              label="Export rollup"
            />
            <PdfButton
              mode="dashboard"
              title="Master Overview — All Organizations"
              subtitle="IEP Partners master oversight"
              kpis={pdfKpis}
              rows={{ columns: ROLLUP_COLUMNS as any, data: exportRows }}
              filename="iep-master-overview.pdf"
            />
          </>
        }
      />

      {/* Aggregate KPI row across every org */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Organizations"
          value={t.organizations}
          subLabel="Client sites"
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Total Participants"
          value={t.participants}
          subLabel={`${t.staffCount} staff across sites`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active"
          value={t.active}
          subLabel="Currently in curriculum"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Completion Rate"
          value={`${t.completionRate}%`}
          subLabel="Across all orgs"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Placement Rate"
          value={`${t.placementRate}%`}
          subLabel={`${t.paidWorkExperience} in paid work exp.`}
          icon={<Briefcase className="h-4 w-4" />}
        />
      </div>

      {/* Comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle>Participants by Organization</CardTitle>
          <CardDescription>
            At-a-glance comparison across all client sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgComparisonChart
            data={overview.orgs.map((r) => ({
              name: r.org.name,
              value: r.participants,
            }))}
          />
        </CardContent>
      </Card>

      {/* Per-org rollup cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {overview.orgs.map((r) => (
          <Card key={r.org.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{r.org.name}</CardTitle>
                <CardDescription>
                  {typeLabel(r.org.type)}
                  {r.org.city ? ` · ${r.org.city}, ${r.org.state ?? ""}` : ""}
                </CardDescription>
              </div>
              <Link
                href={`/iep/organizations/${r.org.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-raised px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Drill in <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <RollupStat label="Participants" value={r.participants} />
                <RollupStat label="Active" value={r.active} />
                <RollupStat label="Staff" value={r.staffCount} />
              </div>
              <div className="space-y-2">
                <RollupBar label="Completion" value={r.completionRate} />
                <RollupBar label="Placement" value={r.placementRate} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HandCoins className="h-4 w-4 text-primary" />
                <span className="flex-1">Paid work experience</span>
                <span className="font-semibold text-foreground">
                  {r.paidWorkExperience}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function RollupStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-raised p-3">
      <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RollupBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      <Progress value={value} className="h-2 flex-1" />
      <span className="w-9 text-right text-xs font-medium text-foreground">
        {value}%
      </span>
    </div>
  );
}
