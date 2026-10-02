import type { DefinitionRows } from "@sevn/engine";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Loads a workflow definition (stages, edges, items) as camelCased rows. RLS scopes this to the owner. */
export async function loadDefinition(supabase: SupabaseClient, workflowId: string): Promise<DefinitionRows> {
  const [stages, edges] = await Promise.all([
    supabase.from("stages").select("*").eq("workflow_id", workflowId).order("created_at"),
    supabase.from("stage_connections").select("*").eq("workflow_id", workflowId).order("created_at"),
  ]);
  if (stages.error) throw stages.error;
  if (edges.error) throw edges.error;
  const stageIds = (stages.data ?? []).map((s) => s.id as string);
  const items = stageIds.length
    ? await supabase.from("items").select("*").in("stage_id", stageIds).order("sort_order")
    : { data: [], error: null };
  if (items.error) throw items.error;

  return {
    stages: (stages.data ?? []).map((s) => ({
      id: s.id, type: s.type, name: s.name, config: s.config ?? {}, mode: s.mode,
      posX: s.pos_x, posY: s.pos_y, parentGroupId: s.parent_group_id,
    })),
    edges: (edges.data ?? []).map((e) => ({
      id: e.id, source: e.source_stage_id, target: e.target_stage_id, kind: e.kind,
      sourcePort: e.source_port, targetPort: e.target_port,
    })),
    items: (items.data ?? []).map((i) => ({
      id: i.id, stageId: i.stage_id, title: i.title, qty: i.qty, note: i.note ?? null,
      dueDate: i.due_date ?? null, sortOrder: i.sort_order,
    })),
  };
}
