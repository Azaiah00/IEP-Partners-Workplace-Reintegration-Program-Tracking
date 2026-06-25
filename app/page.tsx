import Link from "next/link";
import {
  ArrowRight,
  Users,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  LayoutDashboard,
  UserCog,
} from "lucide-react";
import { IepMark } from "@/components/brand/iep-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIERS = [
  {
    badge: "Tier 1",
    variant: "default" as const,
    name: "Foundation Pathway",
    weeks: "8–10 weeks",
    blurb:
      "Workforce readiness, career exploration, resume development, interview prep, and workplace professionalism.",
  },
  {
    badge: "Tier 2",
    variant: "info" as const,
    name: "Career Development Pathway",
    weeks: "12–16 weeks",
    blurb:
      "Workplace simulations, team projects, employer engagement, financial literacy, and transition planning.",
  },
  {
    badge: "Tier 3",
    variant: "violet" as const,
    name: "Reintegration & Employment",
    weeks: "20–24 weeks",
    blurb:
      "Individualized transition plans, job shadowing, work-based learning, paid work experience, and employment support.",
  },
];

const ROLES = [
  {
    icon: Users,
    title: "Participants",
    blurb: "Track your own progress, assessments, goals, milestones, and documents.",
  },
  {
    icon: UserCog,
    title: "Staff",
    blurb: "Manage your caseload — attendance, lessons, case notes, employers, and outcomes.",
  },
  {
    icon: LayoutDashboard,
    title: "Leadership",
    blurb: "Org-wide enrollment, completion, placement, and retention reporting.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]"
      />

      <div className="relative mx-auto w-full max-w-5xl px-5 py-8 sm:py-12">
        {/* Nav */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <IepMark className="h-6 w-6 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">IEP Partners</span>
          </div>
          <Button asChild size="sm">
            <Link href="/login">
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-3xl py-16 text-center sm:py-24">
          <Badge variant="default" className="mb-5">
            Workplace Reintegration Program
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            From intake to employment,{" "}
            <span className="text-primary">tracked with care.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            A secure portal that guides justice-involved and barrier-impacted
            participants through a three-tier workforce reintegration curriculum —
            building toward employment, independence, and community.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Enter the portal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Tiers */}
        <section className="space-y-4">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            A three-tier, cumulative pathway
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => (
              <Card key={t.badge} className="flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <Badge variant={t.variant}>{t.badge}</Badge>
                  <span className="text-xs text-muted-foreground">{t.weeks}</span>
                </div>
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.blurb}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {ROLES.map((r) => (
            <Card key={r.title} className="p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-primary">
                <r.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.blurb}</p>
            </Card>
          ))}
        </section>

        {/* Outcomes strip */}
        <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: GraduationCap, label: "Curriculum tracking" },
            { icon: Briefcase, label: "Employer engagement" },
            { icon: Users, label: "Work-based learning" },
            { icon: ShieldCheck, label: "Retention outcomes" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-foreground">{f.label}</span>
            </div>
          ))}
        </section>

        {/* Security note + footer */}
        <section className="mt-12">
          <Card className="spotlight-card flex flex-col items-center gap-3 border-0 p-8 text-center">
            <ShieldCheck className="h-7 w-7 text-[#5a5440]" />
            <h3 className="text-lg font-semibold text-[#1a1c22]">
              Built for sensitive data
            </h3>
            <p className="max-w-xl text-sm text-[#4a4536]">
              Role-based access is enforced at the database with Row-Level Security.
              A participant can never see another participant&apos;s record.
            </p>
          </Card>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          IEP Partners · Workplace Reintegration Program · Founder Dr. Rhonda
          Clanton-Davis · CEO Michelle Pettaway
        </footer>
      </div>
    </div>
  );
}
