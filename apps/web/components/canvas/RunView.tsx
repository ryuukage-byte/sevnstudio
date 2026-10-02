"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge as FlowEdge } from "@xyflow/react";
import { checklistStatus, transition, type Snapshot, type StageEvent, type StoredStatus } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { computeRunView, type RunItemRow } from "@/lib/run/derive";
import { StageNodeView, type StageFlowNode } from "./StageNodeView";
import { statusClass, statusLabel, typeLabel } from "./labels";
import { cn } from "@/lib/utils";

const nodeTypes = { stage: StageNodeView };

interface Props {
  projectId: string;
  runId: string;
  runName: string;
  snapshot: Snapshot;
  initialStored: Record<string, StoredStatus>;
  initialItems: RunItemRow[];
}

export function RunView({ projectId, runId, runName, snapshot, initialStored, initialItems }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [stored, setStored] = useState(initialStored);
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const view = useMemo(() => computeRunView(snapshot, stored, items), [snapshot, stored, items]);
  const stagesById = useMemo(() => new Map(snapshot.stages.map((s) => [s.id, s] as const)), [snapshot]);

  const saveStageStatus = async (stageId: string, status: StoredStatus) => {
    setStored((s) => ({ ...s, [stageId]: status }));
    const { error: err } = await supabase
      .from("stage_runs")
      .upsert({ run_id: runId, stage_id: stageId, status }, { onConflict: "run_id,stage_id" });
    if (err) setError("Status stage gagal disimpan.");
  };

  const toggleItem = async (item: RunItemRow) => {
    if (view.blockedBy[item.stage_id]) return; // locked: reason is shown in the panel
    setError(null);
    const status: RunItemRow["status"] = item.status === "DONE" ? "TODO" : "DONE";
    const updated_at = new Date().toISOString();
    const next = items.map((i) => (i.id === item.id ? { ...i, status, updated_at } : i));
    setItems(next);
    const { error: err } = await supabase.from("run_items").update({ status, updated_at }).eq("id", item.id);
    if (err) {
      setItems((cur) => cur.map((i) => (i.id === item.id ? item : i)));
      return setError("Centang gagal disimpan.");
    }
    const own = next.filter((i) => i.stage_id === item.stage_id);
    await saveStageStatus(item.stage_id, checklistStatus(own.filter((i) => i.status === "DONE").length, own.length));
  };

  const fireEvent = async (stageId: string, event: StageEvent) => {
    const stage = stagesById.get(stageId);
    const model = stage && getHandler(stage.type)?.statusModel;
    if (!stage || !model) return;
    const result = transition(model, stored[stageId], event, stage.mode);
    if (result.ok) await saveStageStatus(stageId, result.status);
  };

  const nodes: StageFlowNode[] = snapshot.stages.map((s) => {
    const status = s.type === "group" ? undefined : view.statuses[s.id];
    const blocked = view.blockedBy[s.id];
    return {
      id: s.id,
      type: "stage",
      position: { x: s.posX, y: s.posY },
      selected: s.id === selectedId,
      draggable: false,
      connectable: false,
      data: {
        name: s.name,
        type: s.type,
        groupName: snapshot.stages.find((g) => g.id === s.parentGroupId)?.name ?? null,
        status,
        progress: view.progress[s.id],
        lockReason: blocked ? `Menunggu: ${blocked.join(", ")}` : undefined,
      },
    };
  });

  const edges: FlowEdge[] = snapshot.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.kind === "flow" ? "flow" : undefined,
    style: e.kind === "flow" ? { strokeDasharray: "6 4" } : { strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  const selected = selectedId ? stagesById.get(selectedId) : undefined;
  const selStatus = selected ? view.statuses[selected.id] : undefined;
  const selBlocked = selected ? view.blockedBy[selected.id] : undefined;
  const selItems = selected ? items.filter((i) => i.stage_id === selected.id).sort((a, b) => a.sort_order - b.sort_order) : [];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2">
        <Link href={`/projects/${projectId}`} className="text-sm text-muted-foreground hover:underline">← Project</Link>
        <h1 className="font-medium">{runName}</h1>
        <span className="text-xs text-muted-foreground">Run: perubahan di sini tidak mengubah workflow atau run lain.</span>
      </header>
      {error && <div role="alert" className="border-b bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{error}</div>}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l p-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Pilih stage untuk mengerjakannya. Stage terkunci menunjukkan stage mana yang ditunggu.</p>
          ) : (
            <>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{typeLabel[selected.type] ?? selected.type}</div>
                <h2 className="font-medium">{selected.name}</h2>
                {selStatus && selected.type !== "group" && (
                  <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-xs", statusClass[selStatus] ?? "bg-secondary")}>
                    {statusLabel[selStatus] ?? selStatus}
                  </span>
                )}
              </div>

              {selBlocked && (
                <p className="rounded-lg border bg-muted p-2 text-sm">
                  Terkunci. Selesaikan dulu: <strong>{selBlocked.join(", ")}</strong>.
                </p>
              )}

              {selected.type === "checklist" && (
                <ul className="space-y-1">
                  {selItems.length === 0 && <li className="text-sm text-muted-foreground">Ceklis ini belum punya item.</li>}
                  {selItems.map((item) => (
                    <li key={item.id}>
                      <label className={cn("flex items-center gap-2 rounded p-1.5 text-sm", selBlocked ? "opacity-50" : "cursor-pointer hover:bg-muted")}>
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={item.status === "DONE"}
                          disabled={!!selBlocked}
                          onChange={() => toggleItem(item)}
                        />
                        <span className={cn("flex-1", item.status === "DONE" && "text-muted-foreground line-through")}>{item.title}</span>
                        {item.qty > 1 && <span className="text-xs text-muted-foreground">×{item.qty}</span>}
                        {item.due_date && <span className="text-xs text-muted-foreground">{item.due_date}</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {(selected.type === "task" || selected.type === "note") && (
                <div className="space-y-3">
                  {selected.type === "task" && selected.config.dueDate ? (
                    <p className="text-sm">Tenggat: {String(selected.config.dueDate)}</p>
                  ) : null}
                  {(selected.config.notes || selected.config.body) ? (
                    <p className="whitespace-pre-wrap text-sm">{String(selected.config.notes ?? selected.config.body)}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!!selBlocked || selStatus === "DOING"} onClick={() => fireEvent(selected.id, "SET_DOING")}>Mulai</Button>
                    <Button size="sm" disabled={!!selBlocked || selStatus === "DONE"} onClick={() => fireEvent(selected.id, "SET_DONE")}>Selesai</Button>
                    <Button size="sm" variant="ghost" disabled={!!selBlocked || (selStatus !== "DOING" && selStatus !== "DONE")} onClick={() => fireEvent(selected.id, "SET_TODO")}>Reset</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
