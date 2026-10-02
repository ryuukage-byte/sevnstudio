"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge as FlowEdge } from "@xyflow/react";
import { checklistStatus, transition, type Snapshot, type StageEvent, type StoredStatus } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { ChecklistMode } from "@/components/run/ChecklistMode";
import { computeRunView, type RunItemRow } from "@/lib/run/derive";
import { useRunSync } from "@/lib/sync/useRunSync";
import { cn } from "@/lib/utils";
import { StageNodeView, type StageFlowNode } from "./StageNodeView";
import { statusClass, statusLabel, typeLabel } from "./labels";

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
  const { items, stored, pending, online, error, setItemStatus, setStageStatus } = useRunSync({ runId, initialItems, initialStored });
  const [view, setView] = useState<"list" | "canvas">("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Phones default to the checklist view; desktop keeps the canvas.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window.matchMedia, unavailable during SSR
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);

  const runView = useMemo(() => computeRunView(snapshot, stored, items), [snapshot, stored, items]);
  const stagesById = useMemo(() => new Map(snapshot.stages.map((s) => [s.id, s] as const)), [snapshot]);

  const toggleItem = (item: RunItemRow) => {
    if (runView.blockedBy[item.stage_id]) return; // locked: the reason is shown next to the stage
    const status: RunItemRow["status"] = item.status === "DONE" ? "TODO" : "DONE";
    const own = items.filter((i) => i.stage_id === item.stage_id).map((i) => (i.id === item.id ? { ...i, status } : i));
    setItemStatus(item, status, checklistStatus(own.filter((i) => i.status === "DONE").length, own.length));
  };

  const fireEvent = (stageId: string, event: StageEvent) => {
    const stage = stagesById.get(stageId);
    const model = stage && getHandler(stage.type)?.statusModel;
    if (!stage || !model || runView.blockedBy[stageId]) return;
    const result = transition(model, stored[stageId], event, stage.mode);
    if (result.ok) setStageStatus(stageId, result.status);
  };

  const nodes: StageFlowNode[] = snapshot.stages.map((s) => {
    const blocked = runView.blockedBy[s.id];
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
        status: s.type === "group" ? undefined : runView.statuses[s.id],
        progress: runView.progress[s.id],
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
  const selStatus = selected ? runView.statuses[selected.id] : undefined;
  const selBlocked = selected ? runView.blockedBy[selected.id] : undefined;
  const selItems = selected ? items.filter((i) => i.stage_id === selected.id).sort((a, b) => a.sort_order - b.sort_order) : [];

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2">
        <Link href={`/projects/${projectId}`} className="text-sm text-muted-foreground hover:underline" aria-label="Kembali ke project">←</Link>
        <h1 className="min-w-0 flex-1 truncate font-medium">{runName}</h1>
        <div role="tablist" aria-label="Tampilan" className="flex rounded-lg border p-0.5 text-sm">
          {(["list", "canvas"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn("min-h-8 rounded-md px-3", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {v === "list" ? "Ceklis" : "Canvas"}
            </button>
          ))}
        </div>
      </header>

      {(!online || pending > 0) && (
        <div role="status" className={cn("border-b px-3 py-1.5 text-sm", online ? "bg-muted" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200")}>
          {online ? `Menyinkronkan ${pending} perubahan…` : `Offline. ${pending ? `${pending} perubahan` : "Perubahan"} akan disinkronkan saat online.`}
        </div>
      )}
      {error && <div role="alert" className="border-b bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{error}</div>}

      {view === "list" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChecklistMode
            snapshot={snapshot}
            items={items}
            statuses={runView.statuses}
            blockedBy={runView.blockedBy}
            progress={runView.progress}
            onToggleItem={toggleItem}
            onStageEvent={fireEvent}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="min-h-[45vh] min-w-0 flex-1">
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
              <MiniMap pannable zoomable nodeColor="#94a3b8" maskColor="rgba(0,0,0,0.08)" className="hidden md:block" />
            </ReactFlow>
          </div>

          <aside className="max-h-[45vh] shrink-0 space-y-4 overflow-y-auto border-t p-3 md:max-h-none md:w-80 md:border-l md:border-t-0">
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
                          <input type="checkbox" className="size-4" checked={item.status === "DONE"} disabled={!!selBlocked} onChange={() => toggleItem(item)} />
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
                    {selected.type === "task" && selected.config.dueDate ? <p className="text-sm">Tenggat: {String(selected.config.dueDate)}</p> : null}
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
      )}
    </div>
  );
}
