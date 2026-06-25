import { type ReactNode } from "react";
import { IconRail, type NavItem } from "@/components/layout/icon-rail";
import type { SessionUser } from "@/components/layout/user-menu";

/**
 * The primary app frame: fixed left icon rail + scrollable content column.
 * Content is constrained and padded for a calm, airy data-dense feel.
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
    <div className="flex min-h-screen bg-background">
      <IconRail items={nav} userName={userName} user={user} homeHref={homeHref} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 sm:py-8">
          <div className="animate-fade-in space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
