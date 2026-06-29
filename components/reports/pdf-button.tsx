"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadDashboardReport,
  downloadParticipantReport,
  type Kpi,
  type ParticipantReportData,
} from "@/lib/pdf";

type DashboardProps = {
  mode: "dashboard";
  title: string;
  subtitle?: string;
  kpis: Kpi[];
  rows: {
    columns: { key: string; label: string }[];
    data: Record<string, unknown>[];
  };
  filename?: string;
  label?: string;
};

type ParticipantProps = {
  mode: "participant";
  data: ParticipantReportData;
  subtitle?: string;
  filename?: string;
  label?: string;
};

/**
 * Client-side PDF export button. Renders "Download PDF" and dispatches to the
 * right pdf helper based on `mode`:
 *   • "dashboard"   — KPI + roster report (admin / IEP master / org-detail).
 *   • "participant" — single-participant report (staff).
 */
export function PdfButton(props: DashboardProps | ParticipantProps) {
  const label = props.label ?? "Download PDF";
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        if (props.mode === "dashboard") {
          downloadDashboardReport(props.title, props.kpis, props.rows, {
            subtitle: props.subtitle,
            filename: props.filename,
          });
        } else {
          downloadParticipantReport(props.data, {
            subtitle: props.subtitle,
            filename: props.filename,
          });
        }
      }}
    >
      <FileDown className="h-4 w-4" />
      {label}
    </Button>
  );
}
