import { createProjectFromPreset } from "@/app/(app)/projects/actions";
import { categoryInfo, type Preset, type PresetCategory } from "@/lib/presets/types";
import { PresetCard } from "./PresetCard";

const order: PresetCategory[] = ["otomatis", "semi", "harian"];

/** Gallery of built-in workflow presets, grouped by kind. Using one creates a new project with that workflow. */
export function PresetGallery({ presets }: { presets: readonly Preset[] }) {
  return (
    <div className="space-y-7">
      {order.map((cat) => {
        const list = presets.filter((p) => p.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
              <h3 className="sv-label !text-foreground/80">{categoryInfo[cat].title}</h3>
              <details className="text-sm">
                <summary className="sv-label cursor-pointer list-none transition-colors hover:text-foreground">Apa ini?</summary>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">{categoryInfo[cat].hint}</p>
              </details>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => (
                <PresetCard key={p.key} preset={p} createAction={createProjectFromPreset.bind(null, p.key)} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
