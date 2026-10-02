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

export const inputHandler: StageHandler<{
  prompt?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
}> = {
  type: "input",
  configSchema: z
    .object({
      prompt: z.string().max(1000).optional(),
      placeholder: z.string().max(200).optional(),
      minLength: z.number().int().min(0).max(10000).optional(),
      maxLength: z.number().int().min(1).max(50000).optional(),
    })
    .strict(),
  inputPorts: [],
  outputPorts: text,
  defaultMode: "manual",
  statusModel: "task",
};

