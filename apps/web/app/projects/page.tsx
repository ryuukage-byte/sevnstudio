import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { createProject, deleteProject } from "./actions";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Proyek</h1>
        <form action={signOut}>
          <Button variant="outline" size="sm">Keluar</Button>
        </form>
      </header>
      <form action={createProject} className="mb-6 flex gap-2">
        <Input name="name" placeholder="Nama proyek, mis. Trip Jepang Nov 2026" required maxLength={120} />
        <Button type="submit">Buat</Button>
      </form>
      {projects?.length ? (
        <ul className="divide-y rounded-lg border">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3">
              <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
              <form action={deleteProject}>
                <input type="hidden" name="id" value={p.id} />
                <Button variant="ghost" size="sm">Hapus</Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada proyek. Buat yang pertama di atas.</p>
      )}
    </main>
  );
}
