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
    .select("id, name, snapshot")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!run) notFound();

  const [stageRuns, items] = await Promise.all([
    supabase.from("stage_runs").select("stage_id, status").eq("run_id", runId),
    supabase.from("run_items").select("*").eq("run_id", runId).order("sort_order"),
  ]);

  const stored: Record<string, StoredStatus> = {};
  for (const r of stageRuns.data ?? []) stored[r.stage_id] = r.status as StoredStatus;

  return (
    <RunView
      projectId={projectId}
      runId={runId}
      runName={run.name}
      snapshot={snapshotSchema.parse(run.snapshot)}
      initialStored={stored}
      initialItems={(items.data ?? []) as RunItemRow[]}
    />
  );
}
