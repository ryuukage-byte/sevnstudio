// Pure editor state + operations. Every canvas change is a list of Ops, so the same ops drive
// the local state, the database writes, and (inverted) undo/redo.

export interface StageRow {
  id: string;
  workflow_id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  mode: "manual" | "semi_auto" | "auto";
  pos_x: number;
  pos_y: number;
  parent_group_id?: string | null;
}

export interface EdgeRow {
  id: string;
  workflow_id: string;
  source_stage_id: string;
  target_stage_id: string;
  kind: "blocking" | "flow";
  source_port: "text" | "json" | "file";
  target_port: "text" | "json" | "file";
}

export interface ItemRow {
  id: string;
  stage_id: string;
  title: string;
  qty: number;
  note: string | null;
  due_date: string | null;
  sort_order: number;
}

export interface EditorState {
  stages: StageRow[];
  edges: EdgeRow[];
  items: ItemRow[];
}

type Tables = { stages: StageRow; stage_connections: EdgeRow; items: ItemRow };
export type TableName = keyof Tables;

export type Op = {
  [T in TableName]:
    | { table: T; kind: "insert"; row: Tables[T] }
    | { table: T; kind: "update"; id: string; patch: Partial<Tables[T]> }
    | { table: T; kind: "delete"; id: string };
}[TableName];

const key = { stages: "stages", stage_connections: "edges", items: "items" } as const;

/** Applies one op to the state. Deleting a stage also drops its edges and items and un-parents its group members (mirrors DB cascade). */
export function applyOp(state: EditorState, op: Op): EditorState {
  if (op.table === "stages" && op.kind === "delete") {
    return {
      stages: state.stages.filter((s) => s.id !== op.id),
      edges: state.edges.filter((e) => e.source_stage_id !== op.id && e.target_stage_id !== op.id),
      items: state.items.filter((i) => i.stage_id !== op.id),
    };
  }
  const k = key[op.table];
  const rows = state[k] as { id: string }[];
  let next: { id: string }[];
  if (op.kind === "insert") next = [...rows.filter((r) => r.id !== op.row.id), op.row];
  else if (op.kind === "delete") next = rows.filter((r) => r.id !== op.id);
  else next = rows.map((r) => (r.id === op.id ? { ...r, ...op.patch } : r));
  return { ...state, [k]: next };
}

export function applyOps(state: EditorState, ops: readonly Op[]): EditorState {
  return ops.reduce(applyOp, state);
}

/** Ops that delete a stage, plus the ops that restore it (stage first, then its edges and items). */
export function deleteStageOps(state: EditorState, id: string): { forward: Op[]; backward: Op[] } {
  const stage = state.stages.find((s) => s.id === id);
  if (!stage) return { forward: [], backward: [] };
  const edges = state.edges.filter((e) => e.source_stage_id === id || e.target_stage_id === id);
  const items = state.items.filter((i) => i.stage_id === id);
  return {
    forward: [{ table: "stages", kind: "delete", id }],
    backward: [
      { table: "stages", kind: "insert", row: stage },
      ...edges.map((row): Op => ({ table: "stage_connections", kind: "insert", row })),
      ...items.map((row): Op => ({ table: "items", kind: "insert", row })),
    ],
  };
}

/** Command history for undo/redo. Each entry is a forward/backward op list applied as one unit. */
export interface Command {
  label: string;
  forward: Op[];
  backward: Op[];
}

export interface History {
  past: Command[];
  future: Command[];
}

export const emptyHistory: History = { past: [], future: [] };
const MAX_HISTORY = 100;

export function pushCommand(h: History, c: Command): History {
  return { past: [...h.past, c].slice(-MAX_HISTORY), future: [] };
}

/** Returns the command to apply for undo (its backward ops) and the new history, or null when empty. */
export function undo(h: History): { ops: Op[]; history: History } | null {
  const c = h.past[h.past.length - 1];
  if (!c) return null;
  return { ops: c.backward, history: { past: h.past.slice(0, -1), future: [c, ...h.future] } };
}

export function redo(h: History): { ops: Op[]; history: History } | null {
  const c = h.future[0];
  if (!c) return null;
  return { ops: c.forward, history: { past: [...h.past, c], future: h.future.slice(1) } };
}
