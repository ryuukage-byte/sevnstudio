import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero, PageShell, SectionTitle } from "@/components/app/Page";
import { PresetGallery } from "@/components/app/PresetGallery";
import { presets } from "@/lib/presets/data";
import { createClient } from "@/lib/supabase/server";
import { createWorkflow, startRunFromTemplate } from "../actions";

const date = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  return { title: (data?.name as string | undefined) ?? "Proyek" };
}

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
    <PageShell>
      <PageHero
        eyebrow="Proyek"
        title={project.name as string}
        crumbs={[{ label: "Proyek", href: "/projects" }, { label: project.name as string }]}
      />

      <div className="space-y-12">
        <section>
          <SectionTitle title="Alur kerja" hint="Susunan langkah yang bisa Anda ubah kapan saja." count={workflows.data?.length ?? 0} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {workflows.data?.map((w) => (
              <li key={w.id as string}>
                <Link href={`/projects/${projectId}/workflows/${w.id}`} className="sv-card flex items-center justify-between gap-4 p-5">
                  <span className="text-lg font-medium tracking-[-0.03em]">{w.name as string}</span>
                  <span className="sv-label" aria-hidden>Ubah ↗</span>
                </Link>
              </li>
            ))}
          </ul>
          <form action={createWorkflow.bind(null, projectId)} className="mt-3 flex gap-2">
            <Input name="name" placeholder="Nama alur kerja baru" required maxLength={120} aria-label="Nama alur kerja baru" />
            <Button type="submit" variant="outline" className="h-10 shrink-0">Tambah</Button>
          </form>
        </section>

        <section>
          <SectionTitle
            title="Pengerjaan"
            hint="Satu kali mengerjakan sebuah alur, misalnya satu perjalanan. Setiap pengerjaan punya centang sendiri."
            count={runs.data?.length ?? 0}
          />
          {runs.data?.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {runs.data.map((r) => (
                <li key={r.id as string}>
                  <Link href={`/projects/${projectId}/runs/${r.id}`} className="sv-card flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-medium tracking-[-0.03em]">{r.name as string}</div>
                      <div className="sv-label mt-2">Dimulai {date(r.created_at as string)}</div>
                    </div>
                    <span className="sv-label" aria-hidden>Buka ↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="sv-empty">Belum ada yang dikerjakan. Mulai dari template di bawah, atau dari halaman alur kerja.</div>
          )}
        </section>

        <section>
          <SectionTitle
            title="Preset siap pakai"
            hint="Alur kerja yang sudah disusun."
            count={presets.length}
          />
          <PresetGallery projectId={projectId} presets={presets} />
        </section>

        <section>
          <SectionTitle title="Template" hint="Alur kerja yang disimpan agar bisa dipakai lagi dan lagi." count={templates.data?.length ?? 0} />
          {templates.data?.length ? (
            <ul className="space-y-3">
              {templates.data.map((t) => (
                <li key={t.id as string} className="sv-card p-4 sm:p-5">
                  <form action={startRunFromTemplate.bind(null, projectId)} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input type="hidden" name="templateId" value={t.id as string} />
                    <span className="flex-1 text-lg font-medium tracking-[-0.03em]">{t.name as string}</span>
                    <Input name="name" placeholder="Nama pengerjaan, mis. Trip #2" required maxLength={120} className="sm:max-w-56" aria-label="Nama pengerjaan" />
                    <Button type="submit" className="h-10">Mulai kerjakan</Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="sv-empty">Belum ada template. Simpan dari halaman alur kerja.</div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
