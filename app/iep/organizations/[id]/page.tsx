import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries/admin";
import { getOrganization, getOrgPeople } from "@/lib/queries/iep";
import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { ExportButton } from "@/components/admin/export-button";
import { PdfButton } from "@/components/reports/pdf-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { humanize } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const org = await getOrganization(params.id);
  return { title: org ? `${org.name} · IEP Partners` : "Organization" };
}

const ROSTER_COLUMNS = [
  { key: "code" as const, label: "Participant Code" },
  { key: "name" as const, label: "Name" },
  { key: "tier" as const, label: "Tier" },
  { key: "status" as const, label: "Status" },
  { key: "region" as const, label: "Region" },
  { key: "completion" as const, label: "Completion %" },
  { key: "intake" as const, label: "Intake Date" },
];

export default async function OrgDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("super_admin");
  const org = await getOrganization(params.id);
  if (!org) notFound();

  const [d, people] = await Promise.all([
    getAdminDashboard(params.id),
    getOrgPeople(params.id),
  ]);
  const k = d.kpis;

  const pdfKpis = [
    { label: "Total Enrolled", value: k.total },
    { label: "Active", value: k.active },
    { label: "Completion Rate", value: `${k.completionRate}%` },
    { label: "Placement Rate", value: `${k.placementRate}%` },
    { label: "90-Day Retention", value: `${k.retention90}%` },
    { label: "Paid Work Experience (participants)", value: k.paidWorkParticipants },
    { label: "Paid Work Hours", value: k.paidWorkHours },
    { label: "Staff", value: people.staff.length },
    { label: "Program Health", value: `${k.programHealth} (${k.programHealthLabel})` },
  ];

  return (
    <>
      <Link
        href="/iep"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to master overview
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {org.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {humanize(org.type)}
            {org.city ? ` · ${org.city}, ${org.state ?? ""}` : ""}
            {org.capacity ? ` · capacity ${org.capacity.toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            rows={d.roster}
            columns={ROSTER_COLUMNS}
            filename={`${org.slug}-roster.csv`}
            label="Export roster"
          />
          <PdfButton
            mode="dashboard"
            title={`${org.name} — Organization Report`}
            subtitle={`${org.city ?? ""}${org.city ? ", " : ""}${org.state ?? ""}`.trim() || undefined}
            kpis={pdfKpis}
            rows={{ columns: ROSTER_COLUMNS as any, data: d.roster as any }}
            filename={`${org.slug}-report.pdf`}
            label="Download report"
          />
        </div>
      </div>

      <AdminDashboardView d={d} />

      {/* Staff list */}
      <Card>
        <CardHeader>
          <CardTitle>Staff &amp; Admins</CardTitle>
          <CardDescription>People assigned to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {people.staff.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {humanize(s.role)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.email}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No staff assigned yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Participant roster */}
      <Card>
        <CardHeader>
          <CardTitle>Participant Roster</CardTitle>
          <CardDescription>
            {people.participants.length} participant
            {people.participants.length === 1 ? "" : "s"} at this site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Intake</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-foreground">
                    {p.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {humanize(p.tier)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {humanize(p.status)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.region}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.intake}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
