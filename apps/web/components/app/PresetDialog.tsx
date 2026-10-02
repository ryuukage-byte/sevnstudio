"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StageDialog } from "@/components/canvas/StageDialog";
import type { PickerEntry } from "@/lib/presets/entries";
import { cn } from "@/lib/utils";

/**
 * Picks what to start a new project from. Built-in presets and the user's templates are one list;
 * tags tell them apart and filter the list. Details (goal, results, steps) open only on request.
 */
export function PresetDialog({
  entries,
  onClose,
  onSubmit,
}: {
  entries: PickerEntry[];
  onClose: () => void;
  onSubmit: (entry: PickerEntry, projectName: string) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [chosen, setChosen] = useState<PickerEntry | null>(null);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))], [entries]);
  const visible = filter ? entries.filter((e) => e.tags.includes(filter)) : entries;

  return (
    <StageDialog title="Pilih preset" onClose={onClose} closeLabel="Tutup" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saring berdasarkan tag">
          {[null, ...tags].map((t) => (
            <button
              key={t ?? "semua"}
              type="button"
              aria-pressed={filter === t}
              onClick={() => setFilter(t)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                filter === t ? "border-white/40 bg-white/[0.06] text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t ?? "Semua"}
            </button>
          ))}
        </div>

        <ul className="max-h-[42vh] space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Preset">
          {visible.length === 0 && <li className="text-sm text-muted-foreground">Tidak ada yang cocok dengan tag ini.</li>}
          {visible.map((e) => {
            const selected = chosen?.id === e.id;
            const open = detail === e.id;
            return (
              <li key={e.id} className={cn("rounded-xl border transition-colors", selected ? "border-white/40 bg-white/[0.04]" : "border-border")}>
                <div className="flex items-center gap-2 p-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setChosen(e);
                      setName(e.title);
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{selected ? "✓ " : ""}{e.title}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <span key={t} className="sv-label rounded-full border border-border px-2 py-0.5 !text-[9px]">{t}</span>
                        ))}
                      </span>
                    </span>
                    <span className="sv-label shrink-0">{e.steps.length} langkah</span>
                  </button>
                  <Button type="button" size="sm" variant="ghost" aria-expanded={open} className="shrink-0 text-muted-foreground" onClick={() => setDetail(open ? null : e.id)}>
                    Detail <span aria-hidden className={open ? "inline-block rotate-90 transition-transform" : "inline-block transition-transform"}>›</span>
                  </Button>
                </div>

                {open && (
                  <div className="space-y-4 border-t border-border px-4 py-4 text-sm">
                    {e.goal && <p className="leading-6 text-muted-foreground">{e.goal}</p>}
                    {e.results && e.results.length > 0 && (
                      <div>
                        <div className="sv-label mb-2">Hasil yang didapat</div>
                        <ul className="flex flex-wrap gap-1.5">
                          {e.results.map((r) => (
                            <li key={r} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <div className="sv-label mb-2">Langkah-langkah</div>
                      <ol className="space-y-1.5 border-l border-border pl-4">
                        {e.steps.map((s) => (
                          <li key={s.name} className={s.decision ? "text-foreground" : "text-muted-foreground"}>{s.name}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <form
          className="space-y-3 border-t border-border pt-5"
          onSubmit={(ev) => {
            ev.preventDefault();
            const n = name.trim();
            if (chosen && n) onSubmit(chosen, n);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="preset-project-name">Nama proyek</Label>
            <Input
              id="preset-project-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              maxLength={120}
              disabled={!chosen}
              placeholder={chosen ? "" : "Pilih salah satu di atas"}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!chosen || !name.trim()}>Buat proyek</Button>
          </div>
        </form>
      </div>
    </StageDialog>
  );
}
