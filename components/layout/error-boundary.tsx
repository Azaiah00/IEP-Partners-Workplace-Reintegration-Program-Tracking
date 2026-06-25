"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared error-boundary UI used by the route-level error.tsx files. */
export function ErrorBoundaryView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to logs; never show a raw stack trace to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          We hit an unexpected error loading this view. Your data is safe — please
          try again.
        </p>
      </div>
      <Button onClick={reset} variant="secondary" size="sm">
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
