import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, PageShell } from "@/components/app/Page";
import { WorkflowMenu } from "@/components/app/WorkflowMenu";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  return { title: (data?.name as string | undefined) ?? "Proyek" };
}

const bigButton =
  "sv-card flex min-h-32 items-end justify-between gap-4 p-6 text-left";

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  const { data: workflows } = await supabase.from("workflows").select("id, name").eq("project_id", projectId).order("created_at");
  const list = (workflows ?? []).map((w) => ({ id: w.id as string, name: w.name as string }));

  return (
    <PageShell>
      <PageHero eyebrow="Proyek" title={project.name as string} crumbs={[{ label: "Proyek", href: "/projects" }, { label: project.name as string }]} />

      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
        <div>
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
          <p className="mt-3 px-2 text-sm leading-6 text-muted-foreground">Susun langkah-langkahnya, lalu kerjakan satu per satu.</p>
        </div>

        <div>
          <div aria-disabled="true" className={`${bigButton} cursor-not-allowed opacity-60`} title="Belum tersedia">
            <span className="text-2xl font-medium tracking-[-0.035em]">Lihat live action</span>
            <span className="sv-badge">Segera hadir</span>
          </div>
          <p className="mt-3 px-2 text-sm leading-6 text-muted-foreground">Nantinya menampilkan jalannya pekerjaan secara visual.</p>
        </div>
      </div>
    </PageShell>
  );
}
