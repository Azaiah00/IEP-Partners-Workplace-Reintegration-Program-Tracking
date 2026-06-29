/**
 * Client-side PDF report helpers (jsPDF + jspdf-autotable).
 *
 * Two report shapes:
 *   • downloadDashboardReport — KPI summary + a table of rows (admin / IEP use).
 *   • downloadParticipantReport — a single participant's snapshot (staff use).
 *
 * Every PDF is headed with the IEP Partners program name, the report/org name,
 * and the generation date.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = "IEP Partners — Workplace Reintegration Program";
const GREEN = "#5FA346";

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Draws the standard report header and returns the next free Y position. */
function header(doc: jsPDF, title: string, subtitle?: string): number {
  doc.setFontSize(16);
  doc.setTextColor(GREEN);
  doc.text(BRAND, 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 28);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  let y = 34;
  if (subtitle) {
    doc.text(subtitle, 14, y);
    y += 5;
  }
  doc.text(`Generated ${todayLabel()}`, 14, y);
  y += 6;

  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
  return y + 6;
}

export type Kpi = { label: string; value: string | number };

/**
 * Dashboard / roster report: a grid of KPIs followed by a data table.
 * Used by the admin dashboard and the IEP master overview / org-detail pages.
 */
export function downloadDashboardReport(
  title: string,
  kpis: Kpi[],
  rows: {
    columns: { key: string; label: string }[];
    data: Record<string, unknown>[];
  },
  options?: { subtitle?: string; filename?: string },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = header(doc, title, options?.subtitle);

  // KPI summary table (2 columns of label/value pairs)
  if (kpis.length) {
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: kpis.map((k) => [k.label, String(k.value)]),
      theme: "striped",
      headStyles: { fillColor: [95, 163, 70], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  if (rows.data.length) {
    autoTable(doc, {
      startY: y,
      head: [rows.columns.map((c) => c.label)],
      body: rows.data.map((r) =>
        rows.columns.map((c) => {
          const v = r[c.key];
          return v == null ? "" : String(v);
        }),
      ),
      theme: "grid",
      headStyles: { fillColor: [42, 47, 57], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(options?.filename ?? slugify(title) + ".pdf");
}

export type ParticipantReportData = {
  code: string;
  name: string;
  tier: string;
  status: string;
  region: string;
  staffName: string;
  intakeDate: string;
  completion: number;
  attendanceRate?: number;
  goals?: { title: string; status: string }[];
  milestones?: { name: string; status: string }[];
  outcome?: { status: string; jobTitle?: string | null; wage?: number | null } | null;
  courses?: {
    enrolled: number;
    completed: number;
    quizzesPassed: number;
    avgQuizScore: number | null;
    rows: {
      title: string;
      status: string;
      completion: number;
      bestQuizScore: number | null;
    }[];
  };
};

/**
 * Single-participant report. This is the only report staff can export.
 */
export function downloadParticipantReport(
  data: ParticipantReportData,
  options?: { subtitle?: string; filename?: string },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = header(
    doc,
    `Participant Report — ${data.name}`,
    options?.subtitle ?? `${data.code} · ${data.region}`,
  );

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Participant Code", data.code],
      ["Name", data.name],
      ["Tier", data.tier],
      ["Status", data.status],
      ["Region", data.region],
      ["Case Manager", data.staffName],
      ["Intake Date", data.intakeDate],
      ["Curriculum Completion", `${data.completion}%`],
      ...(data.attendanceRate != null
        ? [["Attendance Rate", `${data.attendanceRate}%`]]
        : []),
      ...(data.outcome
        ? [
            ["Employment Status", data.outcome.status],
            ["Job Title", data.outcome.jobTitle ?? "—"],
            [
              "Hourly Wage",
              data.outcome.wage != null ? `$${data.outcome.wage.toFixed(2)}` : "—",
            ],
          ]
        : []),
    ],
    theme: "striped",
    headStyles: { fillColor: [95, 163, 70], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  if (data.goals?.length) {
    autoTable(doc, {
      startY: y,
      head: [["Goal", "Status"]],
      body: data.goals.map((g) => [g.title, g.status]),
      theme: "grid",
      headStyles: { fillColor: [42, 47, 57], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  if (data.milestones?.length) {
    autoTable(doc, {
      startY: y,
      head: [["Milestone", "Status"]],
      body: data.milestones.map((m) => [m.name, m.status]),
      theme: "grid",
      headStyles: { fillColor: [42, 47, 57], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  if (data.courses && data.courses.rows.length) {
    autoTable(doc, {
      startY: y,
      head: [["Course", "Status", "Completion", "Best Quiz"]],
      body: data.courses.rows.map((c) => [
        c.title,
        c.status,
        `${c.completion}%`,
        c.bestQuizScore != null ? `${c.bestQuizScore}%` : "—",
      ]),
      foot: [
        [
          `Enrolled ${data.courses.enrolled} · Completed ${data.courses.completed} · Quizzes passed ${data.courses.quizzesPassed}`,
          "",
          "",
          data.courses.avgQuizScore != null ? `Avg ${data.courses.avgQuizScore}%` : "",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [95, 163, 70], textColor: 255 },
      footStyles: { fillColor: [42, 47, 57], textColor: 255, fontSize: 7 },
      styles: { fontSize: 8, cellPadding: 1.8 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(options?.filename ?? `participant-${slugify(data.code)}.pdf`);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
