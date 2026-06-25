import { requireRole } from "@/lib/auth";
import { getWblList, getParticipantOptions, getEmployers } from "@/lib/queries/staff";
import { PageHeader } from "@/components/layout/page-header";
import { WblManager } from "@/components/staff/wbl-manager";

export const metadata = { title: "Work-Based Learning · IEP Partners" };

export default async function WblPage() {
  await requireRole(["staff", "admin"]);
  const [rows, participants, employers] = await Promise.all([
    getWblList(),
    getParticipantOptions(),
    getEmployers(),
  ]);
  return (
    <>
      <PageHeader
        title="Work-Based Learning"
        subtitle="Log job shadowing, work-based learning, and paid work experience."
      />
      <WblManager
        rows={rows}
        participants={participants}
        employers={employers.map((e) => ({ id: e.id, name: e.name }))}
      />
    </>
  );
}
