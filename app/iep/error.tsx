"use client";

import { ErrorBoundaryView } from "@/components/layout/error-boundary";

export default function IepError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryView {...props} />;
}
