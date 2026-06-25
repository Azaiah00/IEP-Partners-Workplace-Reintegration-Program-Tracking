import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

/**
 * Service-role Supabase client. BYPASSES Row-Level Security.
 *
 * SERVER ONLY. The `server-only` import above makes any accidental client-side
 * import a build-time error. Use exclusively for seeding and trusted admin tasks
 * (e.g. creating auth users via the Admin API). Never expose the key to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin/seed tasks.",
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
