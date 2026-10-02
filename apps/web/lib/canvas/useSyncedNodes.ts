"use client";

import { useCallback, useEffect, useState } from "react";
import { applyNodeChanges, type Node, type NodeChange } from "@xyflow/react";

/**
 * Keeps React Flow's own node state (measured size, in-flight drag position) stable while our app state
 * (stage rows, selection, statuses) stays the source of truth. Feeding React Flow a fresh node array on every
 * render, or dropping its dimension/position changes, makes nodes re-measure and flicker while dragging.
 * `base` MUST be memoized; it is re-synced only when it changes.
 */
export function useSyncedNodes<N extends Node>(base: N[]) {
  const [nodes, setNodes] = useState<N[]>(base);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: merge app state into React Flow's own node state
    setNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n] as const));
      return base.map((b) => {
        const o = old.get(b.id);
        if (!o) return b;
        // Keep what React Flow measured, and never snap a node back while it is being dragged.
        return { ...b, measured: o.measured, width: o.width, height: o.height, position: o.dragging ? o.position : b.position, dragging: o.dragging };
      });
    });
  }, [base]);

  const onNodesChange = useCallback((changes: NodeChange<N>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), []);
  return [nodes, onNodesChange] as const;
}
