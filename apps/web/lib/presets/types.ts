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

export const categoryInfo: Record<PresetCategory, { title: string; hint: string }> = {
  otomatis: {
    title: "Otomatis",
    hint: "Dari bahan awal sampai hasil jadi. Nantinya langkah-langkah AI bisa berjalan sendiri; sekarang Anda mengerjakannya dengan AI pilihan Anda.",
  },
  semi: {
    title: "Semi-otomatis",
    hint: "AI membantu, tetapi ada titik di mana Anda memutuskan atau mengerjakan sendiri.",
  },
  harian: {
    title: "Kehidupan sehari-hari",
    hint: "Membantu menentukan dan menjalankan aktivitas harian. Tidak butuh AI.",
  },
};
