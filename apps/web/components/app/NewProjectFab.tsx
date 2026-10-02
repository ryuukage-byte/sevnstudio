"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, FilePlus2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromptDialog, StageDialog } from "@/components/canvas/StageDialog";

interface Props {
  templates: { id: string; name: string }[];
  createBlank: (formData: FormData) => Promise<void>;
  createFromTemplate: (templateId: string, formData: FormData) => Promise<void>;
}

// Fan-out positions around the + button, opening up and to the left (the button sits in the bottom-right corner).
// Same spring easing and staggered delays as the reference animation (cubic-bezier(.34,1.56,.64,1)).
const ITEMS = [
  { key: "blank", label: "Kosong", Icon: FilePlus2, x: 0, y: -84, delay: 0.02 },
  { key: "preset", label: "Preset", Icon: Sparkles, x: -59, y: -59, delay: 0.07 },
  { key: "template", label: "Template", Icon: Bookmark, x: -84, y: 0, delay: 0.12 },
] as const;

type Choice = (typeof ITEMS)[number]["key"];

/** Floating "new project" button in the bottom-right corner that fans out into three ways to start. */
export function NewProjectFab({ templates, createBlank, createFromTemplate }: Props) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"blank" | "template" | null>(null);
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

  const choose = (key: Choice) => {
    setOpen(false);
    if (key === "preset") document.getElementById("preset")?.scrollIntoView({ behavior: "smooth", block: "start" });
    else setDialog(key);
  };

  return (
    <>
      <div ref={box} className="fixed bottom-6 right-6 z-40 size-14">
        {ITEMS.map(({ key, label, Icon, x, y, delay }) => (
          <div
            key={key}
            className="absolute left-1/2 top-1/2 -ml-[23px] -mt-[23px] size-[46px]"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? `translate(${x}px, ${y}px)` : "scale(0.4)",
              transition: `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${open ? delay : 0}s, opacity 0.3s ${open ? delay : 0}s`,
              pointerEvents: open ? "auto" : "none",
            }}
          >
            <button
              type="button"
              aria-label={label}
              tabIndex={open ? 0 : -1}
              onClick={() => choose(key)}
              className="grid size-full place-items-center rounded-full border border-border-strong bg-popover text-foreground shadow-lg transition-colors hover:bg-accent"
            >
              <Icon className="size-[18px]" aria-hidden />
            </button>
            <span className="sv-label pointer-events-none absolute right-full top-1/2 mr-2.5 -translate-y-1/2 whitespace-nowrap !text-[10px] !text-foreground/80">
              {label}
            </span>
          </div>
        ))}

        <button
          type="button"
          aria-label="Proyek baru"
          aria-expanded={open}
          disabled={pending}
          onClick={() => setOpen((v) => !v)}
          className="relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <Plus className={`size-6 transition-transform duration-300 ${open ? "rotate-[135deg]" : ""}`} aria-hidden />
        </button>
      </div>

      {dialog === "blank" && (
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

      {dialog === "template" && (
        <TemplateDialog
          templates={templates}
          onClose={() => setDialog(null)}
          onSubmit={(templateId, name) => {
            const data = new FormData();
            data.set("name", name);
            startTransition(() => createFromTemplate(templateId, data));
          }}
        />
      )}
    </>
  );
}

function TemplateDialog({
  templates,
  onClose,
  onSubmit,
}: {
  templates: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (templateId: string, name: string) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(templates[0]?.id ?? null);
  const [name, setName] = useState(templates[0]?.name ?? "");

  return (
    <StageDialog title="Dari template" onClose={onClose} closeLabel="Tutup">
      {templates.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Belum ada template. Buka sebuah alur kerja, lalu pilih <strong className="font-medium text-foreground">Simpan sebagai template</strong>.
        </p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (chosen && n) onSubmit(chosen, n);
          }}
        >
          <ul className="space-y-2" role="radiogroup" aria-label="Pilih template">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chosen === t.id}
                  onClick={() => {
                    setChosen(t.id);
                    setName(t.name);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                    chosen === t.id ? "border-white/40 bg-white/[0.04]" : "border-border hover:bg-accent"
                  }`}
                >
                  <span>{t.name}</span>
                  {chosen === t.id && <span aria-hidden>✓</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="tpl-project-name">Nama proyek</Label>
            <Input id="tpl-project-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!chosen || !name.trim()}>Buat proyek</Button>
          </div>
        </form>
      )}
    </StageDialog>
  );
}
