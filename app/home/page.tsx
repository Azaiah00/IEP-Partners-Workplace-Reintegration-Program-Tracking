import { redirect } from "next/navigation";
import { getSessionProfile, homePathForRole } from "@/lib/auth";

/** Post-login gate: route the user to their role's portal. */
export default async function HomeGate() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/login");
  redirect(homePathForRole(session.profile.role));
}
