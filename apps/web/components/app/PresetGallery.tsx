import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyPresetToWorkflow, startRunFromPreset } from "@/app/(app)/projects/actions";
import { categoryInfo, type Preset, type PresetCategory } from "@/lib/presets/types";

const order: PresetCategory[] = ["otomatis", "semi", "harian"];

/** Gallery of built-in workflow presets, grouped by kind. Each card can start a run or be copied as an editable workflow. */
export function PresetGallery({ projectId, presets }: { projectId: string; presets: readonly Preset[] }) {
  return (
    <div className="space-y-8">
      {order.map((cat) => {
        const list = presets.filter((p) => p.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <div className="mb-3">
              <h3 className="sv-label !text-foreground/80">{categoryInfo[cat].title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{categoryInfo[cat].hint}</p>
            </div>
            <ul className="grid gap-4 lg:grid-cols-2">
              {list.map((p) => (
                <li key={p.key} className="sv-card flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-[family-name:var(--font-heading)] text-xl font-medium tracking-[-0.03em]">{p.title}</h4>
                    <span className="sv-badge shrink-0" data-tone={cat === "harian" ? "" : "active"}>
                      {p.stages.filter((s) => s.type !== "note").length} langkah
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{p.goal}</p>

                  <ul className="flex flex-wrap gap-1.5" aria-label="Hasil yang didapat">
                    {p.results.map((r) => (
                      <li key={r} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{r}</li>
                    ))}
                  </ul>

                  <details className="group text-sm">
                    <summary className="sv-label cursor-pointer list-none transition-colors hover:text-foreground">
                      Lihat langkah-langkahnya <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
                    </summary>
                    <ol className="mt-3 space-y-1.5 border-l border-border pl-4">
                      {p.stages
                        .filter((s) => s.type !== "note")
                        .map((s) => (
                          <li key={s.key} className={s.decision ? "text-foreground" : "text-muted-foreground"}>
                            {s.name}
                          </li>
                        ))}
                    </ol>
                  </details>

                  <div className="mt-auto space-y-2 border-t border-border pt-4">
                    <form action={startRunFromPreset.bind(null, projectId, p.key)} className="flex gap-2">
                      <Input name="name" placeholder="Nama pengerjaan, mis. #1" required maxLength={120} aria-label={`Nama pengerjaan ${p.title}`} />
                      <Button type="submit" className="h-10 shrink-0">Mulai kerjakan</Button>
                    </form>
                    <form action={copyPresetToWorkflow.bind(null, projectId, p.key)}>
                      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                        Salin jadi alur kerja saya (bisa diubah)
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
