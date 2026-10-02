"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateProjectDescription } from "@/app/(app)/projects/actions";

const MAX = 500;

/** Short description of the project, shown under its title. Click "Ubah" (or "Tambah deskripsi") to edit in place. */
export function ProjectDescription({ projectId, initial }: { projectId: string; initial: string | null }) {
  const [saved, setSaved] = useState(initial ?? "");
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const next = draft.trim();
    if (next === saved) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateProjectDescription(projectId, next);
      if (result.ok) {
        setSaved(next);
        setEditing(false);
      } else {
        setError(result.message);
      }
    });
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX}
          rows={3}
          aria-label="Deskripsi proyek"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(saved);
              setEditing(false);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
          className="w-full rounded-xl border border-border bg-[#0a0a0a] px-3.5 py-2.5 text-[15px] font-light leading-7 text-foreground outline-none focus-visible:border-white/25 focus-visible:ring-4 focus-visible:ring-white/[0.03]"
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending} onClick={save}>{pending ? "Menyimpan…" : "Simpan"}</Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setDraft(saved);
              setError(null);
              setEditing(false);
            }}
          >
            Batal
          </Button>
          <span className="sv-label ml-auto">{draft.length}/{MAX}</span>
        </div>
      </div>
    );
  }

  return saved ? (
    <p className="group">
      {saved}{" "}
      <button
        type="button"
        onClick={() => {
          setDraft(saved);
          setEditing(true);
        }}
        className="sv-label ml-1 align-middle transition-colors hover:text-foreground"
      >
        Ubah
      </button>
    </p>
  ) : (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="sv-label transition-colors hover:text-foreground"
    >
      + Tambah deskripsi
    </button>
  );
}
