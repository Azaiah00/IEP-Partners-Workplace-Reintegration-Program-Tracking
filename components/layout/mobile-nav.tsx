"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Settings, LifeBuoy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IepMark } from "@/components/brand/iep-mark";
import { ICONS, type NavItem } from "@/components/layout/icon-rail";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

/**
 * Mobile-only top bar + slide-out navigation drawer.
 * Replaces the icon rail on viewports below md (768px).
 */
export function MobileNav({
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function closeAndNavigate() {
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link
          href={homeHref}
          className="flex items-center gap-2"
          aria-label="IEP Partners home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <IepMark className="h-5 w-5 text-primary" />
          </span>
          <span className="text-sm font-semibold text-foreground">IEP Partners</span>
        </Link>

        <div className="shrink-0">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" aria-label="Sign in">
              <Avatar className="h-9 w-9 ring-1 ring-border">
                <AvatarFallback>{initials(userName)}</AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "fixed left-0 top-0 z-50 flex h-full max-h-none w-[min(100vw,300px)] max-w-[300px] flex-col gap-0",
            "translate-x-0 translate-y-0 rounded-none border-0 border-r border-border p-0 shadow-xl",
            "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          )}
        >
          <DialogTitle className="sr-only">Navigation menu</DialogTitle>

          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <IepMark className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">IEP Partners</p>
              <p className="text-xs text-muted-foreground">Workplace Reintegration</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeAndNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-raised hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-border px-3 py-4">
            <Link
              href="/help"
              onClick={closeAndNavigate}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
            >
              <LifeBuoy className="h-5 w-5 shrink-0" />
              Help &amp; support
            </Link>
            <Link
              href="/settings"
              onClick={closeAndNavigate}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
            >
              <Settings className="h-5 w-5 shrink-0" />
              Settings
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
