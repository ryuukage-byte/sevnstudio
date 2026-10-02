import { describe, expect, it } from "vitest";
import type { RunItemRow } from "@/lib/run/derive";
import { acknowledge, enqueue, isNetworkError, mergeItems, mergeOutputs, mergeStages, parseQueue, type PendingOp } from "./queue";

const item = (id: string, status: "TODO" | "DONE", updated_at: string): RunItemRow => ({
  id, run_id: "r", stage_id: "s", title: id, qty: 1, note: null, due_date: null, sort_order: 0, status, updated_at,
});
const op = (id: string, status: "TODO" | "DONE", updatedAt: string): PendingOp => ({ kind: "item", id, status, updatedAt });

describe("queue", () => {
  it("keeps only the newest pending op per item (last-write-wins)", () => {
    let q = enqueue([], op("a", "DONE", "2026-10-02T10:00:00Z"));
    q = enqueue(q, op("a", "TODO", "2026-10-02T10:00:05Z"));
    q = enqueue(q, op("b", "DONE", "2026-10-02T10:00:01Z"));
    expect(q).toHaveLength(2);
    expect(q.find((x) => x.kind === "item" && x.id === "a")).toMatchObject({ status: "TODO" });
  });

  it("does not let an older op replace a newer one", () => {
    const q = enqueue([op("a", "DONE", "2026-10-02T10:00:09Z")], op("a", "TODO", "2026-10-02T10:00:01Z"));
    expect(q).toEqual([op("a", "DONE", "2026-10-02T10:00:09Z")]);
  });

  it("acknowledge removes only the delivered version", () => {
    const sent = op("a", "DONE", "2026-10-02T10:00:00Z");
    const newer = op("a", "TODO", "2026-10-02T10:00:05Z");
    expect(acknowledge([sent], sent)).toEqual([]);
    expect(acknowledge([newer], sent)).toEqual([newer]); // user toggled again while sending
  });

  it("is immutable", () => {
    const q: PendingOp[] = [];
    enqueue(q, op("a", "DONE", "2026-10-02T10:00:00Z"));
    expect(q).toEqual([]);
  });
});

describe("merge", () => {
  const server = [item("a", "TODO", "2026-10-02T09:00:00Z"), item("b", "DONE", "2026-10-02T11:00:00Z")];

  it("applies offline checks over older server rows", () => {
    const merged = mergeItems(server, [op("a", "DONE", "2026-10-02T10:00:00Z")]);
    expect(merged[0]).toMatchObject({ status: "DONE", updated_at: "2026-10-02T10:00:00Z" });
  });

  it("server wins when it is newer than the pending op", () => {
    expect(mergeItems(server, [op("b", "TODO", "2026-10-02T10:00:00Z")])[1]?.status).toBe("DONE");
  });

  it("merges stage statuses", () => {
    expect(mergeStages({ s1: "TODO" }, [{ kind: "stage", stageId: "s1", status: "DONE", updatedAt: "x" }])).toEqual({ s1: "DONE" });
  });

  it("merges stage outputs", () => {
    expect(
      mergeOutputs(
        { s1: { text: "draf awal" } },
        [{ kind: "stage", stageId: "s1", status: "DONE", outputs: { text: "revisi terbaru" }, updatedAt: "x" }],
      ),
    ).toEqual({ s1: { text: "revisi terbaru" } });
  });
});

describe("helpers", () => {
  it("classifies network errors", () => {
    expect(isNetworkError("TypeError: Failed to fetch", true)).toBe(true);
    expect(isNetworkError("anything", false)).toBe(true);
    expect(isNetworkError("new row violates row-level security policy", true)).toBe(false);
  });
  it("parses stored queues defensively", () => {
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue("not json")).toEqual([]);
    expect(parseQueue('[{"kind":"x"},{"kind":"item","id":"a","status":"DONE","updatedAt":"t"}]')).toHaveLength(1);
  });
});
