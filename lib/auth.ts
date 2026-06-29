import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/db";

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/iep";
    case "admin":
      return "/admin";
    case "staff":
      return "/staff";
    default:
      return "/me";
  }
}

/**
 * Returns the signed-in user's auth record + profile, or null if not signed in.
 * Safe to call from any Server Component / Route Handler.
 */
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, email: user.email ?? null, profile: profile ?? null };
}

/**
 * Guards a portal section. Redirects to /login when signed out, or to the
 * caller's own home when their role doesn't match. Returns the profile on success.
 */
export async function requireRole(allowed: UserRole | UserRole[]): Promise<Profile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const profile = session.profile;
  if (!profile) {
    // Authenticated but no profile row — treat as unconfigured; bounce to login.
    redirect("/login");
  }

  const allowList = Array.isArray(allowed) ? allowed : [allowed];
  // IEP master (super_admin) is allowed anywhere an org admin is allowed.
  if (allowList.includes("admin") && !allowList.includes("super_admin")) {
    allowList.push("super_admin");
  }
  if (!allowList.includes(profile.role)) {
    redirect(homePathForRole(profile.role));
  }
  return profile;
}

/**
 * Returns the signed-in user's organization id (profiles.organization_id), or
 * null for super_admin / IEP master (who oversees all orgs) and signed-out users.
 * Use to scope org-admin / staff queries at the application layer.
 */
export async function getMyOrgId(): Promise<string | null> {
  const session = await getSessionProfile();
  return session?.profile?.organization_id ?? null;
}

/**
 * Returns the current profile's role + organization id, or null when signed out.
 * Convenience for callers that need both without re-fetching.
 */
export async function getRoleAndOrg(): Promise<{
  role: UserRole;
  orgId: string | null;
} | null> {
  const session = await getSessionProfile();
  if (!session?.profile) return null;
  return {
    role: session.profile.role,
    orgId: session.profile.organization_id ?? null,
  };
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "there";
  return fullName.split(" ")[0];
}
