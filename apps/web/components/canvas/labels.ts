/** Indonesian UI labels for stage types and statuses (see docs/KAMUS-ISTILAH.md). */
export const typeLabel: Record<string, string> = {
  checklist: "Ceklis",
  task: "Tugas",
  note: "Catatan",
  input: "Isian",
  group: "Kelompok",
  review: "Review",
  ai: "AI",
  api: "API",
};

export const statusLabel: Record<string, string> = {
  LOCKED: "Menunggu",
  READY: "Siap dikerjakan",
  TODO: "Belum",
  DOING: "Dikerjakan",
  DONE: "Selesai",
  RUNNING: "Berjalan",
  REVIEW: "Menunggu review",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  FAILED: "Gagal",
  STALE: "Usang",
};

/** Visual tone of a status badge (`.sv-badge[data-tone]` in globals.css). Empty = neutral. */
export const statusTone: Record<string, "" | "active" | "done" | "warn" | "bad"> = {
  LOCKED: "",
  TODO: "",
  READY: "active",
  DOING: "active",
  RUNNING: "active",
  REVIEW: "active",
  DONE: "done",
  APPROVED: "done",
  STALE: "warn",
  REJECTED: "bad",
  FAILED: "bad",
};
