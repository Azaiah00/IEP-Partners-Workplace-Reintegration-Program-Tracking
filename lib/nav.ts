import type { NavItem } from "@/components/layout/icon-rail";

/** Role-aware navigation for the left icon rail.
 * Icons are string keys resolved inside the client IconRail (keeps this
 * config serializable from Server Components). */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/participants", label: "Participants", icon: "participants" },
  { href: "/admin/curriculum", label: "Curriculum", icon: "curriculum" },
  { href: "/admin/employers", label: "Employers", icon: "employers" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
];

export const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "Dashboard", icon: "dashboard" },
  { href: "/staff/caseload", label: "Caseload", icon: "participants" },
  { href: "/staff/attendance", label: "Attendance", icon: "attendance" },
  { href: "/staff/employers", label: "Employers", icon: "employers" },
  { href: "/staff/wbl", label: "Work-Based Learning", icon: "curriculum" },
];

export const PARTICIPANT_NAV: NavItem[] = [
  { href: "/me", label: "Dashboard", icon: "dashboard" },
  { href: "/me/progress", label: "My Progress", icon: "curriculum" },
  { href: "/me/goals", label: "Goals & Milestones", icon: "goals" },
  { href: "/me/documents", label: "Documents", icon: "documents" },
];

// FUTURE: additional surfaces to scaffold here —
//   • Employer Portal (separate role + nav) for self-service hiring engagement
//   • Participant ↔ staff messaging
//   • Resource library + community-partner access
//   • Digital credential wallet (extends /me/documents)
