import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, PageShell } from "@/components/app/Page";
import { ProjectDescription } from "@/components/app/ProjectDescription";
import { WorkflowMenu } from "@/components/app/WorkflowMenu";
import { isMissingColumn } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Loads the project; works before migration 0011 (no description column) by falling back to name only. */
async function loadProject(supabase: Supabase, projectId: string): Promise<{ id: string; name: string; description: string | null } | null> {
  const withDescription = await supabase.from("projects").select("id, name, description").eq("id", projectId).maybeSingle();
  if (!withDescription.error) {
    const row = withDescription.data;
    return row ? { id: row.id as string, name: row.name as string, description: (row.description as string | null) ?? null } : null;
  }
  if (!isMissingColumn(withDescription.error, "description")) return null;
  const plain = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  return plain.data ? { id: plain.data.id as string, name: plain.data.name as string, description: null } : null;
}

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const supabase = await createClient();
  const project = await loadProject(supabase, projectId);
  return { title: project?.name ?? "Proyek" };
}

const bigButton = "sv-card flex min-h-32 items-end justify-between gap-4 p-6 text-left";

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const supabase = await createClient();
  const project = await loadProject(supabase, projectId);
  if (!project) notFound();

  const { data: workflows } = await supabase.from("workflows").select("id, name").eq("project_id", projectId).order("created_at");
  const list = (workflows ?? []).map((w) => ({ id: w.id as string, name: w.name as string }));

  return (
    <PageShell>
      <PageHero
        eyebrow="Proyek"
        title={project.name}
        description={<ProjectDescription projectId={projectId} initial={project.description} />}
        crumbs={[{ label: "Proyek", href: "/projects" }, { label: project.name }]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {list.length > 1 ? (
          <WorkflowMenu projectId={projectId} workflows={list} />
        ) : list[0] ? (
          <Link href={`/projects/${projectId}/workflows/${list[0].id}`} className={`${bigButton} sv-hover`}>
            <span className="text-2xl font-medium tracking-[-0.035em]">Alur kerja</span>
            <span className="sv-label" aria-hidden>Buka ↗</span>
          </Link>
        ) : (
          <div className={`${bigButton} opacity-60`}>
            <span className="text-2xl font-medium tracking-[-0.035em]">Alur kerja</span>
            <span className="sv-label">Kosong</span>
          </div>
        )}

        <div aria-disabled="true" className={`${bigButton} cursor-not-allowed opacity-60`} title="Belum tersedia">
          <span className="text-2xl font-medium tracking-[-0.035em]">Lihat live action</span>
          <span className="sv-badge">Segera hadir</span>
        </div>
      </div>
    </PageShell>
  );
}
