import { describe, expect, it } from "vitest";
import {
  autoRunnable, checklistStatus, connectedGroups, deriveAll, deriveStatus, hasCycle, lockReasons,
  staleTargets, topoOrder, transition, validateConnection,
  type Edge, type Mode, type StageNode, type StatusMap,
} from "./index";

const n = (id: string, model: StageNode["model"], mode: Mode = "manual"): StageNode => ({ id, model, mode });
const e = (source: string, target: string, kind: Edge["kind"] = "blocking"): Edge => ({
  id: `${source}-${target}`, source, target, kind,
});

// Workflow B: idea -> script -> review -> tts -> output (all blocking)
const wfB = {
  nodes: [n("idea", "task"), n("script", "machine", "semi_auto"), n("review", "gate"), n("tts", "machine", "auto"), n("out", "task")],
  edges: [e("idea", "script"), e("script", "review"), e("review", "tts"), e("tts", "out")],
};

describe("deriveStatus", () => {
  it("locks stages behind unsatisfied blocking edges and unlocks the first", () => {
    const d = deriveAll(wfB.nodes, wfB.edges, {});
    expect(d).toEqual({ idea: "TODO", script: "LOCKED", review: "LOCKED", tts: "LOCKED", out: "LOCKED" });
  });

  it("unlocks downstream when upstream is DONE/APPROVED", () => {
    const s: StatusMap = { idea: "DONE" };
    expect(deriveStatus(wfB.nodes, wfB.edges, s, "script")).toBe("READY");
    expect(deriveStatus(wfB.nodes, wfB.edges, { ...s, script: "REVIEW" }, "review")).toBe("LOCKED");
  });

  it("does not lock on flow edges", () => {
    const nodes = [n("packing", "checklist"), n("docs", "checklist")];
    expect(deriveStatus(nodes, [e("docs", "packing", "flow")], {}, "packing")).toBe("TODO");
  });

  it("Workflow A: docs -> booking blocking, packing free", () => {
    const nodes = [n("docs", "checklist"), n("booking", "checklist"), n("packing", "checklist"), n("g", "none")];
    const edges = [e("docs", "booking")];
    expect(deriveAll(nodes, edges, {})).toMatchObject({ booking: "LOCKED", packing: "TODO", docs: "TODO" });
    expect(lockReasons(nodes, edges, {}, "booking")).toEqual(["docs"]);
    expect(deriveStatus(nodes, edges, { docs: "DONE" }, "booking")).toBe("TODO");
  });

  it("treats group nodes as transparent", () => {
    const nodes = [n("g", "none"), n("a", "task")];
    expect(deriveStatus(nodes, [e("g", "a")], {}, "a")).toBe("TODO");
  });

  it("keeps a started stage's stored status even if upstream is unsatisfied", () => {
    expect(deriveStatus(wfB.nodes, wfB.edges, { script: "STALE" }, "script")).toBe("STALE");
  });

  it("throws on unknown stage", () => {
    expect(() => deriveStatus([], [], {}, "x")).toThrow();
  });
});

describe("checklistStatus", () => {
  it("derives from item counts", () => {
    expect(checklistStatus(0, 0)).toBe("TODO");
    expect(checklistStatus(0, 3)).toBe("TODO");
    expect(checklistStatus(1, 3)).toBe("DOING");
    expect(checklistStatus(3, 3)).toBe("DONE");
  });
});

describe("transition", () => {
  const ok = (m: StageNode["model"], from: Parameters<typeof transition>[1], ev: Parameters<typeof transition>[2], mode?: Mode) => {
    const r = transition(m, from, ev, mode);
    return r.ok ? r.status : `ERR`;
  };

  it("machine happy path (semi-auto)", () => {
    expect(ok("machine", null, "START")).toBe("RUNNING");
    expect(ok("machine", "RUNNING", "FINISH", "semi_auto")).toBe("REVIEW");
    expect(ok("machine", "REVIEW", "APPROVE")).toBe("APPROVED");
  });
  it("auto FINISH skips REVIEW", () => {
    expect(ok("machine", "RUNNING", "FINISH", "auto")).toBe("APPROVED");
  });
  it("reject returns to RUNNING; failure can retry", () => {
    expect(ok("machine", "REVIEW", "REJECT")).toBe("RUNNING");
    expect(ok("machine", "RUNNING", "FAIL")).toBe("FAILED");
    expect(ok("machine", "FAILED", "RETRY")).toBe("RUNNING");
  });
  it("stale cycle", () => {
    expect(ok("machine", "APPROVED", "MARK_STALE")).toBe("STALE");
    expect(ok("machine", "STALE", "START")).toBe("RUNNING");
    expect(ok("machine", "STALE", "DISMISS_STALE")).toBe("APPROVED");
  });
  it("gate: READY -> REVIEW -> APPROVED/REJECTED", () => {
    expect(ok("gate", null, "START")).toBe("REVIEW");
    expect(ok("gate", "REVIEW", "APPROVE")).toBe("APPROVED");
    expect(ok("gate", "REVIEW", "REJECT")).toBe("REJECTED");
  });
  it("manual models move freely among TODO/DOING/DONE", () => {
    expect(ok("task", "TODO", "SET_DOING")).toBe("DOING");
    expect(ok("task", "DOING", "SET_DONE")).toBe("DONE");
    expect(ok("checklist", "DONE", "SET_TODO")).toBe("TODO");
  });
  it("rejects illegal transitions", () => {
    expect(ok("machine", "REVIEW", "FINISH")).toBe("ERR");
    expect(ok("machine", "RUNNING", "START")).toBe("ERR");
    expect(ok("machine", "REVIEW", "MARK_STALE")).toBe("ERR");
    expect(ok("task", "TODO", "APPROVE")).toBe("ERR");
    expect(ok("none", null, "START")).toBe("ERR");
    expect(ok("gate", "APPROVED", "REJECT")).toBe("ERR");
  });
});

