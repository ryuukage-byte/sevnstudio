import {
  checklistStatus, deriveAll, lockReasons, snapshotToGraph,
  type DerivedStatus, type Snapshot, type StoredStatus,
} from "@sevn/engine";
import { getHandler } from "@sevn/handlers";

export interface RunItemRow {
  id: string;
  run_id: string;
  stage_id: string;
  title: string;
  qty: number;
  note: string | null;
  due_date: string | null;
  sort_order: number;
  status: "TODO" | "DONE";
  updated_at: string;
}

export interface StageRunView {
  statuses: Record<string, DerivedStatus>;
  /** Names of upstream stages that block a stage (blocking edges whose source is not DONE/APPROVED). */
  blockedBy: Record<string, string[]>;
  /** "2/5" per checklist stage. */
  progress: Record<string, string>;
}

const modelOf = (type: string) => getHandler(type)?.statusModel ?? "none";

/**
 * Everything the run canvas needs, derived from the run snapshot, stored stage_runs statuses and run_items.
 * A checklist's status always follows its items; LOCKED/READY come from the graph (never stored).
 */
export function computeRunView(
  snapshot: Snapshot,
  stored: Readonly<Record<string, StoredStatus>>,
  items: readonly RunItemRow[],
): StageRunView {
  const { nodes, edges } = snapshotToGraph(snapshot, modelOf);
  const merged: Record<string, StoredStatus | null> = { ...stored };
  const progress: Record<string, string> = {};

  for (const n of nodes) {
    if (n.model !== "checklist") continue;
    const own = items.filter((i) => i.stage_id === n.id);
    const done = own.filter((i) => i.status === "DONE").length;
    progress[n.id] = `${done}/${own.length}`;
    if (own.length > 0) merged[n.id] = checklistStatus(done, own.length);
  }

  const names = new Map(snapshot.stages.map((s) => [s.id, s.name] as const));
  const blockedBy: Record<string, string[]> = {};
  for (const n of nodes) {
    const reasons = lockReasons(nodes, edges, merged, n.id);
    if (reasons.length) blockedBy[n.id] = reasons.map((id) => names.get(id) ?? id);
  }
  return { statuses: deriveAll(nodes, edges, merged), blockedBy, progress };
}
