"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Background, ConnectionMode, Controls, MarkerType, MiniMap, ReactFlow, type Edge as FlowEdge } from "@xyflow/react";
import { checklistStatus, transition, type Snapshot, type StageEvent, type StoredStatus } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { ChecklistMode } from "@/components/run/ChecklistMode";
import { computeRunView, type RunItemRow } from "@/lib/run/derive";
import { useRunSync } from "@/lib/sync/useRunSync";
import { useSyncedNodes } from "@/lib/canvas/useSyncedNodes";
import { pickHandles } from "@/lib/canvas/handles";
import { cn } from "@/lib/utils";
import { StageNodeView, type StageFlowNode } from "./StageNodeView";
import { statusLabel, statusTone, typeLabel } from "./labels";
import { InputStageEditor } from "@/components/run/InputStageEditor";

const nodeTypes = { stage: StageNodeView };

interface Props {
  projectId: string;
  projectName: string;
  workflowId: string | null;
  runId: string;
  runName: string;
  snapshot: Snapshot;
  initialStored: Record<string, StoredStatus>;
  initialOutputs?: Record<string, Record<string, unknown>>;
  initialItems: RunItemRow[];
}

export function RunView({ projectId, projectName, workflowId, runId, runName, snapshot, initialStored, initialOutputs, initialItems }: Props) {
  const { items, stored, outputs, pending, online, error, setItemStatus, setStageStatus } = useRunSync({ runId, initialItems, initialStored, initialOutputs });
  const [view, setView] = useState<"list" | "canvas">("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Node positions are a per-device viewing preference for this run; they never change the workflow or the run snapshot.
  const layoutKey = `sevn:layout:${runId}`;
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(layoutKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage read after mount
      if (raw) setLayout(JSON.parse(raw) as Record<string, { x: number; y: number }>);
    } catch {
      /* ignore corrupt or unavailable storage */
    }
  }, [layoutKey]);

  // Phones default to the checklist view; desktop keeps the canvas.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window.matchMedia, unavailable during SSR
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);

  const runView = useMemo(() => computeRunView(snapshot, stored, items), [snapshot, stored, items]);
  const stagesById = useMemo(() => new Map(snapshot.stages.map((s) => [s.id, s] as const)), [snapshot]);

  const doneCount = items.filter((i) => i.status === "DONE").length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;

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

  const saveStageInput = (stageId: string, text: string, markDone: boolean) => {
    const stage = stagesById.get(stageId);
    if (!stage || runView.blockedBy[stageId]) return;
    const nextStatus = markDone ? "DONE" : (stored[stageId] ?? "TODO");
    setStageStatus(stageId, nextStatus, { text });
  };

  const baseNodes = useMemo<StageFlowNode[]>(
    () =>
      snapshot.stages.map((s) => {
        const blocked = runView.blockedBy[s.id];
        return {
          id: s.id,
          type: "stage",
          position: layout[s.id] ?? { x: s.posX, y: s.posY },
          selected: s.id === selectedId,
          draggable: true,
          connectable: false,
          data: {
            name: s.name,
            type: s.type,
            status: s.type === "group" ? undefined : runView.statuses[s.id],
            progress: runView.progress[s.id],
            lockReason: blocked ? `Selesaikan dulu: ${blocked.join(", ")}` : undefined,
          },
        };
      }),
    [snapshot, layout, selectedId, runView],
  );
  const [nodes, onNodesChange] = useSyncedNodes(baseNodes);

  const edges = useMemo<FlowEdge[]>(
    () =>
      snapshot.edges.map((e) => {
        const a = stagesById.get(e.source);
        const b = stagesById.get(e.target);
        const at = (s: typeof a) => (s ? (layout[s.id] ?? { x: s.posX, y: s.posY }) : { x: 0, y: 0 });
        const sides = a && b ? pickHandles(at(a), at(b)) : undefined;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: sides?.sourceHandle,
          targetHandle: sides?.targetHandle,
          label: e.kind === "flow" ? "bebas" : undefined,
          style: e.kind === "flow" ? { strokeDasharray: "6 4" } : { strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed },
        };
      }),
    [snapshot, stagesById, layout],
  );

  const selected = selectedId ? stagesById.get(selectedId) : undefined;
  const selStatus = selected ? runView.statuses[selected.id] : undefined;
  const selBlocked = selected ? runView.blockedBy[selected.id] : undefined;
  const selItems = selected ? items.filter((i) => i.stage_id === selected.id).sort((a, b) => a.sort_order - b.sort_order) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background/60 px-4 py-2.5 md:px-6">
        <nav aria-label="Jejak halaman" className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          <Link href="/projects" className="hidden transition-colors hover:text-foreground sm:inline">Proyek</Link>
          <span aria-hidden className="hidden sm:inline">/</span>
          <Link href={`/projects/${projectId}`} className="max-w-28 truncate transition-colors hover:text-foreground">{projectName}</Link>
          <span aria-hidden>/</span>
          <span className="truncate text-muted-foreground">{runName}</span>
        </nav>

        <div className="flex items-center gap-2" aria-label={`${doneCount} dari ${items.length} selesai`}>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{doneCount}/{items.length}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {workflowId && (
            <Link
              href={`/projects/${projectId}/workflows/${workflowId}`}
              className="hidden rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline"
            >
              Ubah alur kerja
            </Link>
          )}
          <div role="tablist" aria-label="Tampilan" className="flex rounded-xl border border-border-strong p-0.5 text-sm">
            {(["list", "canvas"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn("min-h-8 rounded-[10px] px-3.5 transition-colors", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {v === "list" ? "Daftar" : "Peta"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(!online || pending > 0) && (
        <div
          role="status"
          className={cn("border-b px-4 py-2 text-sm md:px-6", online ? "border-border bg-secondary text-muted-foreground" : "border-[#ffd08a]/25 bg-[#ffd08a]/10 text-[#ffd08a]")}
        >
          {online ? `Mengirim ${pending} perubahan…` : `Tidak ada internet. ${pending ? `${pending} perubahan` : "Perubahan Anda"} akan dikirim otomatis saat tersambung lagi.`}
        </div>
      )}
      {error && <div role="alert" className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive md:px-6">{error}</div>}

      {view === "list" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChecklistMode
            snapshot={snapshot}
            items={items}
            statuses={runView.statuses}
            blockedBy={runView.blockedBy}
            progress={runView.progress}
            outputs={outputs}
            onToggleItem={toggleItem}
            onStageEvent={fireEvent}
            onSaveInput={saveStageInput}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="min-h-[45vh] min-w-0 flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              onNodesChange={onNodesChange}
              onNodeDragStop={(_, n) => {
                const next = { ...layout, [n.id]: n.position };
                setLayout(next);
                try {
                  localStorage.setItem(layoutKey, JSON.stringify(next));
                } catch {
                  /* storage unavailable: the layout just resets on reload */
                }
              }}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              colorMode="dark"
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} size={1.2} color="rgba(255,255,255,0.1)" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor="#3a3a3a" maskColor="rgba(0,0,0,0.6)" className="hidden md:block" />
            </ReactFlow>
          </div>

          <aside className="max-h-[45vh] shrink-0 space-y-4 overflow-y-auto border-t border-border p-4 md:max-h-none md:w-80 md:border-l md:border-t-0">
            {!selected ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Klik sebuah langkah untuk mengerjakannya. Langkah yang masih menunggu akan menunjukkan apa yang harus selesai dulu.
              </p>
            ) : (
              <>
                <div>
                  <div className="sv-label">{typeLabel[selected.type] ?? selected.type}</div>
                  <h2 className="mt-1 text-xl font-medium tracking-[-0.03em]">{selected.name}</h2>
                  {selStatus && selected.type !== "group" && (
                    <span className="sv-badge mt-2" data-tone={statusTone[selStatus] ?? ""}>{statusLabel[selStatus] ?? selStatus}</span>
                  )}
                </div>
                {selBlocked && (
                  <p className="rounded-xl border border-border-strong bg-secondary p-3 text-sm leading-6">
                    Belum bisa dikerjakan. Selesaikan dulu: <strong className="font-medium">{selBlocked.join(", ")}</strong>.
                  </p>
                )}
                {selected.type === "checklist" && (
                  <ul className="space-y-1">
                    {selItems.length === 0 && <li className="text-sm text-muted-foreground">Ceklis ini masih kosong.</li>}
                    {selItems.map((item) => (
                      <li key={item.id}>
                        <label className={cn("flex items-center gap-2.5 rounded-lg p-2 text-sm", selBlocked ? "opacity-50" : "cursor-pointer hover:bg-accent")}>
                          <input type="checkbox" className="size-4 accent-[#f4f4f2]" checked={item.status === "DONE"} disabled={!!selBlocked} onChange={() => toggleItem(item)} />
                          <span className={cn("flex-1", item.status === "DONE" && "text-muted-foreground line-through")}>{item.title}</span>
                          {item.qty > 1 && <span className="font-mono text-[11px] text-muted-foreground">×{item.qty}</span>}
                          {item.due_date && <span className="font-mono text-[11px] text-muted-foreground">{item.due_date}</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {(selected.type === "task" || selected.type === "note") && (
                  <div className="space-y-3">
                    {selected.type === "task" && selected.config.dueDate ? <p className="text-sm">Tenggat: {String(selected.config.dueDate)}</p> : null}
                    {(selected.config.notes || selected.config.body) ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{String(selected.config.notes ?? selected.config.body)}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {selected.type === "task" && (
                        <Button size="sm" variant="outline" disabled={!!selBlocked || selStatus === "DOING"} onClick={() => fireEvent(selected.id, "SET_DOING")}>Mulai</Button>
                      )}
                      <Button size="sm" disabled={!!selBlocked || selStatus === "DONE"} onClick={() => fireEvent(selected.id, "SET_DONE")}>Selesai</Button>
                      <Button size="sm" variant="ghost" disabled={!!selBlocked || (selStatus !== "DOING" && selStatus !== "DONE")} onClick={() => fireEvent(selected.id, "SET_TODO")}>Reset</Button>
                    </div>
                  </div>
                )}
                {selected.type === "input" && (
                  <div className="space-y-3">
                    {selected.config.prompt ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{String(selected.config.prompt)}</p>
                    ) : null}
                    <InputStageEditor
                      initialValue={(outputs[selected.id]?.text as string) ?? ""}
                      placeholder={(selected.config.placeholder as string) ?? "Tulis isian Anda di sini..."}
                      disabled={!!selBlocked}
                      isDone={selStatus === "DONE"}
                      onSave={(val, done) => saveStageInput(selected.id, val, done)}
                      onReset={() => fireEvent(selected.id, "SET_TODO")}
                    />
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
