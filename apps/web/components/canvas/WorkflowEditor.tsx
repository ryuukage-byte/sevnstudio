"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, Controls, MarkerType, MiniMap, Panel, ReactFlow,
  type Connection, type Edge as FlowEdge,
} from "@xyflow/react";
import { validateConnection, type ConnectionError } from "@sevn/engine";
import { getHandler, stageTypes, type StageType } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { persistOp } from "@/lib/editor/persist";
import { useSyncedNodes } from "@/lib/canvas/useSyncedNodes";
import {
  applyOps, deleteStageOps, emptyHistory, pushCommand, redo, undo,
  type EditorState, type Op, type StageRow,
} from "@/lib/editor/state";
import { saveTemplate, startRunFromWorkflow } from "@/app/(app)/projects/actions";
import { StageNodeView, type StageFlowNode } from "./StageNodeView";
import { PromptDialog, StageDialog } from "./StageDialog";
import { StageWorkspace } from "./StageWorkspace";
import { typeLabel } from "./labels";

const nodeTypes = { stage: StageNodeView };

const connectionMessage: Record<ConnectionError, string> = {
  unknown_stage: "Langkah tidak ditemukan.",
  self_loop: "Langkah tidak bisa dihubungkan ke dirinya sendiri.",
  group_edge: "Kelompok tidak perlu dihubungkan. Masukkan langkah ke kelompok lewat tombol Ubah pada langkah.",
  duplicate: "Dua langkah itu sudah terhubung.",
  cycle: "Tidak bisa: hubungan itu membuat langkah saling menunggu tanpa ujung.",
};

type Selection = { kind: "stage" | "edge"; id: string } | null;

interface Props {
  projectId: string;
  workflowId: string;
  workflowName: string;
  projectName: string;
  initial: EditorState;
}

