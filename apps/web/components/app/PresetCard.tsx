"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/canvas/StageDialog";
import type { Preset } from "@/lib/presets/types";

interface Props {
  preset: Preset;
  /** Server action bound to the project and preset; reads `name` from the form data. */
  startAction: (formData: FormData) => Promise<void>;
  copyAction: () => Promise<void>;
}

/** Compact preset card. Description, results and steps stay hidden until the user asks for "Detail". */
export function PresetCard({ preset, startAction, copyAction }: Props) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const steps = preset.stages.filter((s) => s.type !== "note");

  return (
    <li className="sv-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="min-w-0 font-[family-name:var(--font-heading)] text-lg font-medium leading-tight tracking-[-0.03em]">{preset.title}</h4>
        <span className="sv-badge shrink-0">{steps.length} langkah</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={() => setAsking(true)}>
          {pending ? "Membuat…" : "Mulai kerjakan"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={open}
          className="text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          Detail <span aria-hidden className={open ? "rotate-90 transition-transform" : "transition-transform"}>›</span>
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          <p className="leading-6 text-muted-foreground">{preset.goal}</p>

          <div>
            <div className="sv-label mb-2">Hasil yang didapat</div>
            <ul className="flex flex-wrap gap-1.5">
              {preset.results.map((r) => (
                <li key={r} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{r}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="sv-label mb-2">Langkah-langkah</div>
            <ol className="space-y-1.5 border-l border-border pl-4">
              {steps.map((s) => (
                <li key={s.key} className={s.decision ? "text-foreground" : "text-muted-foreground"}>{s.name}</li>
              ))}
            </ol>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => copyAction())}
          >
            Salin jadi alur kerja saya (bisa diubah)
          </Button>
        </div>
      )}

      {asking && (
        <PromptDialog
          title={`Mulai kerjakan ${preset.title}`}
          label="Nama pengerjaan"
          initial={`${preset.title} #1`}
          confirmLabel="Mulai"
          onClose={() => setAsking(false)}
          onSubmit={(name) => {
            const data = new FormData();
            data.set("name", name);
            startTransition(() => startAction(data));
          }}
        />
      )}
    </li>
  );
}
