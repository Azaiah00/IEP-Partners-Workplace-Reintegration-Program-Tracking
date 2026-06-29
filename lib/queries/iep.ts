import { createClient } from "@/lib/supabase/server";
import type { Organization, EmploymentStatus } from "@/types/db";

const PLACED: EmploymentStatus[] = [
  "placed",
  "retained_30",
  "retained_90",
  "retained_180",
];

export type OrgRollup = {
  org: Organization;
  participants: number;
  active: number;
  completionRate: number; // % of participants with status=completed
  placementRate: number; // % of participants placed
  placements: number;
  staffCount: number;
  paidWorkExperience: number; // distinct participants with a paid_work_experience WBL
};

export type MasterOverview = {
  orgs: OrgRollup[];
  totals: {
    organizations: number;
    participants: number;
    active: number;
    completionRate: number;
    placementRate: number;
    paidWorkExperience: number;
    staffCount: number;
  };
};

/** Fetch a single organization (super_admin / org-detail drill-in). */
export async function getOrganization(id: string): Promise<Organization | null> {
  const sb = createClient();
  const { data } = await sb
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Organization | null;
}

/** Staff + participant roster for one org (org-detail page). */
export async function getOrgPeople(orgId: string) {
  const sb = createClient();
  const [staffRes, partsRes] = await Promise.all([
    sb
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("organization_id", orgId)
      .in("role", ["admin", "staff"])
      .order("role"),
    sb
      .from("participants")
      .select(
        "id, participant_code, current_tier, status, region, intake_date, profile:profiles!participants_profile_id_fkey(full_name)",
      )
      .eq("organization_id", orgId)
      .order("participant_code"),
  ]);
  const staff = (staffRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.full_name ?? "—",
    email: s.email ?? "—",
    role: s.role as string,
  }));
  const participants = (partsRes.data ?? []).map((p) => {
    const prof = Array.isArray((p as any).profile)
      ? (p as any).profile[0]
      : (p as any).profile;
    return {
      id: p.id,
      code: p.participant_code,
      name: prof?.full_name ?? p.participant_code,
      tier: p.current_tier as string,
      status: p.status as string,
      region: p.region ?? "Unassigned",
      intake: p.intake_date,
    };
  });
  return { staff, participants };
}

/**
 * Master overview across ALL organizations. super_admin's RLS sees every row,
 * so the normal server client is sufficient. Aggregates per-org rollups plus
 * global totals — mirrors the aggregation logic in lib/queries/admin.ts.
 */
export async function getMasterOverview(): Promise<MasterOverview> {
  const sb = createClient();

  const [orgsRes, partsRes, outcomesRes, wblRes, staffRes] = await Promise.all([
    sb.from("organizations").select("*").order("type").order("name"),
    sb.from("participants").select("id, organization_id, status"),
    sb.from("outcomes").select("participant_id, employment_status"),
    sb.from("work_based_learning").select("participant_id, type"),
    sb
      .from("profiles")
      .select("id, organization_id, role")
      .in("role", ["admin", "staff"]),
  ]);

  const orgs = (orgsRes.data ?? []) as Organization[];
  const parts = (partsRes.data ?? []) as {
    id: string;
    organization_id: string | null;
    status: string;
  }[];
  const outcomes = (outcomesRes.data ?? []) as {
    participant_id: string;
    employment_status: string;
  }[];
  const wbl = (wblRes.data ?? []) as { participant_id: string; type: string }[];
  const staff = (staffRes.data ?? []) as {
    id: string;
    organization_id: string | null;
    role: string;
  }[];

  // Map participant -> org so we can attribute outcomes / wbl.
  const partOrg = new Map(parts.map((p) => [p.id, p.organization_id]));
  const placedByPart = new Set(
    outcomes
      .filter((o) => PLACED.includes(o.employment_status as EmploymentStatus))
      .map((o) => o.participant_id),
  );
  const paidByPart = new Set(
    wbl.filter((w) => w.type === "paid_work_experience").map((w) => w.participant_id),
  );

  const rollups: OrgRollup[] = orgs
    // Exclude the IEP master org itself from the per-client rollup list (it has
    // no participants of its own; it oversees the others). Keep all client orgs.
    .filter((o) => o.type !== "iep_master")
    .map((org) => {
      const op = parts.filter((p) => p.organization_id === org.id);
      const total = op.length;
      const active = op.filter((p) => p.status === "active").length;
      const completed = op.filter((p) => p.status === "completed").length;
      const placements = op.filter((p) => placedByPart.has(p.id)).length;
      const paid = op.filter((p) => paidByPart.has(p.id)).length;
      const staffCount = staff.filter((s) => s.organization_id === org.id).length;
      return {
        org,
        participants: total,
        active,
        completionRate: total ? Math.round((completed / total) * 100) : 0,
        placementRate: total ? Math.round((placements / total) * 100) : 0,
        placements,
        staffCount,
        paidWorkExperience: paid,
      };
    })
    .sort((a, b) => b.participants - a.participants);

  // Global totals (only over orgs that have participants — exclude unassigned).
  const allClientParts = parts.filter((p) => {
    const o = partOrg.get(p.id);
    return o && orgs.some((org) => org.id === o && org.type !== "iep_master");
  });
  const gTotal = allClientParts.length;
  const gActive = allClientParts.filter((p) => p.status === "active").length;
  const gCompleted = allClientParts.filter((p) => p.status === "completed").length;
  const gPlaced = allClientParts.filter((p) => placedByPart.has(p.id)).length;
  const gPaid = allClientParts.filter((p) => paidByPart.has(p.id)).length;
  const gStaff = staff.filter(
    (s) => s.organization_id && orgs.some((o) => o.id === s.organization_id && o.type !== "iep_master"),
  ).length;

  return {
    orgs: rollups,
    totals: {
      organizations: rollups.length,
      participants: gTotal,
      active: gActive,
      completionRate: gTotal ? Math.round((gCompleted / gTotal) * 100) : 0,
      placementRate: gTotal ? Math.round((gPlaced / gTotal) * 100) : 0,
      paidWorkExperience: gPaid,
      staffCount: gStaff,
    },
  };
}
