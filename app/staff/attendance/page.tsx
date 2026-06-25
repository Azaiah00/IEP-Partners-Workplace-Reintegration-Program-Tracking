import { format } from "date-fns";
import { requireRole } from "@/lib/auth";
import { getRosterForDate } from "@/lib/queries/staff";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceRoster } from "@/components/staff/attendance-roster";

export const metadata = { title: "Attendance · IEP Partners" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  await requireRole(["staff", "admin"]);
  const date = searchParams.date ?? format(new Date(), "yyyy-MM-dd");
  const rows = await getRosterForDate(date);

  return (
    <>
      <PageHeader
        title="Daily Attendance"
        subtitle="Mark present, late, excused, or absent for each participant."
      />
      <AttendanceRoster date={date} rows={rows} />
    </>
  );
}