describe("staleTargets", () => {
  it("flags approved downstream machine/gate stages transitively, leaves others", () => {
    const s: StatusMap = { idea: "DONE", script: "APPROVED", review: "APPROVED", tts: "APPROVED", out: "DONE" };
    expect(staleTargets(wfB.nodes, wfB.edges, s, "script").sort()).toEqual(["review", "tts"]);
  });
  it("skips stages not APPROVED and does not include the changed stage", () => {
    const s: StatusMap = { script: "APPROVED", review: "REVIEW", tts: "APPROVED" };
    expect(staleTargets(wfB.nodes, wfB.edges, s, "script")).toEqual(["tts"]);
  });
  it("propagates over flow edges too", () => {
    const nodes = [n("note", "task"), n("ai", "machine")];
    expect(staleTargets(nodes, [e("note", "ai", "flow")], { ai: "APPROVED" }, "note")).toEqual(["ai"]);
  });
  it("is empty with no downstream", () => {
    expect(staleTargets(wfB.nodes, wfB.edges, { out: "DONE" }, "out")).toEqual([]);
  });
});

describe("autoRunnable", () => {
  it("only unstarted READY auto machine stages", () => {
    const s: StatusMap = { idea: "DONE", script: "APPROVED", review: "APPROVED" };
    expect(autoRunnable(wfB.nodes, wfB.edges, s)).toEqual(["tts"]);
  });
  it("never re-runs APPROVED/STALE results", () => {
    const s: StatusMap = { idea: "DONE", script: "APPROVED", review: "APPROVED", tts: "STALE" };
    expect(autoRunnable(wfB.nodes, wfB.edges, s)).toEqual([]);
  });
  it("skips locked auto stages", () => {
    expect(autoRunnable(wfB.nodes, wfB.edges, {})).toEqual([]);
  });
});

describe("graph", () => {
  it("topoOrder and cycle detection", () => {
    expect(topoOrder(wfB.nodes, wfB.edges)).toEqual(["idea", "script", "review", "tts", "out"]);
    const cyc = [...wfB.edges, e("out", "idea")];
    expect(hasCycle(wfB.nodes, cyc)).toBe(true);
    expect(topoOrder(wfB.nodes, cyc)).toBeNull();
  });
  it("validateConnection", () => {
    const nodes = [...wfB.nodes, n("g", "none")];
    expect(validateConnection(nodes, wfB.edges, "idea", "idea")).toBe("self_loop");
    expect(validateConnection(nodes, wfB.edges, "idea", "script")).toBe("duplicate");
    expect(validateConnection(nodes, wfB.edges, "out", "idea")).toBe("cycle");
    expect(validateConnection(nodes, wfB.edges, "g", "idea")).toBe("group_edge");
    expect(validateConnection(nodes, wfB.edges, "idea", "zzz")).toBe("unknown_stage");
    expect(validateConnection(nodes, wfB.edges, "idea", "tts")).toBeNull();
  });
});

describe("connectedGroups (kelompok derived from lines)", () => {
  const w = (ids: string[]) => ids.map((id) => n(id, "task"));

  it("joins steps connected by lines and leaves unconnected steps loose", () => {
    const g = connectedGroups(w(["a", "b", "c", "d"]), [e("a", "b")]);
    expect(g.groups).toEqual([["a", "b"]]);
    expect(g.loose).toEqual(["c", "d"]);
  });

  it("treats flow lines like blocking lines", () => {
    expect(connectedGroups(w(["a", "b"]), [e("a", "b", "flow")]).groups).toEqual([["a", "b"]]);
  });

  it("separates unrelated chains and orders each in flow order", () => {
    const g = connectedGroups(w(["x", "b", "a", "y"]), [e("a", "b"), e("x", "y")]);
    expect(g.groups).toEqual([["x", "y"], ["a", "b"]]);
    expect(g.loose).toEqual([]);
  });

  it("merges chains once a line connects them", () => {
    expect(connectedGroups(w(["a", "b", "c", "d"]), [e("a", "b"), e("c", "d"), e("b", "c")]).groups).toEqual([["a", "b", "c", "d"]]);
  });

  it("ignores legacy group stages and lines to them", () => {
    const nodes = [n("g", "none"), n("a", "task"), n("b", "task")];
    const g = connectedGroups(nodes, [e("a", "g"), e("a", "b")]);
    expect(g.groups).toEqual([["a", "b"]]);
    expect(g.loose).toEqual([]);
  });

  it("works with no lines and with no steps", () => {
    expect(connectedGroups(w(["a", "b"]), [])).toEqual({ groups: [], loose: ["a", "b"] });
    expect(connectedGroups([], [])).toEqual({ groups: [], loose: [] });
  });
});
