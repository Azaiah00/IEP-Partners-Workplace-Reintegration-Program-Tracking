import { type ReactNode } from "react";
import { ResponsiveShell } from "@/components/layout/responsive-shell";
import { type NavItem } from "@/components/layout/icon-rail";
import type { SessionUser } from "@/components/layout/user-menu";

/**
 * The primary app frame: icon rail (desktop) or mobile drawer + scrollable content.
 */
export function AppShell({
  nav,
  userName,
  user,
  homeHref,
  children,
}: {
  nav: NavItem[];
  userName?: string | null;
  user?: SessionUser;
  homeHref?: string;
  children: ReactNode;
}) {
  return (
    <ResponsiveShell
      nav={nav}
      userName={userName}
      user={user}
      homeHref={homeHref}
    >
      {children}
    </ResponsiveShell>
  );
}
