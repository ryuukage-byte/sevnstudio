import { z } from "zod";
import type { Edge, StageNode, StatusModel } from "./types";

const portType = z.enum(["text", "json", "file"]);

export const snapshotSchema = z.object({
  version: z.literal(1),
  stages: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.string(),
      name: z.string(),
      config: z.record(z.unknown()),
      mode: z.enum(["manual", "semi_auto", "auto"]),
      posX: z.number(),
      posY: z.number(),
      parentGroupId: z.string().uuid().nullable(),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string().uuid(),
      source: z.string().uuid(),
      target: z.string().uuid(),
      kind: z.enum(["blocking", "flow"]),
      sourcePort: portType,
      targetPort: portType,
    }),
  ),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      stageId: z.string().uuid(),
      title: z.string(),
      qty: z.number().int().nonnegative(),
      note: z.string().nullable(),
      dueDate: z.string().nullable(),
      sortOrder: z.number(),
    }),
  ),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

/** Rows as read from the definition tables (camelCased by the caller). */
export interface DefinitionRows {
  stages: Snapshot["stages"];
  edges: Snapshot["edges"];
  items: Snapshot["items"];
}

/**
 * Freezes a workflow definition into a snapshot used by templates and runs.
 * Drops dangling references (edges/items pointing at missing stages) so a snapshot is always self-consistent.
 */
export function buildSnapshot(def: DefinitionRows): Snapshot {
  const ids = new Set(def.stages.map((s) => s.id));
  const groupIds = new Set(def.stages.filter((s) => s.type === "group").map((s) => s.id));
  return snapshotSchema.parse({
    version: 1,
    stages: def.stages.map((s) => ({
      ...s,
      parentGroupId: s.parentGroupId && groupIds.has(s.parentGroupId) ? s.parentGroupId : null,
    })),
    edges: def.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    items: [...def.items].filter((i) => ids.has(i.stageId)).sort((a, b) => a.sortOrder - b.sortOrder),
  });
}

/** Engine graph for a snapshot. `modelOf` maps a stage type to its status model (from the handler registry). */
export function snapshotToGraph(
  snapshot: Snapshot,
  modelOf: (type: string) => StatusModel,
): { nodes: StageNode[]; edges: Edge[] } {
  return {
    nodes: snapshot.stages.map((s) => ({ id: s.id, model: modelOf(s.type), mode: s.mode })),
    edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, kind: e.kind })),
  };
}

/**
 * Re-keys a snapshot with fresh ids so a template can be duplicated/imported without id collisions.
 * Pass an id generator (crypto.randomUUID) to keep this function pure and testable.
 */
export function cloneSnapshot(snapshot: Snapshot, newId: () => string): Snapshot {
  const map = new Map<string, string>();
  const remap = (id: string) => {
    let v = map.get(id);
    if (!v) map.set(id, (v = newId()));
    return v;
  };
  return {
    version: 1,
    stages: snapshot.stages.map((s) => ({
      ...s,
      id: remap(s.id),
      parentGroupId: s.parentGroupId ? remap(s.parentGroupId) : null,
    })),
    edges: snapshot.edges.map((e) => ({ ...e, id: newId(), source: remap(e.source), target: remap(e.target) })),
    items: snapshot.items.map((i) => ({ ...i, id: newId(), stageId: remap(i.stageId) })),
  };
}
