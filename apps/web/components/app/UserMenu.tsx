"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { signOut } from "@/app/login/actions";

const LINKS: { href: string; label: string; hint: string; Icon: LucideIcon }[] = [
  { href: "/settings#profil", label: "Profil", hint: "Nama tampilan", Icon: User },
  { href: "/settings#akun", label: "Akun", hint: "Email dan kata sandi", Icon: ShieldCheck },
  { href: "/settings#pengaturan", label: "Pengaturan", hint: "AI dan lainnya", Icon: Settings },
];

/** Avatar button with the usual account dropdown: who you are, Profil, Akun, Pengaturan, Keluar. */
export function UserMenu({ email, name }: { email: string | null; name: string | null }) {
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

  const display = name?.trim() || email?.split("@")[0] || "Akun";
  const initial = display.charAt(0).toUpperCase();

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
        <div role="menu" className="absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-2xl border border-border-strong bg-popover shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border-strong bg-secondary font-mono text-sm">{initial}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{display}</div>
              {email && <div className="truncate text-xs text-muted-foreground">{email}</div>}
            </div>
          </div>

          <div className="p-1.5">
            {LINKS.map(({ href, label, hint, Icon }) => (
              <Link
                key={href}
                role="menuitem"
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1 text-sm">{label}</span>
                <span className="sv-label">{hint}</span>
              </Link>
            ))}
          </div>

          <form action={signOut} className="border-t border-border p-1.5">
            <button
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              Keluar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
