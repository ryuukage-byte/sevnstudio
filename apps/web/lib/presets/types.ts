// Built-in workflow presets. A preset is plain data (stages, links, items); it is compiled into the same snapshot
// shape that templates and runs use, so presets need no new engine or database concepts.

export type PresetCategory = "otomatis" | "semi" | "harian";

export interface PresetStage {
  /** Unique within the preset; used by `links`. */
  key: string;
  type: "task" | "checklist" | "note";
  name: string;
  /** Task: instruction text shown in the run. Note: the note body. */
  text?: string;
  /** Checklist: the items. */
  items?: string[];
  /** True for steps where the user must decide or do something themselves (semi-automatic presets). */
  decision?: boolean;
}

export interface Preset {
  key: string;
  category: PresetCategory;
  title: string;
  /** One sentence: what you get. */
  goal: string;
  /** Short list of the final results, shown on the card. */
  results: string[];
  stages: PresetStage[];
  /** [from, to, kind]: "blocking" = next step waits; "flow" = only a hint line. */
  links: [string, string, "blocking" | "flow"][];
}

/** Tag shown for each category. Presets and templates are one thing; tags only tell them apart. */
export const categoryTag: Record<PresetCategory, string> = {
  otomatis: "Otomatis",
  semi: "Semi-otomatis",
  harian: "Sehari-hari",
};
