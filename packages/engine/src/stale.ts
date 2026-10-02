import { descendants } from "./graph";
import type { Edge, StageNode, StatusMap } from "./types";

/**
 * When `changedStageId` produces a new output (regenerated, re-edited, re-approved),
 * returns the downstream stages that must be marked STALE: APPROVED stages with a
 * machine/gate model reachable over any edge. Manual stages are never stale.
 * Downstream results are kept (only flagged); callers must not overwrite them.
 */
export function staleTargets(
  nodes: readonly StageNode[],
  edges: readonly Edge[],
  statuses: StatusMap,
  changedStageId: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  return descendants(edges, changedStageId).filter((id) => {
    const model = byId.get(id)?.model;
    return (model === "machine" || model === "gate") && statuses[id] === "APPROVED";
  });
}
