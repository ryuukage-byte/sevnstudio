import { describe, expect, it } from "vitest";
import { compilePreset } from "./compile";
import { presets } from "./data";
import { presetEntries, templateEntry, TAG_BUILTIN, TAG_MINE } from "./entries";

const counter = () => {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};

describe("picker entries", () => {
  it("lists every built-in preset with the Bawaan tag plus its category", () => {
    const list = presetEntries();
    expect(list).toHaveLength(presets.length);
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
    for (const e of list) {
      expect(e.source).toBe("preset");
      expect(e.tags[0]).toBe(TAG_BUILTIN);
      expect(e.tags.length).toBe(2);
      expect(e.steps.length).toBeGreaterThan(0);
      expect(e.goal).toBeTruthy();
    }
    expect(list.find((e) => e.title === "Evening Reset")?.tags).toEqual(["Bawaan", "Sehari-hari"]);
  });

  it("flags decision steps on semi-automatic presets", () => {
    const launch = presetEntries().find((e) => e.title === "Project Launchpad");
    expect(launch?.steps.filter((s) => s.decision)).toHaveLength(2);
  });

  it("turns a saved template into the same kind of entry, tagged Milik saya, steps in flow order", () => {
    const snapshot = compilePreset(presets[0]!, counter());
    const e = templateEntry({ id: "11111111-1111-4111-8111-111111111111", name: "Punya saya", snapshot });
    expect(e).not.toBeNull();
    expect(e?.id).toBe("template:11111111-1111-4111-8111-111111111111");
    expect(e?.tags).toEqual([TAG_MINE]);
    expect(e?.steps).toHaveLength(snapshot.stages.length);
    // flow order: the first step is "Isi bahan awal" (or the rules note, which has no predecessor)
    expect(["Isi bahan awal", "Aturan penting"]).toContain(e?.steps[0]?.name);
  });

  it("skips templates whose snapshot cannot be read", () => {
    expect(templateEntry({ id: "x", name: "Rusak", snapshot: { nope: true } })).toBeNull();
  });

  it("ignores legacy group stages in a template's step list", () => {
    const snapshot = compilePreset(presets[5]!, counter());
    const withGroup = {
      ...snapshot,
      stages: [
        ...snapshot.stages,
        { id: "00000000-0000-4000-8000-0000000000ff", type: "group", name: "Lama", config: {}, mode: "manual" as const, posX: 0, posY: 0, parentGroupId: null },
      ],
    };
    const e = templateEntry({ id: "22222222-2222-4222-8222-222222222222", name: "Lama", snapshot: withGroup });
    expect(e?.steps.some((s) => s.name === "Lama")).toBe(false);
    expect(e?.steps).toHaveLength(snapshot.stages.length);
  });
});
