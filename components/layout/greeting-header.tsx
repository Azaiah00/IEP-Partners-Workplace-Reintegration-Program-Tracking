import { type ReactNode } from "react";

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Greeting header: "Good evening, {firstName}" + a one-line context subtitle,
 * with optional quick actions / date range on the right.
 */
export function GreetingHeader({
  firstName,
  subtitle,
  actions,
  now = new Date(),
}: {
  firstName?: string | null;
  subtitle?: string;
  actions?: ReactNode;
  now?: Date;
}) {
  const greeting = greetingFor(now);
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greeting}
          {firstName ? (
            <>
              , <span className="text-primary">{firstName}</span>
            </>
          ) : null}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
