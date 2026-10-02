// Pure offline-sync helpers. Last-write-wins per item: only the newest pending change per target is kept,
// and a pending change overrides server data only if it is at least as new as the server row.
import type { StoredStatus } from "@sevn/engine";
import type { RunItemRow } from "@/lib/run/derive";

export type PendingOp =
  | { kind: "item"; id: string; status: "TODO" | "DONE"; updatedAt: string }
  | { kind: "stage"; stageId: string; status: StoredStatus; updatedAt: string };

export const opKey = (op: PendingOp) => (op.kind === "item" ? `item:${op.id}` : `stage:${op.stageId}`);

/** Adds an op, replacing any older pending op for the same target. Never mutates. */
export function enqueue(queue: readonly PendingOp[], op: PendingOp): PendingOp[] {
  const key = opKey(op);
  if (queue.some((q) => opKey(q) === key && q.updatedAt > op.updatedAt)) return [...queue];
  return [...queue.filter((q) => opKey(q) !== key), op].sort((a, b) =>
    a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0,
  );
}

/** Removes an op once it has been delivered, unless a newer op for the same target arrived meanwhile. */
export function acknowledge(queue: readonly PendingOp[], sent: PendingOp): PendingOp[] {
  return queue.filter((q) => !(opKey(q) === opKey(sent) && q.updatedAt === sent.updatedAt));
}

/** Applies pending item changes over server rows (pending wins when not older than the server row). */
export function mergeItems(server: readonly RunItemRow[], queue: readonly PendingOp[]): RunItemRow[] {
  const pending = new Map(queue.filter((q) => q.kind === "item").map((q) => [(q as { id: string }).id, q] as const));
  return server.map((row) => {
    const op = pending.get(row.id);
    if (!op || op.kind !== "item" || op.updatedAt < row.updated_at) return row;
    return { ...row, status: op.status, updated_at: op.updatedAt };
  });
}

/** Applies pending stage statuses over stored statuses. */
export function mergeStages(
  server: Readonly<Record<string, StoredStatus>>,
  queue: readonly PendingOp[],
): Record<string, StoredStatus> {
  const out: Record<string, StoredStatus> = { ...server };
  for (const op of queue) if (op.kind === "stage") out[op.stageId] = op.status;
  return out;
}

/** True for failures caused by connectivity (retry later) rather than the server rejecting the write. */
export function isNetworkError(message: string | undefined, online: boolean): boolean {
  if (!online) return true;
  return !!message && /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message);
}

export function parseQueue(raw: string | null): PendingOp[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v)
      ? v.filter((o): o is PendingOp => !!o && typeof o === "object" && (o.kind === "item" || o.kind === "stage") && typeof o.updatedAt === "string")
      : [];
  } catch {
    return [];
  }
}
