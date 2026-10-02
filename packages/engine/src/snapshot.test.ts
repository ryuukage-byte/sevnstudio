import { describe, expect, it } from "vitest";
import { buildSnapshot, cloneSnapshot, snapshotSchema, snapshotToGraph, deriveAll, type DefinitionRows } from "./index";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const stage = (n: number, type: string, extra: object = {}) => ({
  id: id(n), type, name: `s${n}`, config: {}, mode: "manual" as const, posX: 0, posY: 0, parentGroupId: null, ...extra,
});

// Workflow A: group "Sebelum berangkat" containing docs, booking, packing; docs -> booking blocking
const def: DefinitionRows = {
  stages: [stage(1, "group"), stage(2, "checklist", { parentGroupId: id(1) }), stage(3, "checklist", { parentGroupId: id(1) }), stage(4, "checklist")],
  edges: [{ id: id(10), source: id(2), target: id(3), kind: "blocking", sourcePort: "text", targetPort: "text" }],
  items: [
    { id: id(20), stageId: id(2), title: "Paspor", qty: 1, note: null, dueDate: null, sortOrder: 2 },
    { id: id(21), stageId: id(2), title: "Visa", qty: 1, note: null, dueDate: null, sortOrder: 1 },
  ],
};

describe("snapshot", () => {
  it("builds a valid, ordered snapshot", () => {
    const s = buildSnapshot(def);
    expect(snapshotSchema.safeParse(s).success).toBe(true);
    expect(s.items.map((i) => i.title)).toEqual(["Visa", "Paspor"]);
  });

  it("drops dangling edges/items and non-group parents", () => {
    const s = buildSnapshot({
      stages: [stage(2, "checklist", { parentGroupId: id(99) })],
      edges: [{ id: id(10), source: id(2), target: id(99), kind: "flow", sourcePort: "text", targetPort: "text" }],
      items: [{ id: id(20), stageId: id(98), title: "x", qty: 1, note: null, dueDate: null, sortOrder: 0 }],
    });
    expect(s.edges).toEqual([]);
    expect(s.items).toEqual([]);
    expect(s.stages[0]?.parentGroupId).toBeNull();
  });

  it("is independent of later edits to the definition", () => {
    const s = buildSnapshot(def);
    const before = JSON.stringify(s);
    def.items[0]!.title = "changed";
    expect(JSON.stringify(s)).toBe(before);
    def.items[0]!.title = "Paspor";
  });

  it("clones with fresh, consistent ids", () => {
    const s = buildSnapshot(def);
    let n = 1000;
    const c = cloneSnapshot(s, () => id(n++));
    const stageIds = new Set(c.stages.map((x) => x.id));
    expect(c.stages.some((x) => s.stages.some((y) => y.id === x.id))).toBe(false);
    expect(c.edges.every((e) => stageIds.has(e.source) && stageIds.has(e.target))).toBe(true);
    expect(c.items.every((i) => stageIds.has(i.stageId))).toBe(true);
    expect(c.stages.find((x) => x.parentGroupId)?.parentGroupId).toBe(c.stages.find((x) => x.type === "group")?.id);
  });

  it("derives Workflow A graph state from a snapshot", () => {
    const g = snapshotToGraph(buildSnapshot(def), (t) => (t === "group" ? "none" : "checklist"));
    const d = deriveAll(g.nodes, g.edges, {});
    expect(d[id(3)]).toBe("LOCKED");
    expect(d[id(4)]).toBe("TODO");
    expect(deriveAll(g.nodes, g.edges, { [id(2)]: "DONE" })[id(3)]).toBe("TODO");
  });
});
