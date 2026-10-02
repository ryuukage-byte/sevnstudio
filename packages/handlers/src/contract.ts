import type { Mode, StatusModel } from "@sevn/engine";
import type { ZodType } from "zod";

export type PortType = "text" | "json" | "file";
export interface Port {
  name: string;
  type: PortType;
}

export interface RunContext<C = unknown> {
  stageRunId: string;
  attempt: number;
  config: C;
  inputs: Record<string, unknown>;
}
export interface RunResult {
  outputs: Record<string, unknown>;
}

/**
 * Contract shared by every stage type. The orchestrator only reads this shape and never
 * branches on `type`. `run` is absent for manual types (they need no worker). The React
 * `Workspace` for each type lives in apps/web (registry keyed by `type`) to keep this package UI-free.
 */
export interface StageHandler<C = unknown> {
  type: string;
  configSchema: ZodType<C>;
  inputPorts: readonly Port[];
  outputPorts: readonly Port[];
  defaultMode: Mode;
  /** Which state machine this type follows (see @sevn/engine transition). */
  statusModel: StatusModel;
  run?: (ctx: RunContext<C>) => Promise<RunResult>;
}
