"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildSnapshot, cloneSnapshot, snapshotSchema, type Snapshot } from "@sevn/engine";
import { createClient } from "@/lib/supabase/server";
import { loadDefinition } from "@/lib/definition";
import { compilePreset, snapshotToRows } from "@/lib/presets/compile";
import { getPreset } from "@/lib/presets/data";
import { isMissingColumn } from "@/lib/db-errors";

const name = z.string().trim().min(1).max(120);

/**
 * Creates a workflow (stages, lines, items) inside a project from a snapshot. If any insert fails, the project is
 * removed again so no half-built project is left behind.
 */
async function buildProjectFromSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectName: string,
  workflowName: string,
  description: string | null,
  makeSnapshot: () => Snapshot,
): Promise<{ projectId: string; workflowId: string }> {
  let { data: project, error } = await supabase
    .from("projects")
    .insert({ name: projectName, description })
    .select("id")
    .single();
  // Until migration 0011 has been run there is no description column: create the project without it.
  if (isMissingColumn(error, "description")) {
    ({ data: project, error } = await supabase.from("projects").insert({ name: projectName }).select("id").single());
  }
  if (error || !project) throw error ?? new Error("project not created");
  const projectId = project.id as string;
  try {
    const { data: workflow, error: wfError } = await supabase
      .from("workflows")
      .insert({ project_id: projectId, name: workflowName })
      .select("id")
      .single();
    if (wfError) throw wfError;
    const rows = snapshotToRows(makeSnapshot(), workflow.id as string);
    // Stages first, then the lines and items that point at them.
    for (const [table, batch] of [
      ["stages", rows.stages],
      ["stage_connections", rows.edges],
      ["items", rows.items],
    ] as const) {
      if (!batch.length) continue;
      const { error: insertError } = await supabase.from(table).insert(batch as never);
      if (insertError) throw insertError;
    }
    return { projectId, workflowId: workflow.id as string };
  } catch (e) {
    await supabase.from("projects").delete().eq("id", projectId);
    throw e;
  }
}

/** New project from a built-in preset; opens its workflow. */
export async function createProjectFromPreset(presetKey: string, formData: FormData) {
  const preset = getPreset(presetKey);
  const parsed = name.safeParse(formData.get("name"));
  if (!preset || !parsed.success) return;
  const supabase = await createClient();
  const { projectId, workflowId } = await buildProjectFromSnapshot(supabase, parsed.data, preset.title, preset.goal, () =>
    compilePreset(preset, () => crypto.randomUUID()),
  );
  redirect(`/projects/${projectId}/workflows/${workflowId}`);
}

/** New project from one of the user's saved templates; opens its workflow. */
export async function createProjectFromTemplate(templateId: string, formData: FormData) {
  const id = z.string().uuid().safeParse(templateId);
  const parsed = name.safeParse(formData.get("name"));
  if (!id.success || !parsed.success) return;
  const supabase = await createClient();
  const { data: tpl, error } = await supabase.from("templates").select("name, description, snapshot").eq("id", id.data).single();
  if (error) throw error;
  const snapshot = snapshotSchema.parse(tpl.snapshot);
  const { projectId, workflowId } = await buildProjectFromSnapshot(supabase, parsed.data, tpl.name as string, (tpl.description as string | null) ?? null, () =>
    cloneSnapshot(snapshot, () => crypto.randomUUID()),
  );
  redirect(`/projects/${projectId}/workflows/${workflowId}`);
}

export async function createProject(formData: FormData) {
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: project, error } = await supabase.from("projects").insert({ name: parsed.data }).select("id").single();
  if (error) throw error;
  const { error: wfError } = await supabase.from("workflows").insert({ project_id: project.id, name: "Alur kerja 1" });
  if (wfError) throw wfError;
  redirect(`/projects/${project.id}`);
}

export async function deleteProject(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/projects");
}

/** Freezes the workflow's current definition into a template. */
export async function saveTemplate(workflowId: string, templateName: string) {
  const parsed = name.parse(templateName);
  const supabase = await createClient();
  const snapshot = buildSnapshot(await loadDefinition(supabase, workflowId));
  const { error } = await supabase.from("templates").insert({ name: parsed, snapshot });
  if (error) throw error;
}

/** Creates a run from the live workflow (the snapshot copies the definition; later edits do not touch the run). */
export async function startRunFromWorkflow(projectId: string, workflowId: string, runName: string) {
  const parsed = name.parse(runName);
  const supabase = await createClient();
  const snapshot = buildSnapshot(await loadDefinition(supabase, workflowId));
  const { data, error } = await supabase.rpc("create_run", {
    p_project_id: projectId,
    p_name: parsed,
    p_snapshot: snapshot,
    p_workflow_id: workflowId,
    p_template_id: null,
  });
  if (error) throw error;
  redirect(`/projects/${projectId}/runs/${data}`);
}

/** Saves the project's short description (empty text clears it). Returns an error message instead of throwing. */
export async function updateProjectDescription(projectId: string, text: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = z.string().trim().max(500).safeParse(text);
  if (!parsed.success) return { ok: false, message: "Deskripsi terlalu panjang (maksimal 500 huruf)." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ description: parsed.data === "" ? null : parsed.data })
    .eq("id", projectId);
  if (isMissingColumn(error, "description")) {
    return { ok: false, message: "Kolom deskripsi belum ada di database. Jalankan migration 0011 dulu." };
  }
  if (error) return { ok: false, message: "Deskripsi belum tersimpan. Coba lagi." };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
