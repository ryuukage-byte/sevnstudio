"use client";

import { useMemo } from "react";
import { topoOrder, snapshotToGraph, type DerivedStatus, type Snapshot } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RunItemRow } from "@/lib/run/derive";
import { statusClass, statusLabel } from "@/components/canvas/labels";

interface Props {
  snapshot: Snapshot;
  items: RunItemRow[];
  statuses: Record<string, DerivedStatus>;
  blockedBy: Record<string, string[]>;
  progress: Record<string, string>;
  onToggleItem: (item: RunItemRow) => void;
  onStageEvent: (stageId: string, event: "SET_DOING" | "SET_DONE" | "SET_TODO") => void;
}

/** Mobile-first vertical list of the run: grouped by Group, ordered along the edges, big touch targets. */
export function ChecklistMode({ snapshot, items, statuses, blockedBy, progress, onToggleItem, onStageEvent }: Props) {
  const sections = useMemo(() => {
    const { nodes, edges } = snapshotToGraph(snapshot, (t) => getHandler(t)?.statusModel ?? "none");
    const order = topoOrder(nodes, edges) ?? nodes.map((n) => n.id);
    const rank = new Map(order.map((id, i) => [id, i] as const));
    const work = snapshot.stages.filter((s) => s.type !== "group").sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    const groups = snapshot.stages.filter((s) => s.type === "group");
    const result = groups
      .map((g) => ({ key: g.id, title: g.name, stages: work.filter((s) => s.parentGroupId === g.id) }))
      .filter((s) => s.stages.length);
    const loose = work.filter((s) => !s.parentGroupId || !groups.some((g) => g.id === s.parentGroupId));
    if (loose.length) result.push({ key: "loose", title: groups.length ? "Lainnya" : "", stages: loose });
    return result;
  }, [snapshot]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-3 pb-24">
      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          {section.title && <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.title}</h2>}
          {section.stages.map((stage) => {
            const status = statuses[stage.id] ?? "TODO";
            const blocked = blockedBy[stage.id];
            const own = items.filter((i) => i.stage_id === stage.id).sort((a, b) => a.sort_order - b.sort_order);
            const done = status === "DONE" || status === "APPROVED";
            return (
              <details key={stage.id} open={!done && !blocked} className="rounded-xl border bg-card">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2">
                  <span className="flex-1 font-medium">{stage.name}</span>
                  {progress[stage.id] && <span className="text-sm text-muted-foreground">{progress[stage.id]}</span>}
                  <span className={cn("rounded px-1.5 py-0.5 text-xs", statusClass[status] ?? "bg-secondary")}>{statusLabel[status] ?? status}</span>
                </summary>
                {blocked && (
                  <p className="mx-3 mb-2 rounded-lg bg-muted p-2 text-sm">
                    Belum bisa dikerjakan. Selesaikan dulu: <strong>{blocked.join(", ")}</strong>.
                  </p>
                )}
                {stage.type === "checklist" && (
                  <ul className="pb-1">
                    {own.length === 0 && <li className="px-3 pb-3 text-sm text-muted-foreground">Ceklis ini masih kosong.</li>}
                    {own.map((item) => (
                      <li key={item.id}>
                        <label className={cn("flex min-h-12 items-center gap-3 px-3 py-2", blocked ? "opacity-50" : "active:bg-muted")}>
                          <input
                            type="checkbox"
                            className="size-6 shrink-0"
                            checked={item.status === "DONE"}
                            disabled={!!blocked}
                            onChange={() => onToggleItem(item)}
                          />
                          <span className={cn("flex-1 text-base", item.status === "DONE" && "text-muted-foreground line-through")}>{item.title}</span>
                          {item.qty > 1 && <span className="text-sm text-muted-foreground">×{item.qty}</span>}
                          {item.due_date && <span className="text-xs text-muted-foreground">{item.due_date}</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {(stage.type === "task" || stage.type === "note") && (
                  <div className="space-y-3 px-3 pb-3">
                    {(stage.config.notes || stage.config.body) ? (
                      <p className="whitespace-pre-wrap text-sm">{String(stage.config.notes ?? stage.config.body)}</p>
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
