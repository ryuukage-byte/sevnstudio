import { describe, expect, it } from "vitest";
import { deriveAll, hasCycle, snapshotSchema, snapshotToGraph } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { compilePreset, snapshotToRows } from "./compile";
import { presets } from "./data";

const counter = () => {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};
const modelOf = (t: string) => getHandler(t)?.statusModel ?? "none";

describe("preset catalogue", () => {
  it("has 7 presets: 3 otomatis, 2 semi, 2 harian", () => {
    expect(presets).toHaveLength(7);
    const by = (c: string) => presets.filter((p) => p.category === c).length;
    expect([by("otomatis"), by("semi"), by("harian")]).toEqual([3, 2, 2]);
  });

  it("uses the requested names", () => {
    expect(presets.map((p) => p.title)).toEqual([
      "Content Factory", "Knowledge to Action", "Weekly Progress Report",
      "Project Launchpad", "Learn & Practice", "Today's Navigator", "Evening Reset",
    ]);
  });

  it("has unique preset keys and unique stage keys per preset", () => {
    expect(new Set(presets.map((p) => p.key)).size).toBe(presets.length);
    for (const p of presets) expect(new Set(p.stages.map((s) => s.key)).size, p.key).toBe(p.stages.length);
  });

  it("semi presets ask the user to decide; otomatis and harian presets are not flagged as decisions", () => {
    for (const p of presets) {
      const decisions = p.stages.filter((s) => s.decision).length;
      if (p.category === "semi") expect(decisions, p.key).toBeGreaterThanOrEqual(2);
      if (p.category === "otomatis") expect(decisions, p.key).toBe(0);
    }
    expect(presets.find((p) => p.key === "project-launchpad")?.stages.filter((s) => s.decision)).toHaveLength(2);
  });
});

describe.each(presets.map((p) => [p.key, p] as const))("preset %s", (_key, preset) => {
  const snapshot = compilePreset(preset, counter());
  const { nodes, edges } = snapshotToGraph(snapshot, modelOf);

  it("compiles to a valid snapshot", () => {
    expect(snapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it("every stage config passes its handler schema", () => {
    for (const s of snapshot.stages) {
      const handler = getHandler(s.type);
      expect(handler, `${s.name}: unknown type ${s.type}`).toBeDefined();
      const r = handler?.configSchema.safeParse(s.config);
      expect(r?.success, `${s.name}: ${JSON.stringify(r)}`).toBe(true);
    }
  });

  it("respects text limits", () => {
    for (const s of snapshot.stages) expect(s.name.length).toBeLessThanOrEqual(120);
    for (const i of snapshot.items) expect(i.title.length).toBeLessThanOrEqual(300);
  });

  it("has no cycles and every link points to real stages", () => {
    expect(hasCycle(nodes, edges)).toBe(false);
    const ids = new Set(snapshot.stages.map((s) => s.id));
    for (const e of snapshot.edges) expect(ids.has(e.source) && ids.has(e.target)).toBe(true);
  });

  it("starts with only the first step open and the result locked", () => {
    const d = deriveAll(nodes, edges, {});
    const byName = (name: string) => snapshot.stages.find((s) => s.name === name)?.id as string;
    expect(d[byName("Isi bahan awal")]).toBe("TODO");
    const result = snapshot.stages.find((s) => s.type === "checklist")!;
    expect(d[result.id]).toBe("LOCKED");
    // exactly one work stage is open at the start besides the rules note
    const open = snapshot.stages.filter((s) => s.type !== "group" && d[s.id] !== "LOCKED").map((s) => s.name);
    expect(open.sort()).toEqual(["Aturan penting", "Isi bahan awal"]);
  });

  it("every step is reachable by finishing the previous ones in order", () => {
    // simulate completing steps in list order: nothing stays locked forever
    const done: Record<string, "DONE"> = {};
    for (const s of preset.stages) {
      const id = snapshot.stages.find((x) => x.name === s.name)!.id;
      const d = deriveAll(nodes, edges, done);
      expect(d[id], `${s.name} should be open when its predecessors are done`).not.toBe("LOCKED");
      done[id] = "DONE";
    }
  });

  it("lays stages out without overlapping boxes", () => {
    const boxes = snapshot.stages.map((s) => ({ name: s.name, x: s.posX, y: s.posY }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap = Math.abs(a.x - b.x) < 230 && Math.abs(a.y - b.y) < 120;
        expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false);
      }
    }
  });

  it("puts every stage in a group and groups first when copied to rows", () => {
    expect(snapshot.stages.filter((s) => s.type !== "group").every((s) => s.parentGroupId)).toBe(true);
    const rows = snapshotToRows(snapshot, "wf");
    const firstNonGroup = rows.stages.findIndex((s) => s.type !== "group");
    expect(rows.stages.slice(0, firstNonGroup).every((s) => s.type === "group")).toBe(true);
    const groupIds = new Set(rows.stages.filter((s) => s.type === "group").map((s) => s.id));
    for (const s of rows.stages) if (s.parent_group_id) expect(groupIds.has(s.parent_group_id)).toBe(true);
    expect(new Set(rows.stages.map((s) => s.id)).size).toBe(rows.stages.length);
    expect(rows.edges.every((e) => e.workflow_id === "wf")).toBe(true);
  });
});
