import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { IEP_NAV } from "@/lib/nav";

export default async function IepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("super_admin");
  return (
    <AppShell
      nav={IEP_NAV}
      homeHref="/iep"
      user={{ name: profile.full_name, email: profile.email, role: profile.role }}
    >
      {children}
    </AppShell>
  );
}
