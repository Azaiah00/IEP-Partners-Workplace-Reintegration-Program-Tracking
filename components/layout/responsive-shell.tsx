"use client";

import { type ReactNode } from "react";
import { IconRail, type NavItem } from "@/components/layout/icon-rail";
import { MobileNav } from "@/components/layout/mobile-nav";
import { type SessionUser } from "@/components/layout/user-menu";

/**
 * Responsive app frame: icon rail on md+, mobile header + drawer below md.
 */
export function ResponsiveShell({
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
      <IconRail
        items={nav}
        userName={userName}
        user={user}
        homeHref={homeHref}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          items={nav}
          userName={userName}
          user={user}
          homeHref={homeHref}
        />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-8 sm:py-8">
            <div className="animate-fade-in space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
