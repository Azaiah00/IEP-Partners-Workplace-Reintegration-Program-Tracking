"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/csv";

/** Client-side CSV export of an already-fetched dataset. */
export function ExportButton<T extends Record<string, unknown>>({
  rows,
  columns,
  filename,
  label = "Export CSV",
}: {
  rows: T[];
  columns: { key: keyof T; label: string }[];
  filename: string;
  label?: string;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => downloadCsv(filename, toCsv(rows, columns))}
      disabled={rows.length === 0}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
