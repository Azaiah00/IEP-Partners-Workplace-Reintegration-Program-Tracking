import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { STAFF_NAV } from "@/lib/nav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin may also view the staff portal; participants may not.
  const profile = await requireRole(["staff", "admin"]);
  return (
    <AppShell
      nav={STAFF_NAV}
      homeHref="/staff"
      user={{ name: profile.full_name, email: profile.email, role: profile.role }}
    >
      {children}
    </AppShell>
  );
}
