import { cn } from "@/lib/utils";

/**
 * IEP Partners mark — an upward growth arrow looping through a figure,
 * echoing the program logo. Uses currentColor so it inherits the accent.
 */
export function IepMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", className)}
      aria-hidden="true"
    >
      <path
        d="M3 17.5l4.2-4.2a3 3 0 014.24 0l1.3 1.3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11l4.5-4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 4.5h6v6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4.5L12.5 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="18.5" r="1.6" fill="currentColor" />
    </svg>
  );
}
