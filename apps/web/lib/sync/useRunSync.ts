"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoredStatus } from "@sevn/engine";
import { createClient } from "@/lib/supabase/client";
import type { RunItemRow } from "@/lib/run/derive";
import { acknowledge, enqueue, isNetworkError, mergeItems, mergeStages, parseQueue, type PendingOp } from "./queue";

interface Args {
  runId: string;
  initialItems: RunItemRow[];
  initialStored: Record<string, StoredStatus>;
}

/**
 * Optimistic run state with an offline write queue (persisted in localStorage, so it survives reloads).
 * UI updates instantly; changes are delivered per item when online, last-write-wins.
 */
export function useRunSync({ runId, initialItems, initialStored }: Args) {
  const supabase = useMemo(() => createClient(), []);
  const storageKey = `sevn:queue:${runId}`;

  const [serverItems, setServerItems] = useState(initialItems);
  const [serverStored, setServerStored] = useState(initialStored);
  const [queue, setQueue] = useState<PendingOp[]>([]);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef<PendingOp[]>([]);
  const flushing = useRef(false);
  const persist = useCallback(
    (q: PendingOp[]) => {
      queueRef.current = q;
      setQueue(q);
      try {
        if (q.length) localStorage.setItem(storageKey, JSON.stringify(q));
        else localStorage.removeItem(storageKey);
      } catch {
        // storage unavailable (private mode): changes still sync while the tab stays open
      }
    },
    [storageKey],
  );

  const send = useCallback(
    async (op: PendingOp): Promise<"ok" | "network" | "rejected"> => {
      const { error: err } =
        op.kind === "item"
          ? // updated_at guard makes a late, older write lose against a newer server row
            await supabase.from("run_items").update({ status: op.status, updated_at: op.updatedAt }).eq("id", op.id).lt("updated_at", op.updatedAt)
          : await supabase.from("stage_runs").upsert({ run_id: runId, stage_id: op.stageId, status: op.status }, { onConflict: "run_id,stage_id" });
      if (!err) return "ok";
      if (isNetworkError(err.message, navigator.onLine)) return "network";
      setError("Perubahan tidak bisa disimpan: " + err.message);
      return "rejected";
    },
    [supabase, runId],
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const op of [...queueRef.current]) {
        const r = await send(op);
        if (r === "network") break;
        if (r === "ok") {
          // Fold the delivered change into the server baseline before it leaves the queue, so the UI does not flicker back.
          if (op.kind === "item") {
            setServerItems((cur) =>
              cur.map((i) => (i.id === op.id && i.updated_at <= op.updatedAt ? { ...i, status: op.status, updated_at: op.updatedAt } : i)),
            );
          } else {
            setServerStored((s) => ({ ...s, [op.stageId]: op.status }));
          }
        }
        persist(acknowledge(queueRef.current, op));
      }
    } finally {
      flushing.current = false;
    }
  }, [send, persist]);

  // Restore a queue left over from a previous session, then try to deliver it.
  useEffect(() => {
    let restored: PendingOp[] = [];
    try {
      restored = parseQueue(localStorage.getItem(storageKey));
    } catch {
      /* ignore */
    }
    queueRef.current = restored;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of client-only storage
    setQueue(restored);
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      void flush();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const timer = window.setInterval(() => {
      if (queueRef.current.length) void flush();
    }, 10_000);
    void flush();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(timer);
    };
  }, [storageKey, flush]);

  const items = useMemo(() => mergeItems(serverItems, queue), [serverItems, queue]);
  const stored = useMemo(() => mergeStages(serverStored, queue), [serverStored, queue]);

  const push = useCallback(
    (op: PendingOp) => {
      setError(null);
      persist(enqueue(queueRef.current, op));
      void flush();
    },
    [persist, flush],
  );

  /** Toggles an item and enqueues the checklist's derived status. `nextStageStatus` is computed by the caller. */
  const setItemStatus = useCallback(
    (item: RunItemRow, status: "TODO" | "DONE", stageStatus: StoredStatus) => {
      const updatedAt = new Date().toISOString();
      push({ kind: "item", id: item.id, status, updatedAt });
      push({ kind: "stage", stageId: item.stage_id, status: stageStatus, updatedAt });
    },
    [push],
  );

  const setStageStatus = useCallback(
    (stageId: string, status: StoredStatus) => push({ kind: "stage", stageId, status, updatedAt: new Date().toISOString() }),
    [push],
  );

  return { items, stored, pending: queue.length, online, error, setItemStatus, setStageStatus };
}
