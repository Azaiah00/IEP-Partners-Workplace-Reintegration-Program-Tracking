"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Briefcase,
  BriefcaseBusiness,
  Target,
  FileText,
  Building2,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import { IepMark } from "@/components/brand/iep-mark";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";

/** Icon keys are strings so nav config stays serializable across the
 * Server → Client boundary (function components can't be passed as props). */
export type NavIconKey =
  | "dashboard"
  | "participants"
  | "curriculum"
  | "courses"
  | "attendance"
  | "reports"
  | "employers"
  | "organizations"
  | "goals"
  | "documents"
  | "jobs";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

const ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  participants: Users,
  curriculum: GraduationCap,
  courses: BookOpen,
  attendance: CalendarCheck,
  reports: BarChart3,
  employers: Briefcase,
  organizations: Building2,
  goals: Target,
  documents: FileText,
  jobs: BriefcaseBusiness,
};

export function IconRail({
  items,
  userName,
  user,
  homeHref = "/home",
}: {
  items: NavItem[];
  userName?: string | null;
  user?: SessionUser;
  homeHref?: string;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={150}>
      {/* Hidden on mobile — MobileNav drawer replaces this below md */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[72px] shrink-0 flex-col items-center border-r border-border bg-card py-5 md:flex">
        <Link
          href={homeHref}
          className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 transition hover:bg-primary/20"
          aria-label="IEP Partners home"
        >
          <IepMark className="h-6 w-6 text-primary" />
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = ICONS[item.icon];
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-raised hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/help"
                aria-label="Help & support"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
              >
                <LifeBuoy className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Help &amp; support</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <div className="mt-1">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/login" aria-label="Account">
                    <Avatar className="h-10 w-10 ring-1 ring-border">
                      <AvatarFallback>{initials(userName)}</AvatarFallback>
                    </Avatar>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {userName ?? "Sign in"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export { ICONS };
