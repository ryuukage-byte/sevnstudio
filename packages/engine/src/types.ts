/** How a stage type moves through statuses. Declared by each handler; the engine never inspects stage types. */
export type StatusModel = "none" | "checklist" | "task" | "machine" | "gate";

export type Mode = "manual" | "semi_auto" | "auto";
export type EdgeKind = "blocking" | "flow";

/** Statuses persisted in stage_runs. LOCKED and READY are derived, never stored. */
export type StoredStatus =
  | "TODO"
  | "DOING"
  | "DONE"
  | "RUNNING"
  | "REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "STALE";

export type DerivedStatus = StoredStatus | "LOCKED" | "READY";

export interface StageNode {
  id: string;
  model: StatusModel;
  mode: Mode;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
}

/** Stored status per stage; missing or null means the stage has not started. */
export type StatusMap = Readonly<Record<string, StoredStatus | null | undefined>>;

export type StageEvent =
  | "START"
  | "FINISH"
  | "FAIL"
  | "RETRY"
  | "APPROVE"
  | "REJECT"
  | "MARK_STALE"
  | "DISMISS_STALE"
  | "SET_TODO"
  | "SET_DOING"
  | "SET_DONE";
