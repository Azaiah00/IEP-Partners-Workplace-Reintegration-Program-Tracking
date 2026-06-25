/* eslint-disable no-console */
/**
 * Verifies the three demo logins work and that RLS isolates data correctly.
 * Uses the ANON key + real sign-in (so all policies apply) — never the service key.
 *   npx tsx supabase/verify.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/db";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PASSWORD = "Demo1234!";

async function asUser(email: string) {
  const c = createClient<Database>(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

let failures = 0;
function check(name: string, pass: boolean, detail = "") {
  console.log(`   ${pass ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function main() {
  console.log("→ admin@ieppartners.demo");
  const admin = await asUser("admin@ieppartners.demo");
  const aRole = await admin.rpc("current_role");
  check("role = admin", aRole.data === "admin", String(aRole.data));
  const aParts = await admin.from("participants").select("id", { count: "exact", head: true });
  check("sees all 24 participants", aParts.count === 24, `count=${aParts.count}`);
  const aNotes = await admin.from("case_notes").select("id", { count: "exact", head: true });
  check("can read case_notes", (aNotes.count ?? 0) > 0, `count=${aNotes.count}`);

  console.log("→ staff@ieppartners.demo");
  const staff = await asUser("staff@ieppartners.demo");
  const sRole = await staff.rpc("current_role");
  check("role = staff", sRole.data === "staff", String(sRole.data));
  const sParts = await staff.from("participants").select("id", { count: "exact", head: true });
  check("sees all 24 participants", sParts.count === 24, `count=${sParts.count}`);
  const sNotes = await staff.from("case_notes").select("id", { count: "exact", head: true });
  check("can read case_notes", (sNotes.count ?? 0) > 0, `count=${sNotes.count}`);

  console.log("→ participant@ieppartners.demo");
  const part = await asUser("participant@ieppartners.demo");
  const pRole = await part.rpc("current_role");
  check("role = participant", pRole.data === "participant", String(pRole.data));
  const pParts = await part.from("participants").select("id", { count: "exact", head: true });
  check("sees ONLY own participant row (1)", pParts.count === 1, `count=${pParts.count}`);
  const pNotes = await part.from("case_notes").select("id", { count: "exact", head: true });
  check("CANNOT read case_notes (0)", (pNotes.count ?? 0) === 0, `count=${pNotes.count}`);
  const pLessons = await part.from("lesson_progress").select("id", { count: "exact", head: true });
  check("sees own lesson_progress", (pLessons.count ?? 0) > 0, `count=${pLessons.count}`);
  const pModules = await part.from("curriculum_modules").select("id", { count: "exact", head: true });
  check("can read syllabus (modules)", (pModules.count ?? 0) === 20, `count=${pModules.count}`);
  const pEmployers = await part.from("employers").select("id", { count: "exact", head: true });
  check("CANNOT read employers (0)", (pEmployers.count ?? 0) === 0, `count=${pEmployers.count}`);

  console.log(failures === 0 ? "\n✅ All RLS + login checks passed." : `\n✗ ${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ Verify error:", e);
  process.exit(1);
});
