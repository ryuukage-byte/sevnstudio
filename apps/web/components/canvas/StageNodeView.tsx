"use client";

import { Handle, NodeToolbar, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone, typeLabel } from "./labels";

export interface StageNodeData extends Record<string, unknown> {
  name: string;
  type: string;
  /** Derived status; only present in run view. */
  status?: string;
  /** Why the stage is locked; only present in run view. */
  lockReason?: string;
  progress?: string;
  /** Editor only: shown in the toolbar above a selected node. */
  onEdit?: () => void;
  onDelete?: () => void;
}

export type StageFlowNode = Node<StageNodeData, "stage">;

export function StageNodeView({ data, selected }: NodeProps<StageFlowNode>) {
  const isGroup = data.type === "group";
  return (
    <div
      className={cn(
        "w-56 rounded-2xl border bg-[linear-gradient(145deg,#151515,#0e0e0e)] px-3.5 py-3 text-card-foreground shadow-[0_14px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.025)] transition-[border-color,box-shadow] duration-300",
        selected ? "border-white/40 shadow-[0_0_0_3px_rgba(255,255,255,0.06),0_14px_30px_rgba(0,0,0,0.3)]" : "border-border-strong",
        isGroup && "border-dashed bg-white/[0.02] bg-none",
        data.status === "LOCKED" && "opacity-60",
      )}
    >
      {data.onEdit && data.onDelete && (
        <NodeToolbar
          isVisible={selected}
          position={Position.Top}
          offset={10}
          className="flex gap-0.5 rounded-xl border border-border-strong bg-popover p-1 shadow-xl"
        >
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent" onClick={data.onEdit}>
            Ubah
          </button>
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10" onClick={data.onDelete}>
            Hapus
          </button>
        </NodeToolbar>
      )}
      {/* One handle per side. All are "source" handles; the editor runs React Flow in loose connection mode,
          and edges pick the sides that fit the layout (see lib/canvas/handles.ts). */}
      {!isGroup && (
        <>
          <Handle id="left" type="source" position={Position.Left} />
          <Handle id="top" type="source" position={Position.Top} />
        </>
      )}
      <div className="sv-label mb-1.5">{typeLabel[data.type] ?? data.type}</div>
      <div className="truncate font-[family-name:var(--font-heading)] text-[17px] font-medium leading-tight tracking-[-0.03em]">{data.name}</div>
      {data.status && (
        <div className="mt-3 flex items-center gap-2">
          <span className="sv-badge" data-tone={statusTone[data.status] ?? ""}>
            {statusLabel[data.status] ?? data.status}
          </span>
          {data.progress && <span className="font-mono text-[10px] text-muted-foreground">{data.progress}</span>}
        </div>
      )}
      {data.lockReason && <div className="mt-2 text-xs leading-snug text-muted-foreground">{data.lockReason}</div>}
      {!isGroup && (
        <>
          <Handle id="right" type="source" position={Position.Right} />
          <Handle id="bottom" type="source" position={Position.Bottom} />
        </>
      )}
    </div>
  );
}
