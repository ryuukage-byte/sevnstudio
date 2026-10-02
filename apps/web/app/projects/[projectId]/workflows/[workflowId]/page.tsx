import { notFound } from "next/navigation";
import { WorkflowEditor } from "@/components/canvas/WorkflowEditor";
import { createClient } from "@/lib/supabase/server";
import type { EdgeRow, ItemRow, StageRow } from "@/lib/editor/state";

export default async function WorkflowPage({ params }: PageProps<"/projects/[projectId]/workflows/[workflowId]">) {
  const { projectId, workflowId } = await params;
  const supabase = await createClient();
  const { data: workflow } = await supabase
    .from("workflows")
    .select("id, name")
    .eq("id", workflowId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!workflow) notFound();

  const [stages, edges] = await Promise.all([
    supabase.from("stages").select("*").eq("workflow_id", workflowId).order("created_at"),
    supabase.from("stage_connections").select("*").eq("workflow_id", workflowId).order("created_at"),
  ]);
  const stageIds = (stages.data ?? []).map((s) => s.id as string);
  const items = stageIds.length
    ? await supabase.from("items").select("*").in("stage_id", stageIds).order("sort_order")
    : { data: [] };

  return (
    <WorkflowEditor
      projectId={projectId}
      workflowId={workflowId}
      workflowName={workflow.name}
      initial={{
        stages: (stages.data ?? []) as StageRow[],
        edges: (edges.data ?? []) as EdgeRow[],
        items: (items.data ?? []) as ItemRow[],
      }}
    />
  );
}
