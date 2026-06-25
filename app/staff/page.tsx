import Link from "next/link";
import { Users, Activity, TriangleAlert, GraduationCap, CalendarCheck } from "lucide-react";
import { requireRole, firstName } from "@/lib/auth";
import { getCaseload } from "@/lib/queries/staff";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CaseloadTable } from "@/components/staff/caseload-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Staff Dashboard · IEP Partners" };

export default async function StaffDashboard() {
  const profile = await requireRole(["staff", "admin"]);
  const caseload = await getCaseload();

  const total = caseload.length;
  const active = caseload.filter((c) => c.status === "active").length;
  const atRisk = caseload.filter((c) => c.atRisk).length;
  const completed = caseload.filter((c) => c.status === "completed").length;

  return (
    <>
      <GreetingHeader
        firstName={firstName(profile.full_name)}
        subtitle="Your caseload at a glance — attendance, progress, and outcomes."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/staff/attendance">
              <CalendarCheck className="h-4 w-4" />
              Take attendance
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My Caseload" value={total} subLabel="Assigned participants" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active" value={active} subLabel="In curriculum now" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="At Risk" value={atRisk} subLabel="Need follow-up" icon={<TriangleAlert className="h-4 w-4" />} />
        <StatCard label="Completions" value={completed} subLabel="Finished their tier" icon={<GraduationCap className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Caseload</CardTitle>
          <CardDescription>
            Click a participant to open their full record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaseloadTable rows={caseload} />
        </CardContent>
      </Card>
    </>
  );
}
