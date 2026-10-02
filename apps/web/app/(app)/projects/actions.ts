"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildSnapshot, snapshotSchema } from "@sevn/engine";
import { createClient } from "@/lib/supabase/server";
import { loadDefinition } from "@/lib/definition";

const name = z.string().trim().min(1).max(120);

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

export async function createWorkflow(projectId: string, formData: FormData) {
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .insert({ project_id: projectId, name: parsed.data })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/projects/${projectId}/workflows/${data.id}`);
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

export async function startRunFromTemplate(projectId: string, formData: FormData) {
  const templateId = z.string().uuid().parse(formData.get("templateId"));
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: tpl, error: tplError } = await supabase.from("templates").select("snapshot").eq("id", templateId).single();
  if (tplError) throw tplError;
  const snapshot = snapshotSchema.parse(tpl.snapshot);
  const { data, error } = await supabase.rpc("create_run", {
    p_project_id: projectId,
    p_name: parsed.data,
    p_snapshot: snapshot,
    p_workflow_id: null,
    p_template_id: templateId,
  });
  if (error) throw error;
  redirect(`/projects/${projectId}/runs/${data}`);
}
