import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { createWorkflow, startRunFromTemplate } from "../actions";

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  const [workflows, runs, templates] = await Promise.all([
    supabase.from("workflows").select("id, name").eq("project_id", projectId).order("created_at"),
    supabase.from("runs").select("id, name, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("templates").select("id, name").order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 p-6">
      <header>
        <Link href="/projects" className="text-sm text-muted-foreground hover:underline">← Semua project</Link>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
      </header>

      <section>
        <h2 className="mb-2 font-medium">Workflow</h2>
        <ul className="mb-3 divide-y rounded-lg border">
          {workflows.data?.map((w) => (
            <li key={w.id} className="p-3">
              <Link href={`/projects/${projectId}/workflows/${w.id}`} className="hover:underline">{w.name}</Link>
            </li>
          ))}
        </ul>
        <form action={createWorkflow.bind(null, projectId)} className="flex gap-2">
          <Input name="name" placeholder="Workflow baru" required maxLength={120} />
          <Button type="submit" variant="outline">Tambah</Button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Run</h2>
        {runs.data?.length ? (
          <ul className="divide-y rounded-lg border">
            {runs.data.map((r) => (
              <li key={r.id} className="p-3">
                <Link href={`/projects/${projectId}/runs/${r.id}`} className="hover:underline">{r.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada run. Mulai dari workflow atau template.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Template</h2>
        {templates.data?.length ? (
          <ul className="space-y-2">
            {templates.data.map((t) => (
              <li key={t.id} className="rounded-lg border p-3">
                <form action={startRunFromTemplate.bind(null, projectId)} className="flex items-center gap-2">
                  <input type="hidden" name="templateId" value={t.id} />
                  <span className="flex-1 font-medium">{t.name}</span>
                  <Input name="name" placeholder="Nama run, mis. Trip #2" required maxLength={120} className="max-w-48" />
                  <Button type="submit" size="sm">Mulai run</Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada template. Simpan dari editor workflow.</p>
        )}
      </section>
    </main>
  );
}
