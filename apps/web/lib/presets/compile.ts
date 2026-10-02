import { buildSnapshot, type Snapshot } from "@sevn/engine";
import type { Preset } from "./types";

const COLS = 4;
const X0 = 40;
const DX = 290;
const DY = 170;
const GROUP_Y = 20;
const NOTE_GAP = 150;
const CHAIN_Y = 310;

/**
 * Layout: groups on the top row; the step chain runs in a zig-zag (left→right, then right→left, ...) so each wrap is a short
 * vertical link; notes sit just above the step they refer to. Every group becomes a real `group` stage so the "Daftar" view
 * can section by it.
 */
function layout(preset: Preset): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const chain = preset.stages.filter((s) => s.type !== "note");
  chain.forEach((s, i) => {
    const row = Math.floor(i / COLS);
    const col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS);
    pos.set(s.key, { x: X0 + col * DX, y: CHAIN_Y + row * DY });
  });
  for (const note of preset.stages.filter((s) => s.type === "note")) {
    const target = preset.links.find(([from]) => from === note.key)?.[1];
    const at = target ? pos.get(target) : undefined;
    pos.set(note.key, at ? { x: at.x, y: at.y - NOTE_GAP } : { x: X0, y: CHAIN_Y - NOTE_GAP });
  }
  return pos;
}

/** Turns a preset into a snapshot (stages + links + items) with fresh ids. */
export function compilePreset(preset: Preset, newId: () => string): Snapshot {
  const groupNames = [...new Set(preset.stages.map((s) => s.group))];
  const groupIds = new Map(groupNames.map((g) => [g, newId()] as const));
  const stageIds = new Map(preset.stages.map((s) => [s.key, newId()] as const));
  const where = layout(preset);

  const stages = [
    ...groupNames.map((g, i) => ({
      id: groupIds.get(g) as string,
      type: "group",
      name: g,
      config: {},
      mode: "manual" as const,
      posX: X0 + i * DX,
      posY: GROUP_Y,
      parentGroupId: null,
    })),
    ...preset.stages.map((s) => ({
      id: stageIds.get(s.key) as string,
      type: s.type,
      name: s.name,
      config: s.type === "task" ? (s.text ? { notes: s.text } : {}) : s.type === "note" ? { body: s.text ?? "" } : {},
      mode: "manual" as const,
      posX: where.get(s.key)?.x ?? X0,
      posY: where.get(s.key)?.y ?? CHAIN_Y,
      parentGroupId: groupIds.get(s.group) as string,
    })),
  ];

  const edges = preset.links.map(([from, to, kind]) => {
    const source = stageIds.get(from);
    const target = stageIds.get(to);
    if (!source || !target) throw new Error(`preset ${preset.key}: unknown stage in link ${from} -> ${to}`);
    return { id: newId(), source, target, kind, sourcePort: "text" as const, targetPort: "text" as const };
  });

  const items = preset.stages.flatMap((s) =>
    (s.items ?? []).map((title, i) => ({
      id: newId(),
      stageId: stageIds.get(s.key) as string,
      title,
      qty: 1,
      note: null,
      dueDate: null,
      sortOrder: i + 1,
    })),
  );

  return buildSnapshot({ stages, edges, items });
}

/** Database rows for copying a snapshot into an editable workflow. Groups come first so the parent-group trigger passes. */
export function snapshotToRows(snapshot: Snapshot, workflowId: string) {
  const ordered = [...snapshot.stages].sort((a, b) => Number(b.type === "group") - Number(a.type === "group"));
  return {
    stages: ordered.map((s) => ({
      id: s.id,
      workflow_id: workflowId,
      type: s.type,
      name: s.name,
      config: s.config,
      mode: s.mode,
      pos_x: s.posX,
      pos_y: s.posY,
      parent_group_id: s.parentGroupId,
    })),
    edges: snapshot.edges.map((e) => ({
      id: e.id,
      workflow_id: workflowId,
      source_stage_id: e.source,
      target_stage_id: e.target,
      kind: e.kind,
      source_port: e.sourcePort,
      target_port: e.targetPort,
    })),
    items: snapshot.items.map((i) => ({
      id: i.id,
      stage_id: i.stageId,
      title: i.title,
      qty: i.qty,
      note: i.note,
      due_date: i.dueDate,
      sort_order: i.sortOrder,
    })),
  };
}
