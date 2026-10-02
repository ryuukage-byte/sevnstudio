import { describe, expect, it } from "vitest";
import { buildSnapshot } from "@sevn/engine";
import { computeRunView, type RunItemRow } from "./derive";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const stage = (n: number, type: string, name: string) => ({
  id: id(n), type, name, config: {}, mode: "manual" as const, posX: 0, posY: 0, parentGroupId: null,
});

// Workflow A: Dokumen -> Booking (blocking), Packing free
const snapshot = buildSnapshot({
  stages: [stage(1, "checklist", "Dokumen"), stage(2, "checklist", "Booking"), stage(3, "checklist", "Packing")],
  edges: [{ id: id(10), source: id(1), target: id(2), kind: "blocking", sourcePort: "text", targetPort: "text" }],
  items: [],
});

const ri = (n: number, stageN: number, status: "TODO" | "DONE"): RunItemRow => ({
  id: id(100 + n), run_id: id(500), stage_id: id(stageN), title: `i${n}`, qty: 1, note: null, due_date: null, sort_order: n, status, updated_at: "2026-10-02T00:00:00Z",
});

describe("computeRunView (Workflow A)", () => {
  it("locks Booking until every Dokumen item is done, with a visible reason", () => {
    const items = [ri(1, 1, "DONE"), ri(2, 1, "TODO"), ri(3, 2, "TODO")];
    const v = computeRunView(snapshot, {}, items);
    expect(v.statuses[id(1)]).toBe("DOING");
    expect(v.statuses[id(2)]).toBe("LOCKED");
    expect(v.blockedBy[id(2)]).toEqual(["Dokumen"]);
    expect(v.statuses[id(3)]).toBe("TODO"); // Packing is free
    expect(v.progress[id(1)]).toBe("1/2");
  });

  it("unlocks Booking when Dokumen is fully checked", () => {
    const v = computeRunView(snapshot, {}, [ri(1, 1, "DONE"), ri(2, 1, "DONE"), ri(3, 2, "TODO")]);
    expect(v.statuses[id(1)]).toBe("DONE");
    expect(v.statuses[id(2)]).toBe("TODO");
    expect(v.blockedBy[id(2)]).toBeUndefined();
  });

  it("runs are independent: another run's items do not affect this one", () => {
    const run1 = computeRunView(snapshot, {}, [ri(1, 1, "DONE")]);
    const run2 = computeRunView(snapshot, {}, [{ ...ri(2, 1, "TODO"), run_id: id(501) }]);
    expect(run1.statuses[id(1)]).toBe("DONE");
    expect(run2.statuses[id(1)]).toBe("TODO");
  });

  it("an empty checklist falls back to its stored status", () => {
    expect(computeRunView(snapshot, { [id(1)]: "DONE" }, []).statuses[id(2)]).toBe("TODO");
    expect(computeRunView(snapshot, {}, []).statuses[id(2)]).toBe("LOCKED");
  });
});
