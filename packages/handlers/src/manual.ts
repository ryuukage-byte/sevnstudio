import { z } from "zod";
import type { StageHandler } from "./contract";

const text = [{ name: "text", type: "text" }] as const;

export const checklistHandler: StageHandler<{ description?: string }> = {
  type: "checklist",
  configSchema: z.object({ description: z.string().max(500).optional() }).strict(),
  inputPorts: [],
  outputPorts: [],
  defaultMode: "manual",
  statusModel: "checklist",
};

export const taskHandler: StageHandler<{ notes?: string; dueDate?: string }> = {
  type: "task",
  configSchema: z
    .object({
      notes: z.string().max(5000).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .strict(),
  inputPorts: text,
  outputPorts: text,
  defaultMode: "manual",
  statusModel: "task",
};

export const noteHandler: StageHandler<{ body: string }> = {
  type: "note",
  configSchema: z.object({ body: z.string().max(20000) }).strict(),
  inputPorts: [],
  outputPorts: text,
  defaultMode: "manual",
  statusModel: "task",
};

/** Visual grouping only; not a work stage, so it has no status and no ports. */
export const groupHandler: StageHandler<{ color?: string }> = {
  type: "group",
  configSchema: z.object({ color: z.string().max(30).optional() }).strict(),
  inputPorts: [],
  outputPorts: [],
  defaultMode: "manual",
  statusModel: "none",
};
