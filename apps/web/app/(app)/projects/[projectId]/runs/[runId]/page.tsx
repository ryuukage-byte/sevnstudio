import { notFound } from "next/navigation";
import { snapshotSchema, type StoredStatus } from "@sevn/engine";
import { RunView } from "@/components/canvas/RunView";
import type { RunItemRow } from "@/lib/run/derive";
import { createClient } from "@/lib/supabase/server";

export default async function RunPage({ params }: PageProps<"/projects/[projectId]/runs/[runId]">) {
  const { projectId, runId } = await params;
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("runs")
    .select("id, name, snapshot, workflow_id")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!run) notFound();
  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  const [stageRuns, items] = await Promise.all([
    supabase.from("stage_runs").select("stage_id, status, outputs").eq("run_id", runId),
    supabase.from("run_items").select("*").eq("run_id", runId).order("sort_order"),
  ]);

  const stored: Record<string, StoredStatus> = {};
  const outputs: Record<string, Record<string, unknown>> = {};
  for (const r of stageRuns.data ?? []) {
    stored[r.stage_id] = r.status as StoredStatus;
    if (r.outputs && typeof r.outputs === "object") outputs[r.stage_id] = r.outputs as Record<string, unknown>;
  }

  return (
    <RunView
      projectId={projectId}
      runId={runId}
      runName={run.name}
      projectName={(project?.name as string | undefined) ?? "Proyek"}
      workflowId={(run.workflow_id as string | null) ?? null}
      snapshot={snapshotSchema.parse(run.snapshot)}
      initialStored={stored}
      initialOutputs={outputs}
      initialItems={(items.data ?? []) as RunItemRow[]}
    />
  );
}
