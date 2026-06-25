"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database, DocType } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };
type UrlResult = { ok: true; url: string } | { ok: false; error: string };

type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];

/** Resolve the signed-in user's participant row (RLS-scoped). */
async function myParticipantId() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await sb
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  // Explicit row type — avoids never inference on some CI TypeScript builds.
  const row = data as { id: string } | null;
  if (!row) throw new Error("No participant record for this account");
  return { participantId: row.id, userId: user.id, sb };
}

const docSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  type: z.custom<DocType>(),
  storagePath: z.string().min(1),
});

/** Record metadata for a file the participant already uploaded to Storage. */
export async function addParticipantDocument(
  input: z.infer<typeof docSchema>,
): Promise<Result> {
  try {
    const data = docSchema.parse(input);
    const { participantId, userId, sb } = await myParticipantId();
    const payload: DocumentInsert = {
      participant_id: participantId,
      type: data.type,
      title: data.title,
      storage_path: data.storagePath,
      uploaded_by: userId,
    };
    const { error } = await sb.from("documents").insert(payload);
    if (error) throw error;
    revalidatePath("/me/documents");
    revalidatePath("/me");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }
}

/** Short-lived signed URL so the participant can download their own file. */
export async function createDocSignedUrl(
  storagePath: string,
): Promise<UrlResult> {
  try {
    const sb = createClient();
    const { data, error } = await sb.storage
      .from("documents")
      .createSignedUrl(storagePath, 60);
    if (error || !data) throw error ?? new Error("Could not create link");
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download failed" };
  }
}
