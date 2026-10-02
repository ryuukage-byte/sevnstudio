"use client";

import { useMemo } from "react";
import { connectedGroups, snapshotToGraph, type DerivedStatus, type Snapshot } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RunItemRow } from "@/lib/run/derive";
import { statusLabel, statusTone } from "@/components/canvas/labels";

interface Props {
  snapshot: Snapshot;
  items: RunItemRow[];
  statuses: Record<string, DerivedStatus>;
  blockedBy: Record<string, string[]>;
  progress: Record<string, string>;
  onToggleItem: (item: RunItemRow) => void;
  onStageEvent: (stageId: string, event: "SET_DOING" | "SET_DONE" | "SET_TODO") => void;
}

/** Mobile-first vertical list of the run: sectioned by kelompok (steps joined by lines), in flow order, big touch targets. */
export function ChecklistMode({ snapshot, items, statuses, blockedBy, progress, onToggleItem, onStageEvent }: Props) {
  const sections = useMemo(() => {
    const { nodes, edges } = snapshotToGraph(snapshot, (t) => getHandler(t)?.statusModel ?? "none");
    const byId = new Map(snapshot.stages.map((s) => [s.id, s] as const));
    // Kelompok = steps joined by lines. Unconnected steps go under "Lainnya". Headings only when there is more than one section.
    const { groups, loose } = connectedGroups(nodes, edges);
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
    const result = groups.map((ids) => ({ key: ids[0] as string, title: "", stages: pick(ids) }));
    if (loose.length) result.push({ key: "loose", title: "", stages: pick(loose) });
    const multiple = result.length > 1;
    return result.map((s, i) => ({
      ...s,
      title: !multiple ? "" : s.key === "loose" ? "Lainnya" : `Kelompok ${i + 1}: ${s.stages[0]?.name ?? ""}`,
    }));
  }, [snapshot]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-5 pb-24">
      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          {section.title && <h2 className="sv-eyebrow px-1 !font-normal">{section.title}</h2>}
          {section.stages.map((stage) => {
            const status = statuses[stage.id] ?? "TODO";
            const blocked = blockedBy[stage.id];
            const own = items.filter((i) => i.stage_id === stage.id).sort((a, b) => a.sort_order - b.sort_order);
            const done = status === "DONE" || status === "APPROVED";
            return (
              <details key={stage.id} open={!done && !blocked} className="sv-card group overflow-hidden">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <span className="flex-1 font-[family-name:var(--font-heading)] text-lg font-medium tracking-[-0.03em]">{stage.name}</span>
                  {progress[stage.id] && <span className="font-mono text-xs text-muted-foreground">{progress[stage.id]}</span>}
                  <span className="sv-badge" data-tone={statusTone[status] ?? ""}>{statusLabel[status] ?? status}</span>
                </summary>
                {blocked && (
                  <p className="mx-4 mb-3 rounded-xl border border-border-strong bg-secondary p-3 text-sm leading-6">
                    Belum bisa dikerjakan. Selesaikan dulu: <strong className="font-medium">{blocked.join(", ")}</strong>.
                  </p>
                )}
                {stage.type === "checklist" && (
                  <ul className="border-t border-border pb-1">
                    {own.length === 0 && <li className="px-4 py-4 text-sm text-muted-foreground">Ceklis ini masih kosong.</li>}
                    {own.map((item) => (
                      <li key={item.id}>
                        <label className={cn("flex min-h-14 items-center gap-3.5 px-4 py-2.5", blocked ? "opacity-50" : "active:bg-accent")}>
                          <input
                            type="checkbox"
                            className="size-6 shrink-0 accent-[#f4f4f2]"
                            checked={item.status === "DONE"}
                            disabled={!!blocked}
                            onChange={() => onToggleItem(item)}
                          />
                          <span className={cn("flex-1 text-base", item.status === "DONE" && "text-muted-foreground line-through")}>{item.title}</span>
                          {item.qty > 1 && <span className="font-mono text-xs text-muted-foreground">×{item.qty}</span>}
                          {item.due_date && <span className="font-mono text-[11px] text-muted-foreground">{item.due_date}</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {(stage.type === "task" || stage.type === "note") && (
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    {(stage.config.notes || stage.config.body) ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{String(stage.config.notes ?? stage.config.body)}</p>
                    ) : null}
                    {stage.type === "task" && stage.config.dueDate ? <p className="text-sm">Tenggat: {String(stage.config.dueDate)}</p> : null}
                    <div className="flex gap-2">
                      {stage.type === "task" && (
                        <Button className="h-11 flex-1" variant="outline" disabled={!!blocked || status === "DOING"} onClick={() => onStageEvent(stage.id, "SET_DOING")}>Mulai</Button>
                      )}
                      <Button className="h-11 flex-1" disabled={!!blocked || status === "DONE"} onClick={() => onStageEvent(stage.id, "SET_DONE")}>Selesai</Button>
                      <Button className="h-11" variant="ghost" disabled={!!blocked || (status !== "DOING" && status !== "DONE")} onClick={() => onStageEvent(stage.id, "SET_TODO")}>Reset</Button>
                    </div>
                  </div>
                )}
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}
