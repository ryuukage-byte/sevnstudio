import { describe, expect, it } from "vitest";
import { getHandler, handlers, stageTypes } from "./index";

describe("handlers", () => {
  it("registers the manual MVP types with a manual default mode", () => {
    expect(stageTypes.sort()).toEqual(["checklist", "input", "note", "task"]);
    for (const h of Object.values(handlers)) {
      expect(h.defaultMode).toBe("manual");
      expect(h.run).toBeUndefined(); // manual stages need no worker
    }
  });
  it("input stage has task status model and text output port", () => {
    expect(handlers.input.statusModel).toBe("task");
    expect(handlers.input.outputPorts).toEqual([{ name: "text", type: "text" }]);
  });
  it("validates config", () => {
    expect(handlers.task.configSchema.safeParse({ dueDate: "2026-11-01" }).success).toBe(true);
    expect(handlers.task.configSchema.safeParse({ dueDate: "1 Nov" }).success).toBe(false);
    expect(handlers.note.configSchema.safeParse({}).success).toBe(false);
    expect(handlers.checklist.configSchema.safeParse({ extra: 1 }).success).toBe(false);
    expect(handlers.input.configSchema.safeParse({ prompt: "Masukkan judul", placeholder: "Judul..." }).success).toBe(true);
  });
  it("looks up by type", () => {
    expect(getHandler("note")?.type).toBe("note");
    expect(getHandler("input")?.type).toBe("input");
    expect(getHandler("nope")).toBeUndefined();
  });
});
