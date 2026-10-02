export type Side = "left" | "right" | "top" | "bottom";

const THRESHOLD_X = 140;

/**
 * Picks which side of each node an edge attaches to, from their positions: side-by-side nodes connect right→left
 * (or left→right when the target is to the left), stacked nodes connect bottom→top. Nodes carry a handle on all four sides.
 */
export function pickHandles(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { sourceHandle: Side; targetHandle: Side } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) <= THRESHOLD_X && dy > 0) return { sourceHandle: "bottom", targetHandle: "top" };
  if (Math.abs(dx) <= THRESHOLD_X && dy < 0) return { sourceHandle: "top", targetHandle: "bottom" };
  if (dx < 0) return { sourceHandle: "left", targetHandle: "right" };
  return { sourceHandle: "right", targetHandle: "left" };
}
