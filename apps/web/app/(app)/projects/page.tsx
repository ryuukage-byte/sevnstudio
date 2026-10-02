import Link from "next/link";
import type { Metadata } from "next";
import { ConfirmSubmit } from "@/components/app/ConfirmSubmit";
import { NewProjectFab } from "@/components/app/NewProjectFab";
import { PageHero, PageShell } from "@/components/app/Page";
import { presetEntries, templateEntry } from "@/lib/presets/entries";
import { createClient } from "@/lib/supabase/server";
import { createProject, createProjectFromPreset, createProjectFromTemplate, deleteProject } from "./actions";

export const metadata: Metadata = { title: "Proyek" };

const date = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [projects, templates] = await Promise.all([
    supabase.from("projects").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("templates").select("id, name, snapshot").order("created_at", { ascending: false }),
  ]);

  // Built-in presets and the user's own templates are one list; only the tags differ.
  const entries = [
    ...presetEntries(),
    ...(templates.data ?? []).flatMap((t) => templateEntry({ id: t.id as string, name: t.name as string, snapshot: t.snapshot }) ?? []),
  ];

  return (
    <PageShell>
      <PageHero eyebrow="Sevn Studio / Proyek" title="Proyek Anda" />

      {projects.data?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.data.map((p) => (
            <li key={p.id as string} className="sv-card sv-hover flex min-h-44 flex-col justify-between p-6">
              <Link href={`/projects/${p.id}`} className="absolute inset-0 rounded-[inherit]" aria-label={`Buka proyek ${p.name}`} />
              <div className="relative flex items-start justify-between gap-3">
                <span className="sv-badge" data-tone="active">Aktif</span>
                <form action={deleteProject} className="relative z-10">
                  <input type="hidden" name="id" value={p.id as string} />
                  <ConfirmSubmit label="Hapus" confirmLabel="Yakin hapus?" />
                </form>
              </div>
              <div className="pointer-events-none relative mt-8">
                <h2 className="text-2xl font-medium leading-tight tracking-[-0.035em]">{p.name as string}</h2>
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
          Belum ada proyek. Tekan tombol + di pojok kanan bawah untuk memulai.
        </div>
      )}

      <NewProjectFab
        entries={entries}
        createBlank={createProject}
        createFromPreset={createProjectFromPreset}
        createFromTemplate={createProjectFromTemplate}
      />
    </PageShell>
  );
}
