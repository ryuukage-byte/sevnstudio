import { describe, expect, it } from "vitest";
import {
  applyOps, deleteStageOps, emptyHistory, pushCommand, redo, undo,
  type EdgeRow, type EditorState, type ItemRow, type StageRow,
} from "./state";

const stage = (id: string, type = "checklist", extra: Partial<StageRow> = {}): StageRow => ({
  id, workflow_id: "w", type, name: id, config: {}, mode: "manual", pos_x: 0, pos_y: 0, ...extra,
});
const edge = (id: string, s: string, t: string): EdgeRow => ({
  id, workflow_id: "w", source_stage_id: s, target_stage_id: t, kind: "blocking", source_port: "text", target_port: "text",
});
const item = (id: string, stage_id: string): ItemRow => ({ id, stage_id, title: id, qty: 1, note: null, due_date: null, sort_order: 0 });

const base: EditorState = {
  stages: [stage("a", "checklist"), stage("b", "task")],
  edges: [edge("e1", "a", "b")],
  items: [item("i1", "a"), item("i2", "b")],
};

describe("applyOps", () => {
  it("inserts, updates and deletes rows", () => {
    const s = applyOps(base, [
      { table: "stages", kind: "insert", row: stage("c") },
      { table: "stages", kind: "update", id: "c", patch: { name: "Packing", pos_x: 40 } },
      { table: "items", kind: "delete", id: "i2" },
    ]);
    expect(s.stages.find((x) => x.id === "c")).toMatchObject({ name: "Packing", pos_x: 40 });
    expect(s.items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("deleting a stage cascades to edges/items", () => {
    expect(applyOps(base, [{ table: "stages", kind: "delete", id: "a" }])).toMatchObject({
      edges: [], items: [{ id: "i2" }],
    });
  });

  it("insert of an existing id replaces it (idempotent redo)", () => {
    const s = applyOps(base, [{ table: "stages", kind: "insert", row: stage("b", "task") }]);
    expect(s.stages.filter((x) => x.id === "b")).toHaveLength(1);
    expect(s.stages.find((x) => x.id === "b")?.type).toBe("task");
  });
});

describe("deleteStageOps", () => {
  it("backward restores everything that cascaded", () => {
    for (const id of ["a", "g"]) {
      const { forward, backward } = deleteStageOps(base, id);
      const restored = applyOps(applyOps(base, forward), backward);
      const sort = <T extends { id: string }>(xs: T[]) => [...xs].sort((x, y) => x.id.localeCompare(y.id));
      expect(sort(restored.stages)).toEqual(sort(base.stages));
      expect(sort(restored.edges)).toEqual(sort(base.edges));
      expect(sort(restored.items)).toEqual(sort(base.items));
    }
  });
  it("is a no-op for an unknown stage", () => {
    expect(deleteStageOps(base, "zzz")).toEqual({ forward: [], backward: [] });
  });
});

describe("history", () => {
  const cmd = { label: "move", forward: [{ table: "stages", kind: "update", id: "b", patch: { pos_x: 9 } }], backward: [{ table: "stages", kind: "update", id: "b", patch: { pos_x: 0 } }] } as const;

  it("undo then redo round-trips the state", () => {
    let h = pushCommand(emptyHistory, { ...cmd, forward: [...cmd.forward], backward: [...cmd.backward] });
    let s = applyOps(base, cmd.forward);
    const u = undo(h)!;
    s = applyOps(s, u.ops);
    h = u.history;
    expect(s.stages.find((x) => x.id === "b")?.pos_x).toBe(0);
    const r = redo(h)!;
    s = applyOps(s, r.ops);
    expect(s.stages.find((x) => x.id === "b")?.pos_x).toBe(9);
    expect(r.history.future).toHaveLength(0);
  });

  it("returns null when nothing to undo/redo and a new command clears redo", () => {
    expect(undo(emptyHistory)).toBeNull();
    expect(redo(emptyHistory)).toBeNull();
    const h = pushCommand(emptyHistory, { label: "x", forward: [], backward: [] });
    const u = undo(h)!;
    expect(pushCommand(u.history, { label: "y", forward: [], backward: [] }).future).toEqual([]);
  });
});
