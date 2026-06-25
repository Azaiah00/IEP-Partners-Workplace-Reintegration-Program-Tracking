"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };
type UrlResult = { ok: true; url: string } | { ok: false; error: string };

async function myParticipantId(sb: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await sb
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!data) throw new Error("No participant record for this account");
  return { participantId: data.id, userId: user.id };
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
    const sb = createClient();
    const { participantId, userId } = await myParticipantId(sb);
    const { error } = await sb.from("documents").insert({
      participant_id: participantId,
      type: data.type,
      title: data.title,
      storage_path: data.storagePath,
      uploaded_by: userId,
    });
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
