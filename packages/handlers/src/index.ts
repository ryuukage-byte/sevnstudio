import type { StageHandler } from "./contract";
import { checklistHandler, inputHandler, noteHandler, taskHandler } from "./manual";

export * from "./contract";
export * from "./manual";

// Phase 1-2 registry: manual types only. AI/API/Review handlers arrive in later phases.
export const handlers = {
  checklist: checklistHandler,
  task: taskHandler,
  note: noteHandler,
  input: inputHandler,
} as const satisfies Record<string, StageHandler<any>>;

export type StageType = keyof typeof handlers;
export const stageTypes = Object.keys(handlers) as StageType[];

export function getHandler(type: string): StageHandler<unknown> | undefined {
  return (handlers as Record<string, StageHandler<unknown>>)[type];
}
