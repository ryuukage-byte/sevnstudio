/** Indonesian UI labels for stage types and statuses. */
export const typeLabel: Record<string, string> = {
  checklist: "Ceklis",
  task: "Tugas",
  note: "Catatan",
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

export const statusClass: Record<string, string> = {
  LOCKED: "bg-muted text-muted-foreground",
  READY: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  TODO: "bg-secondary text-secondary-foreground",
  DOING: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  DONE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  STALE: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};
