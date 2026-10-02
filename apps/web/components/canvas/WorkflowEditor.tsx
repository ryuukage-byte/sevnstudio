"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, Controls, MarkerType, MiniMap, ReactFlow,
  type Connection, type Edge as FlowEdge, type NodeChange,
} from "@xyflow/react";
import { validateConnection, type ConnectionError } from "@sevn/engine";
import { getHandler, stageTypes, type StageType } from "@sevn/handlers";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { persistOp } from "@/lib/editor/persist";
import {
  applyOps, deleteStageOps, emptyHistory, pushCommand, redo, undo,
  type EditorState, type Op, type StageRow,
} from "@/lib/editor/state";
import { saveTemplate, startRunFromWorkflow } from "@/app/projects/actions";
import { StageNodeView, type StageFlowNode } from "./StageNodeView";
import { StageWorkspace } from "./StageWorkspace";
import { typeLabel } from "./labels";

const nodeTypes = { stage: StageNodeView };

const connectionMessage: Record<ConnectionError, string> = {
  unknown_stage: "Stage tidak ditemukan.",
  self_loop: "Stage tidak bisa terhubung ke dirinya sendiri.",
  group_edge: "Grup tidak bisa dihubungkan; pakai pengelompokan di panel stage.",
  duplicate: "Koneksi itu sudah ada.",
  cycle: "Koneksi itu membuat putaran (siklus) di workflow.",
};

type Selection = { kind: "stage" | "edge"; id: string } | null;

interface Props {
  projectId: string;
  workflowId: string;
  workflowName: string;
  initial: EditorState;
}

export function WorkflowEditor({ projectId, workflowId, workflowName, initial }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState(initial);
  const [history, setHistory] = useState(emptyHistory);
  const [selection, setSelection] = useState<Selection>(null);
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

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

  const addStage = (type: StageType) => {
    const n = state.stages.length;
    const handler = getHandler(type)!;
    const row: StageRow = {
      id: crypto.randomUUID(),
      workflow_id: workflowId,
      type,
      name: `${typeLabel[type]} baru`,
      config: {},
      mode: handler.defaultMode,
      // Below the lowest existing stage so new nodes never land on top of old ones.
      pos_x: 40,
      pos_y: n ? Math.max(...state.stages.map((s) => s.pos_y)) + 130 : 80,
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

  const nodes: StageFlowNode[] = state.stages.map((s) => ({
    id: s.id,
    type: "stage",
    position: dragPos[s.id] ?? { x: s.pos_x, y: s.pos_y },
    selected: selection?.kind === "stage" && selection.id === s.id,
    data: {
      name: s.name,
      type: s.type,
      groupName: state.stages.find((g) => g.id === s.parent_group_id)?.name ?? null,
    },
  }));

  const edges: FlowEdge[] = state.edges.map((e) => ({
    id: e.id,
    source: e.source_stage_id,
    target: e.target_stage_id,
    selected: selection?.kind === "edge" && selection.id === e.id,
    label: e.kind === "flow" ? "flow" : undefined,
    style: e.kind === "flow" ? { strokeDasharray: "6 4" } : { strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  const onNodesChange = (changes: NodeChange<StageFlowNode>[]) => {
    for (const ch of changes) {
      if (ch.type === "position" && ch.position) {
        const pos = ch.position;
        setDragPos((p) => ({ ...p, [ch.id]: pos }));
      }
    }
  };

  const selectedStage = selection?.kind === "stage" ? state.stages.find((s) => s.id === selection.id) : undefined;
  const selectedEdge = selection?.kind === "edge" ? state.edges.find((e) => e.id === selection.id) : undefined;

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
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Link href={`/projects/${projectId}`} className="text-sm text-muted-foreground hover:underline">← Project</Link>
        <h1 className="mr-2 font-medium">{workflowName}</h1>
        {stageTypes.map((t) => (
          <Button key={t} size="sm" variant="outline" onClick={() => addStage(t)}>+ {typeLabel[t]}</Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button size="sm" variant="ghost" onClick={doUndo} disabled={!history.past.length}>Urungkan</Button>
        <Button size="sm" variant="ghost" onClick={doRedo} disabled={!history.future.length}>Ulangi</Button>
        <Button size="sm" variant="ghost" onClick={deleteSelection} disabled={!selection}>Hapus pilihan</Button>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const name = window.prompt("Nama template:", workflowName)?.trim();
              if (name) afterFlush(async () => { await saveTemplate(workflowId, name); setMessage("Template tersimpan."); });
            }}
          >
            Simpan sebagai template
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const name = window.prompt("Nama run:", `${workflowName} #1`)?.trim();
              if (name) afterFlush(() => startRunFromWorkflow(projectId, workflowId, name));
            }}
          >
            Mulai run
          </Button>
        </div>
      </header>

      {(message || saveError) && (
        <div role="status" className="border-b bg-muted px-3 py-1.5 text-sm">
          {saveError ? "Perubahan gagal disimpan. Muat ulang halaman untuk melihat kondisi terakhir." : message}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelection({ kind: "stage", id: n.id })}
            onEdgeClick={(_, e) => setSelection({ kind: "edge", id: e.id })}
            onPaneClick={() => setSelection(null)}
            onNodeDragStop={(_, n) => {
              const prev = stateRef.current.stages.find((s) => s.id === n.id);
              setDragPos((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== n.id)));
              if (!prev || (prev.pos_x === n.position.x && prev.pos_y === n.position.y)) return;
              commit(
                "move",
                [{ table: "stages", kind: "update", id: n.id, patch: { pos_x: n.position.x, pos_y: n.position.y } }],
                [{ table: "stages", kind: "update", id: n.id, patch: { pos_x: prev.pos_x, pos_y: prev.pos_y } }],
              );
            }}
            deleteKeyCode={null}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable nodeColor="#94a3b8" maskColor="rgba(0,0,0,0.08)" />
          </ReactFlow>
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto border-l p-3">
          {selectedStage ? (
            <StageWorkspace state={state} stage={selectedStage} commit={commit} apply={run} />
          ) : selectedEdge ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Koneksi</div>
              <p className="text-xs text-muted-foreground">
                Blocking: stage hilir terkunci sampai hulu selesai. Flow: hanya menunjukkan hubungan, tidak mengunci.
              </p>
              <select
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                value={selectedEdge.kind}
                onChange={(e) => {
                  const kind = e.target.value as "blocking" | "flow";
                  commit(
                    "edge kind",
                    [{ table: "stage_connections", kind: "update", id: selectedEdge.id, patch: { kind } }],
                    [{ table: "stage_connections", kind: "update", id: selectedEdge.id, patch: { kind: selectedEdge.kind } }],
                  );
                }}
              >
                <option value="blocking">Blocking (mengunci)</option>
                <option value="flow">Flow (informasi)</option>
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pilih stage atau koneksi untuk mengubahnya. Tarik dari titik kanan sebuah stage ke titik kiri stage lain untuk menghubungkan.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
