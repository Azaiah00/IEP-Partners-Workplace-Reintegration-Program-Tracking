import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PARTICIPANT_NAV } from "@/lib/nav";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("participant");
  return (
    <AppShell
      nav={PARTICIPANT_NAV}
      homeHref="/me"
      user={{ name: profile.full_name, email: profile.email, role: profile.role }}
    >
      {children}
    </AppShell>
  );
}
