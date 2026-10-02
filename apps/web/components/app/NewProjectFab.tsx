"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { FilePlus2, LayoutTemplate, Lock, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { PromptDialog, StageDialog } from "@/components/canvas/StageDialog";
import type { PickerEntry } from "@/lib/presets/entries";
import { cn } from "@/lib/utils";
import { PresetDialog } from "./PresetDialog";

interface Props {
  entries: PickerEntry[];
  createBlank: (formData: FormData) => Promise<void>;
  createFromPreset: (presetKey: string, formData: FormData) => Promise<void>;
  createFromTemplate: (templateId: string, formData: FormData) => Promise<void>;
}

type Choice = "manual" | "preset" | "ai";

// Nearest the + button first. Same spring easing and staggered delays as the reference animation.
const ITEMS: { key: Choice; label: string; note?: string; Icon: LucideIcon; delay: number; locked?: boolean }[] = [
  { key: "manual", label: "Manual", Icon: FilePlus2, delay: 0.02 },
  { key: "preset", label: "Preset", Icon: LayoutTemplate, delay: 0.07 },
  { key: "ai", label: "AI", note: "perlu API", Icon: Sparkles, delay: 0.12, locked: true },
];

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/** Floating "new project" button (bottom-right). Opens a tidy column of three ways to start: Manual, Preset, AI. */
export function NewProjectFab({ entries, createBlank, createFromPreset, createFromTemplate }: Props) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Choice | null>(null);
  const [pending, startTransition] = useTransition();
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

  const itemStyle = (delay: number): CSSProperties => ({
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0) scale(1)" : "translateY(20px) scale(0.5)",
    transformOrigin: "bottom right",
    transition: `transform 0.5s ${SPRING} ${open ? delay : 0}s, opacity 0.3s ${open ? delay : 0}s`,
    pointerEvents: open ? "auto" : "none",
  });

  return (
    <>
      <div ref={box} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <ul className="flex flex-col-reverse items-end gap-2.5" aria-label="Cara memulai proyek">
          {ITEMS.map(({ key, label, note, Icon, delay, locked }) => (
            <li key={key} style={itemStyle(delay)}>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                aria-label={locked ? `${label} (belum aktif, perlu API)` : label}
                onClick={() => {
                  setOpen(false);
                  setDialog(key);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-full border border-border-strong bg-popover py-1.5 pl-4 pr-1.5 shadow-lg transition-colors hover:bg-accent",
                  locked && "text-muted-foreground",
                )}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                  {label}
                  {note && <span className="ml-2 text-[9px] text-faint">{note}</span>}
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  {locked ? <Lock className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-label="Proyek baru"
          aria-expanded={open}
          disabled={pending}
          onClick={() => setOpen((v) => !v)}
          className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <Plus className={cn("size-6 transition-transform duration-300", open && "rotate-[135deg]")} aria-hidden />
        </button>
      </div>

      {dialog === "manual" && (
        <PromptDialog
          title="Proyek baru"
          label="Nama proyek"
          initial=""
          confirmLabel="Buat"
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            const data = new FormData();
            data.set("name", name);
            startTransition(() => createBlank(data));
          }}
        />
      )}

      {dialog === "preset" && (
        <PresetDialog
          entries={entries}
          onClose={() => setDialog(null)}
          onSubmit={(entry, name) => {
            const data = new FormData();
            data.set("name", name);
            startTransition(() => (entry.source === "preset" ? createFromPreset(entry.ref, data) : createFromTemplate(entry.ref, data)));
          }}
        />
      )}

      {dialog === "ai" && (
        <StageDialog title="AI belum aktif" onClose={() => setDialog(null)} closeLabel="Mengerti">
          <p className="text-sm leading-6 text-muted-foreground">
            Dengan AI, alur kerja bisa disusun otomatis dari satu kalimat. Fitur ini aktif setelah Anda menghubungkan API Anda di
            <strong className="font-medium text-foreground"> Pengaturan</strong>. Pengaturan belum tersedia, jadi untuk sekarang pakai Manual atau Preset.
          </p>
        </StageDialog>
      )}
    </>
  );
}
