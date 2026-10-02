"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";

/** Avatar button with a small dropdown (email + Keluar). Closes on outside click or Escape. */
export function UserMenu({ email }: { email: string | null }) {
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

  const initial = (email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-full border border-border-strong bg-secondary font-mono text-xs text-foreground transition-colors hover:bg-accent"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-60 rounded-2xl border border-border-strong bg-popover p-2 shadow-2xl">
          <div className="px-3 py-2">
            <div className="sv-label">Masuk sebagai</div>
            <div className="mt-1 truncate text-sm">{email ?? "—"}</div>
          </div>
          <form action={signOut}>
            <button
              role="menuitem"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Keluar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
