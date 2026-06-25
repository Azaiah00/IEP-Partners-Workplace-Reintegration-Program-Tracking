import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/lib/nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");
  return (
    <AppShell
      nav={ADMIN_NAV}
      homeHref="/admin"
      user={{ name: profile.full_name, email: profile.email, role: profile.role }}
    >
      {children}
    </AppShell>
  );
}
