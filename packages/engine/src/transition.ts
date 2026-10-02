import type { Mode, StageEvent, StatusModel, StoredStatus } from "./types";

type Current = StoredStatus | null | undefined;

export type TransitionResult =
  | { ok: true; status: StoredStatus }
  | { ok: false; reason: string };


/**
 * Pure state machine for one stage. `current` null/undefined means not started.
 * Locking is NOT checked here; use deriveStatus() with the graph (must be READY/TODO) before START.
 * `mode` only matters for machine FINISH: auto skips REVIEW (caller must have validated output).
 */
export function transition(
  model: StatusModel,
  current: Current,
  event: StageEvent,
  mode: Mode = "semi_auto",
): TransitionResult {
  const bad = (): TransitionResult => ({
    ok: false,
    reason: `${event} not allowed from ${current ?? "unstarted"} for ${model}`,
  });
  const to = (status: StoredStatus): TransitionResult => ({ ok: true, status });

  switch (model) {
    case "none":
      return bad();

    case "checklist":
    case "task": {
      const next =
        event === "SET_TODO" ? "TODO" : event === "SET_DOING" ? "DOING" : event === "SET_DONE" ? "DONE" : null;
      // Manual stages move freely between TODO/DOING/DONE (a checklist's status follows its items).
      return next ? to(next) : bad();
    }

    case "machine": {
      switch (event) {
        case "START":
          if (!current || current === "TODO" || current === "STALE" || current === "APPROVED" || current === "REJECTED")
            return to("RUNNING");
          return bad();
        case "FINISH":
          if (current !== "RUNNING") return bad();
          return to(mode === "auto" ? "APPROVED" : "REVIEW");
        case "FAIL":
          return current === "RUNNING" ? to("FAILED") : bad();
        case "RETRY":
          return current === "FAILED" ? to("RUNNING") : bad();
        case "APPROVE":
          return current === "REVIEW" ? to("APPROVED") : bad();
        case "REJECT":
          // Rejection sends the stage back to RUNNING (regenerate), per PRD.
          return current === "REVIEW" ? to("RUNNING") : bad();
        case "MARK_STALE":
          return current === "APPROVED" ? to("STALE") : bad();
        case "DISMISS_STALE":
          return current === "STALE" ? to("APPROVED") : bad();
        default:
          return bad();
      }
    }

    case "gate": {
      switch (event) {
        case "START":
          return !current || current === "TODO" || current === "REJECTED" || current === "STALE" ? to("REVIEW") : bad();
        case "APPROVE":
          return current === "REVIEW" ? to("APPROVED") : bad();
        case "REJECT":
          return current === "REVIEW" ? to("REJECTED") : bad();
        case "MARK_STALE":
          return current === "APPROVED" ? to("STALE") : bad();
        case "DISMISS_STALE":
          return current === "STALE" ? to("APPROVED") : bad();
        default:
          return bad();
      }
    }
  }
}
