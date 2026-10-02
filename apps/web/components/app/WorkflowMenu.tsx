"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** The "Alur kerja" button for a project that has more than one workflow: opens a short list to pick from. */
export function WorkflowMenu({ projectId, workflows }: { projectId: string; workflows: { id: string; name: string }[] }) {
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

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="sv-card sv-hover flex min-h-32 w-full items-end justify-between gap-4 p-6 text-left"
      >
        <span className="text-2xl font-medium tracking-[-0.035em]">Alur kerja</span>
        <span className="sv-label">{workflows.length} alur {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <ul role="menu" className="absolute inset-x-0 top-full z-20 mt-2 rounded-2xl border border-border-strong bg-popover p-2 shadow-2xl">
          {workflows.map((w) => (
            <li key={w.id}>
              <Link
                role="menuitem"
                href={`/projects/${projectId}/workflows/${w.id}`}
                className="block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                {w.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
