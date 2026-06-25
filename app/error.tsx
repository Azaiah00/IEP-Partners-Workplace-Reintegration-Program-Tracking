"use client";

import { ErrorBoundaryView } from "@/components/layout/error-boundary";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <ErrorBoundaryView {...props} />
    </div>
  );
}
