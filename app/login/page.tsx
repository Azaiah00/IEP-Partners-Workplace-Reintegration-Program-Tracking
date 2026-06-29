import Link from "next/link";
import { redirect } from "next/navigation";
import { IepMark } from "@/components/brand/iep-mark";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { getSessionProfile, homePathForRole } from "@/lib/auth";

export const metadata = { title: "Sign in · IEP Partners" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string };
}) {
  // Already signed in? Go straight to the right portal.
  const session = await getSessionProfile();
  if (session?.profile) redirect(homePathForRole(session.profile.role));

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Always-visible escape hatch back to the public landing page */}
      <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <Button asChild variant="secondary" size="lg" className="shadow-sm">
          <Link href="/">&larr; Back to home</Link>
        </Button>
      </div>

      {/* ambient accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <IepMark className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">IEP Partners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workplace Reintegration Program Portal
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your dashboard.
            </p>
          </div>
          <LoginForm redirectTo={searchParams.redirectedFrom} />

          <div className="mt-6 border-t border-border pt-6">
            <Button asChild variant="outline" size="lg" className="w-full border-primary/30 text-base">
              <Link href="/">&larr; Back to home</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Justice-involved participant data is protected. Access is role-based and
          audited.
        </p>
      </div>
    </div>
  );
}
