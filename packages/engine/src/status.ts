import type { DerivedStatus, Edge, StageNode, StatusMap, StoredStatus } from "./types";

/** An upstream stage satisfies a blocking edge once it is APPROVED (machine/gate) or DONE (manual). */
export function isSatisfied(status: StoredStatus | null | undefined): boolean {
  return status === "APPROVED" || status === "DONE";
}

/** Upstream stage ids that currently block `stageId` (blocking edges whose source is not satisfied). Group nodes are transparent. */
export function lockReasons(
  nodes: readonly StageNode[],
  edges: readonly Edge[],
  statuses: StatusMap,
  stageId: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  return edges
    .filter((e) => e.kind === "blocking" && e.target === stageId)
    .filter((e) => byId.get(e.source)?.model !== "none")
    .filter((e) => !isSatisfied(statuses[e.source]))
    .map((e) => e.source);
}

/**
 * Derived status of a stage. LOCKED/READY are computed from the graph; a stage that has
 * not started (no stored status, or TODO) is LOCKED when a blocking upstream is unsatisfied, else READY.
 * Manual stages show TODO instead of READY once unlocked.
 */
export function deriveStatus(
  nodes: readonly StageNode[],
  edges: readonly Edge[],
  statuses: StatusMap,
  stageId: string,
): DerivedStatus {
  const node = nodes.find((n) => n.id === stageId);
  if (!node) throw new Error(`unknown stage ${stageId}`);
  const stored = statuses[stageId];
  if (stored && stored !== "TODO") return stored;
  if (lockReasons(nodes, edges, statuses, stageId).length > 0) return "LOCKED";
  return node.model === "checklist" || node.model === "task" ? "TODO" : "READY";
}

/** Derived status for every stage, keyed by id. */
export function deriveAll(
  nodes: readonly StageNode[],
  edges: readonly Edge[],
  statuses: StatusMap,
): Record<string, DerivedStatus> {
  return Object.fromEntries(nodes.map((n) => [n.id, deriveStatus(nodes, edges, statuses, n.id)]));
}

/** Status of a checklist stage from its items: all done => DONE, some => DOING, none => TODO. */
export function checklistStatus(done: number, total: number): StoredStatus {
  if (total > 0 && done === total) return "DONE";
  return done > 0 ? "DOING" : "TODO";
}

/**
 * Stages that Auto mode may start now: unstarted, READY, mode auto, machine model.
 * Never includes APPROVED/STALE/FAILED stages, so Auto cannot overwrite a result silently.
 */
export function autoRunnable(
  nodes: readonly StageNode[],
  edges: readonly Edge[],
  statuses: StatusMap,
): string[] {
  return nodes
    .filter((n) => n.mode === "auto" && n.model === "machine")
    .filter((n) => !statuses[n.id] && deriveStatus(nodes, edges, statuses, n.id) === "READY")
    .map((n) => n.id);
}
