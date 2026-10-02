"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const date = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/** Dropdown of this project's earlier pengerjaan, so they stay reachable from the workflow page. */
export function RunsMenu({ projectId, runs }: { projectId: string; runs: { id: string; name: string; created_at: string }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (runs.length === 0) return null;

  return (
    <div ref={box} className="relative">
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Pengerjaan ({runs.length}) <span aria-hidden>{open ? "▴" : "▾"}</span>
      </Button>
      {open && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-border-strong bg-popover p-2 shadow-2xl">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                role="menuitem"
                href={`/projects/${projectId}/runs/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <span className="truncate">{r.name}</span>
                <span className="sv-label shrink-0">{date(r.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
