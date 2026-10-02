"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { statusClass, statusLabel, typeLabel } from "./labels";

export interface StageNodeData extends Record<string, unknown> {
  name: string;
  type: string;
  groupName: string | null;
  /** Derived status; only present in run view. */
  status?: string;
  /** Why the stage is locked; only present in run view. */
  lockReason?: string;
  progress?: string;
}

export type StageFlowNode = Node<StageNodeData, "stage">;

export function StageNodeView({ data, selected }: NodeProps<StageFlowNode>) {
  const isGroup = data.type === "group";
  return (
    <div
      className={cn(
        "w-52 rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm",
        isGroup && "border-dashed bg-muted/50",
        selected && "ring-2 ring-ring",
        data.status === "LOCKED" && "opacity-70",
      )}
    >
      {!isGroup && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{data.name}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
          {typeLabel[data.type] ?? data.type}
        </span>
      </div>
      {data.groupName && <div className="mt-1 text-xs text-muted-foreground">Grup: {data.groupName}</div>}
      {data.status && (
        <div className="mt-2 flex items-center gap-2">
          <span className={cn("rounded px-1.5 py-0.5 text-xs", statusClass[data.status] ?? "bg-secondary")}>
            {statusLabel[data.status] ?? data.status}
          </span>
          {data.progress && <span className="text-xs text-muted-foreground">{data.progress}</span>}
        </div>
      )}
      {data.lockReason && <div className="mt-1 text-xs text-muted-foreground">{data.lockReason}</div>}
      {!isGroup && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
