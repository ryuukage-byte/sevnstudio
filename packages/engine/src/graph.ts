import type { Edge, EdgeKind, StageNode } from "./types";

export function adjacency(edges: readonly Edge[], kinds?: readonly EdgeKind[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (kinds && !kinds.includes(e.kind)) continue;
    const list = out.get(e.source);
    if (list) list.push(e.target);
    else out.set(e.source, [e.target]);
  }
  return out;
}

/** True when the edges contain a directed cycle. */
export function hasCycle(nodes: readonly StageNode[], edges: readonly Edge[]): boolean {
  const next = adjacency(edges);
  const state = new Map<string, 1 | 2>(); // 1 = visiting, 2 = done
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(id, 1);
    for (const n of next.get(id) ?? []) if (visit(n)) return true;
    state.set(id, 2);
    return false;
  };
  return nodes.some((n) => visit(n.id));
}

/** Topological order (Kahn). Returns null if the graph has a cycle. Stable w.r.t. node order. */
export function topoOrder(nodes: readonly StageNode[], edges: readonly Edge[]): string[] | null {
  const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const next = adjacency(edges);
  for (const e of edges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    for (const t of next.get(id) ?? []) {
      const d = (indeg.get(t) ?? 0) - 1;
      indeg.set(t, d);
      if (d === 0) queue.push(t);
    }
  }
  return order.length === nodes.length ? order : null;
}

/** All stages reachable downstream of `from` (excluding `from`), over the given edge kinds. */
export function descendants(
  edges: readonly Edge[],
  from: string,
  kinds?: readonly EdgeKind[],
): string[] {
  const next = adjacency(edges, kinds);
  const seen = new Set<string>();
  const stack = [...(next.get(from) ?? [])];
  while (stack.length) {
    const id = stack.pop() as string;
    if (seen.has(id) || id === from) continue;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  return [...seen];
}

export type ConnectionError = "unknown_stage" | "self_loop" | "group_edge" | "duplicate" | "cycle";

/** Validates a proposed new edge against the current graph. Returns null when allowed. */
export function validateConnection(
  nodes: readonly StageNode[],
  edges: readonly Edge[],
  source: string,
  target: string,
): ConnectionError | null {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const s = byId.get(source);
  const t = byId.get(target);
  if (!s || !t) return "unknown_stage";
  if (source === target) return "self_loop";
  if (s.model === "none" || t.model === "none") return "group_edge";
  if (edges.some((e) => e.source === source && e.target === target)) return "duplicate";
  const candidate: Edge = { id: "__candidate__", source, target, kind: "flow" };
  return hasCycle(nodes, [...edges, candidate]) ? "cycle" : null;
}
