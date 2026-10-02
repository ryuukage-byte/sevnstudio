import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmSubmit } from "@/components/app/ConfirmSubmit";
import { PageHero, PageShell } from "@/components/app/Page";
import { createClient } from "@/lib/supabase/server";
import { createProject, deleteProject } from "./actions";

export const metadata: Metadata = { title: "Proyek" };

const date = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <PageShell>
      <PageHero
        eyebrow="Sevn Studio / Proyek"
        title="Proyek Anda"
        description="Satu proyek adalah satu pekerjaan, misalnya sebuah perjalanan atau satu konten. Di dalamnya ada alur kerja dan daftar yang Anda kerjakan."
      />

      <form action={createProject} className="sv-card mb-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input name="name" placeholder="Nama proyek baru, mis. Trip Jepang Nov 2026" required maxLength={120} aria-label="Nama proyek baru" />
        <Button type="submit" size="lg" className="h-10 sm:w-32">Buat proyek</Button>
      </form>

      {projects?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id} className="sv-card sv-hover flex min-h-44 flex-col justify-between p-6">
              <Link href={`/projects/${p.id}`} className="absolute inset-0 rounded-[inherit]" aria-label={`Buka proyek ${p.name}`} />
              <div className="relative flex items-start justify-between gap-3">
                <span className="sv-badge" data-tone="active">Aktif</span>
                <form action={deleteProject} className="relative z-10">
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmSubmit label="Hapus" confirmLabel="Yakin hapus?" />
                </form>
              </div>
              <div className="pointer-events-none relative mt-8">
                <h2 className="text-2xl font-medium leading-tight tracking-[-0.035em]">{p.name}</h2>
                <div className="sv-label mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span>Dibuat {date(p.created_at as string)}</span>
                  <span aria-hidden>Buka ↗</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="sv-empty">
          <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full border border-border-strong font-mono text-xs text-faint">—</div>
          Belum ada proyek. Buat yang pertama di atas.
        </div>
      )}
    </PageShell>
  );
}
