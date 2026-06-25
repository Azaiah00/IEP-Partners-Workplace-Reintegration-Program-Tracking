"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { addParticipantDocument, createDocSignedUrl } from "@/lib/actions/participant";
import { humanize } from "@/lib/utils";
import type { DocumentRow, DocType } from "@/types/db";

const TYPES: DocType[] = ["resume", "certificate", "credential", "other"];

export function DocumentsManager({
  participantId,
  documents,
}: {
  participantId: string;
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocType>("resume");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [downloading, setDownloading] = useState<string | null>(null);

  async function upload() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${participantId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const res = await addParticipantDocument({
        title: title.trim() || file.name,
        type,
        storagePath: path,
      });
      if (!res.ok) throw new Error(res.error);

      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function download(doc: DocumentRow) {
    if (!doc.storage_path) return;
    setDownloading(doc.id);
    start(async () => {
      const res = await createDocSignedUrl(doc.storage_path!);
      setDownloading(null);
      if (res.ok) window.open(res.url, "_blank");
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Upload a document</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Resume"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DocType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {humanize(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={upload} disabled={uploading || !file} size="default">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-raised file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-raised/70"
          />
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Files are private and stored securely. Only you and your case manager can access them.
        </p>
      </div>

      <ul className="space-y-2">
        {documents.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
              <p className="text-xs text-muted-foreground">
                {humanize(d.type)} · {d.created_at.slice(0, 10)}
              </p>
            </div>
            {d.storage_path ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => download(d)}
                disabled={pending && downloading === d.id}
              >
                {pending && downloading === d.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download
              </Button>
            ) : (
              <Badge variant="muted">On file</Badge>
            )}
          </li>
        ))}
        {documents.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No documents yet. Upload your resume or certificates above.
          </li>
        )}
      </ul>
    </div>
  );
}
