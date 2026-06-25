import { requireRole } from "@/lib/auth";
import { getMyOverview } from "@/lib/queries/participant";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsManager } from "@/components/participant/documents-manager";

export const metadata = { title: "My Documents · IEP Partners" };

export default async function MyDocumentsPage() {
  await requireRole("participant");
  const o = await getMyOverview();
  if (!o) return null;

  return (
    <>
      <PageHeader
        title="My Documents"
        subtitle="Upload and access your resume, certificates, and credentials."
      />
      <DocumentsManager participantId={o.participant.id} documents={o.documents} />
    </>
  );
}
