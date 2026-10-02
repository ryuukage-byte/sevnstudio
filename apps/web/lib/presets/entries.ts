import { snapshotSchema, snapshotToGraph, topoOrder } from "@sevn/engine";
import { getHandler } from "@sevn/handlers";
import { presets } from "./data";
import { categoryTag } from "./types";

/**
 * One list for everything you can start a project from. Built-in presets and the user's saved templates are the same
 * kind of thing; only the tags differ ("Bawaan" + category, or "Milik saya").
 */
export interface PickerEntry {
  /** Unique across both sources. */
  id: string;
  source: "preset" | "template";
  /** Preset key or template id, whichever the server action needs. */
  ref: string;
  title: string;
  tags: string[];
  steps: { name: string; decision: boolean }[];
  goal?: string;
  results?: string[];
}

export const TAG_BUILTIN = "Bawaan";
export const TAG_MINE = "Milik saya";

export function presetEntries(): PickerEntry[] {
  return presets.map((p) => ({
    id: `preset:${p.key}`,
    source: "preset" as const,
    ref: p.key,
    title: p.title,
    tags: [TAG_BUILTIN, categoryTag[p.category]],
    steps: p.stages.filter((s) => s.type !== "note").map((s) => ({ name: s.name, decision: !!s.decision })),
    goal: p.goal,
    results: p.results,
  }));
}

/** Entry for one saved template, or null if its snapshot is unreadable (it is then simply not offered). */
export function templateEntry(row: { id: string; name: string; snapshot: unknown }): PickerEntry | null {
  const parsed = snapshotSchema.safeParse(row.snapshot);
  if (!parsed.success) return null;
  const { nodes, edges } = snapshotToGraph(parsed.data, (t) => getHandler(t)?.statusModel ?? "none");
  const order = topoOrder(nodes, edges) ?? nodes.map((n) => n.id);
  const byId = new Map(parsed.data.stages.map((s) => [s.id, s] as const));
  const steps = order
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.type !== "group")
    .map((s) => ({ name: s.name, decision: false }));
  return { id: `template:${row.id}`, source: "template", ref: row.id, title: row.name, tags: [TAG_MINE], steps };
}
