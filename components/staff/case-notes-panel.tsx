"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Lock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addCaseNote } from "@/lib/actions/staff";
import { initials } from "@/lib/utils";
import type { CaseNote } from "@/types/db";

export function CaseNotesPanel({
  participantId,
  notes,
}: {
  participantId: string;
  notes: (CaseNote & { staffName: string })[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (note.trim().length < 2) {
      setError("Note is too short.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await addCaseNote({ participantId, note: note.trim(), category: category.trim() || undefined });
      if (!res.ok) setError(res.error);
      else {
        setNote("");
        setCategory("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Case notes are visible to staff &amp; admin only — never to participants.
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="space-y-1.5">
            <Label htmlFor="note">New case note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Document a check-in, barrier, or follow-up…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat">Category</Label>
            <Input
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Check-in"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button onClick={submit} disabled={pending} size="sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add note
          </Button>
        </div>
      </div>

      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(n.staffName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{n.staffName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {n.category && <Badge variant="secondary">{n.category}</Badge>}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{n.note}</p>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No case notes yet.
          </li>
        )}
      </ul>
    </div>
  );
}