export function WorkflowEditor({ projectId, workflowId, workflowName, projectName, initial }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState(initial);
  const [history, setHistory] = useState(emptyHistory);
  const [selection, setSelection] = useState<Selection>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ask, setAsk] = useState<"template" | "run" | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; sx: number; sy: number } | null>(null);
  const [menu, setMenu] = useState<{ sx: number; sy: number; fx: number; fy: number } | null>(null);
  const rfRef = useRef<{ screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number } } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Always-current copies for event handlers and the write queue.
  const stateRef = useRef(initial);
  const historyRef = useRef(emptyHistory);
  const updateHistory = useCallback((h: typeof emptyHistory) => {
    historyRef.current = h;
    setHistory(h);
  }, []);
  const queue = useRef<Promise<void>>(Promise.resolve());

  /** Updates local state immediately and queues the DB writes in order. */
  const run = useCallback(
    (ops: Op[]) => {
      if (!ops.length) return;
      stateRef.current = applyOps(stateRef.current, ops);
      setState(stateRef.current);
      queue.current = queue.current
        .then(async () => {
          for (const op of ops) await persistOp(supabase, op);
        })
        .catch(() => setSaveError(true));
    },
    [supabase],
  );

  const commit = useCallback(
    (label: string, forward: Op[], backward: Op[]) => {
      setMessage(null);
      updateHistory(pushCommand(historyRef.current, { label, forward, backward }));
      run(forward);
    },
    [run, updateHistory],
  );

  const doUndo = useCallback(() => {
    const r = undo(historyRef.current);
    if (!r) return;
    updateHistory(r.history);
    run(r.ops);
  }, [run, updateHistory]);

  const doRedo = useCallback(() => {
    const r = redo(historyRef.current);
    if (!r) return;
    updateHistory(r.history);
    run(r.ops);
  }, [run, updateHistory]);

  const addStage = (type: StageType, at?: { x: number; y: number }) => {
    const n = state.stages.length;
    const handler = getHandler(type)!;
    const row: StageRow = {
      id: crypto.randomUUID(),
      workflow_id: workflowId,
      type,
      name: `${typeLabel[type]} baru`,
      config: {},
      mode: handler.defaultMode,
      // At the clicked spot when given; otherwise below the lowest stage so new nodes never land on old ones.
      pos_x: at ? at.x : 40,
      pos_y: at ? at.y : n ? Math.max(...state.stages.map((s) => s.pos_y)) + 130 : 80,
      parent_group_id: null,
    };
    commit("add", [{ table: "stages", kind: "insert", row }], [{ table: "stages", kind: "delete", id: row.id }]);
    setSelection({ kind: "stage", id: row.id });
  };

  const engineGraph = useMemo(
    () => ({
      nodes: state.stages.map((s) => ({ id: s.id, model: getHandler(s.type)?.statusModel ?? ("none" as const), mode: s.mode })),
      edges: state.edges.map((e) => ({ id: e.id, source: e.source_stage_id, target: e.target_stage_id, kind: e.kind })),
    }),
    [state.stages, state.edges],
  );

  const onConnect = (c: Connection) => {
    if (!c.source || !c.target) return;
    const err = validateConnection(engineGraph.nodes, engineGraph.edges, c.source, c.target);
    if (err) return setMessage(connectionMessage[err]);
    const row = {
      id: crypto.randomUUID(),
      workflow_id: workflowId,
      source_stage_id: c.source,
      target_stage_id: c.target,
      kind: "blocking" as const,
      source_port: "text" as const,
      target_port: "text" as const,
    };
    commit("connect", [{ table: "stage_connections", kind: "insert", row }], [{ table: "stage_connections", kind: "delete", id: row.id }]);
    setSelection({ kind: "edge", id: row.id });
  };

  const deleteStage = useCallback(
    (id: string) => {
      const { forward, backward } = deleteStageOps(stateRef.current, id);
      commit("delete", forward, backward);
      setSelection(null);
      setEditingId((cur) => (cur === id ? null : cur));
    },
    [commit],
  );

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    const s = stateRef.current;
    if (selection.kind === "stage") {
      const { forward, backward } = deleteStageOps(s, selection.id);
      commit("delete", forward, backward);
    } else {
      const row = s.edges.find((e) => e.id === selection.id);
      if (row) {
        commit("disconnect", [{ table: "stage_connections", kind: "delete", id: row.id }], [{ table: "stage_connections", kind: "insert", row }]);
      }
    }
    setSelection(null);
  }, [selection, commit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? doRedo() : doUndo();
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        return doRedo();
      }
      if (e.key === "Delete" || e.key === "Backspace") deleteSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo, deleteSelection]);

  const baseNodes = useMemo<StageFlowNode[]>(
    () =>
      state.stages.map((s) => ({
        id: s.id,
        type: "stage",
        position: { x: s.pos_x, y: s.pos_y },
        selected: selection?.kind === "stage" && selection.id === s.id,
        data: {
          name: s.name,
          type: s.type,
          groupName: state.stages.find((g) => g.id === s.parent_group_id)?.name ?? null,
          onEdit: () => setEditingId(s.id),
          onDelete: () => deleteStage(s.id),
        },
      })),
    [state.stages, selection, deleteStage],
  );
  const [nodes, onNodesChange] = useSyncedNodes(baseNodes);

  const edges = useMemo<FlowEdge[]>(
    () =>
      state.edges.map((e) => ({
        id: e.id,
        source: e.source_stage_id,
        target: e.target_stage_id,
        selected: selection?.kind === "edge" && selection.id === e.id,
        label: e.kind === "flow" ? "bebas" : undefined,
        style: e.kind === "flow" ? { strokeDasharray: "6 4" } : { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [state.edges, selection],
  );

  const editingStage = editingId ? state.stages.find((s) => s.id === editingId) : undefined;
  const menuEdge = edgeMenu ? state.edges.find((e) => e.id === edgeMenu.id) : undefined;

  const afterFlush = async (fn: () => Promise<void>) => {
    await queue.current;
    try {
      await fn();
    } catch (e) {
      // redirect() throws NEXT_REDIRECT; let it propagate.
      if (e && typeof e === "object" && "digest" in e) throw e;
      setMessage("Gagal. Coba lagi.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background/60 px-4 py-2.5 md:px-6">
        <nav aria-label="Jejak halaman" className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          <Link href="/projects" className="transition-colors hover:text-foreground">Proyek</Link>
          <span aria-hidden>/</span>
          <Link href={`/projects/${projectId}`} className="max-w-32 truncate transition-colors hover:text-foreground">{projectName}</Link>
          <span aria-hidden>/</span>
          <span className="truncate text-muted-foreground">{workflowName}</span>
        </nav>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={doUndo} disabled={!history.past.length}>Urungkan</Button>
          <Button size="sm" variant="ghost" onClick={doRedo} disabled={!history.future.length}>Ulangi</Button>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAsk("template")}>Simpan sebagai template</Button>
          <Button size="sm" onClick={() => setAsk("run")}>Mulai kerjakan</Button>
        </div>
      </div>

      {(message || saveError) && (
        <div role="status" className="border-b border-border bg-secondary px-4 py-2 text-sm md:px-6">
          {saveError ? "Perubahan gagal disimpan. Muat ulang halaman untuk melihat kondisi terakhir." : message}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div ref={canvasRef} className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              rfRef.current = instance;
            }}
            zoomOnDoubleClick={false}
            onDoubleClick={(e) => {
              // Double-click on empty canvas opens the add-stage menu at that spot.
              if (!(e.target as HTMLElement).classList.contains("react-flow__pane") || !rfRef.current) return;
              const box = canvasRef.current?.getBoundingClientRect();
              const flow = rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY });
              setMenu({ sx: e.clientX - (box?.left ?? 0), sy: e.clientY - (box?.top ?? 0), fx: flow.x, fy: flow.y });
            }}
            onMoveStart={() => {
              setMenu(null);
              setEdgeMenu(null);
            }}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => {
              setSelection({ kind: "stage", id: n.id });
              setEdgeMenu(null);
            }}
            onEdgeClick={(ev, e) => {
              const box = canvasRef.current?.getBoundingClientRect();
              setSelection({ kind: "edge", id: e.id });
              setEdgeMenu({ id: e.id, sx: ev.clientX - (box?.left ?? 0), sy: ev.clientY - (box?.top ?? 0) });
            }}
            onPaneClick={() => {
              setSelection(null);
              setMenu(null);
              setEdgeMenu(null);
            }}
            onNodeDragStop={(_, n) => {
              const prev = stateRef.current.stages.find((s) => s.id === n.id);
              if (!prev || (prev.pos_x === n.position.x && prev.pos_y === n.position.y)) return;
              commit(
                "move",
                [{ table: "stages", kind: "update", id: n.id, patch: { pos_x: n.position.x, pos_y: n.position.y } }],
                [{ table: "stages", kind: "update", id: n.id, patch: { pos_x: prev.pos_x, pos_y: prev.pos_y } }],
              );
            }}
            deleteKeyCode={null}
            colorMode="dark"
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1.2} color="rgba(255,255,255,0.1)" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="#3a3a3a" maskColor="rgba(0,0,0,0.6)" className="hidden md:block" />
            <Panel position="top-left" className="flex flex-wrap items-center gap-1 rounded-2xl border border-border-strong bg-popover/90 p-1.5 shadow-xl backdrop-blur">
              <span className="sv-label px-2">Tambah langkah</span>
              {stageTypes.map((t) => (
                <Button key={t} size="sm" variant="ghost" onClick={() => addStage(t)}>{typeLabel[t]}</Button>
              ))}
            </Panel>
            <Panel position="bottom-center" className="hidden rounded-xl border border-border bg-popover/80 px-3.5 py-2 text-xs text-muted-foreground backdrop-blur md:block">
              Klik langkah untuk Ubah atau Hapus · Klik dua kali area kosong untuk menambah · Tarik titik di tepi langkah untuk menghubungkan
            </Panel>
          </ReactFlow>
          {menu && (
            <div
              role="menu"
              aria-label="Tambah langkah di sini"
              className="absolute z-10 flex w-40 flex-col rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
              style={{ left: menu.sx, top: menu.sy }}
            >
              <span className="px-2 py-1 text-xs text-muted-foreground">Tambah di sini</span>
              {stageTypes.map((t) => (
                <button
                  key={t}
                  role="menuitem"
                  className="rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    addStage(t, { x: menu.fx, y: menu.fy });
                    setMenu(null);
                  }}
                >
                  + {typeLabel[t]}
                </button>
              ))}
            </div>
          )}
          {edgeMenu && menuEdge && (
            <div
              role="menu"
              aria-label="Hubungan antar langkah"
              className="absolute z-10 flex w-56 flex-col rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
              style={{ left: edgeMenu.sx, top: edgeMenu.sy }}
            >
              <span className="px-2 py-1 text-xs text-muted-foreground">Hubungan antar langkah</span>
              {(
                [
                  ["blocking", "Harus urut", "Langkah berikutnya menunggu"],
                  ["flow", "Bebas urutan", "Boleh dikerjakan kapan saja"],
                ] as const
              ).map(([kind, label, hint]) => (
                <button
                  key={kind}
                  role="menuitemradio"
                  aria-checked={menuEdge.kind === kind}
                  className="flex flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    if (menuEdge.kind !== kind) {
                      commit(
                        "edge kind",
                        [{ table: "stage_connections", kind: "update", id: menuEdge.id, patch: { kind } }],
                        [{ table: "stage_connections", kind: "update", id: menuEdge.id, patch: { kind: menuEdge.kind } }],
                      );
                    }
                    setEdgeMenu(null);
                  }}
                >
                  <span>{menuEdge.kind === kind ? "✓ " : ""}{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
              <button
                role="menuitem"
                className="rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  commit("disconnect", [{ table: "stage_connections", kind: "delete", id: menuEdge.id }], [{ table: "stage_connections", kind: "insert", row: menuEdge }]);
                  setEdgeMenu(null);
                  setSelection(null);
                }}
              >
                Hapus hubungan
              </button>
            </div>
          )}
        </div>
      </div>

      {ask === "template" && (
        <PromptDialog
          title="Simpan sebagai template"
          label="Nama template"
          initial={workflowName}
          confirmLabel="Simpan"
          onClose={() => setAsk(null)}
          onSubmit={(name) =>
            afterFlush(async () => {
              await saveTemplate(workflowId, name);
              setMessage("Template tersimpan. Anda bisa memakainya dari halaman proyek.");
            })
          }
        />
      )}
      {ask === "run" && (
        <PromptDialog
          title="Mulai kerjakan"
          label="Nama pengerjaan"
          initial={`${workflowName} #1`}
          confirmLabel="Mulai"
          onClose={() => setAsk(null)}
          onSubmit={(name) => afterFlush(() => startRunFromWorkflow(projectId, workflowId, name))}
        />
      )}
      {editingStage && (
        <StageDialog title={`Ubah ${typeLabel[editingStage.type]?.toLowerCase() ?? "langkah"}`} onClose={() => setEditingId(null)}>
          <StageWorkspace state={state} stage={editingStage} commit={commit} apply={run} />
        </StageDialog>
      )}
    </div>
  );
}
