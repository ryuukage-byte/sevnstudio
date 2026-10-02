# Sevn Studio

Visual workflow sandbox: susun pekerjaan sebagai graph (canvas), jalankan dengan campuran manusia + AI + otomatisasi opsional, simpan sebagai template, pakai ulang sebagai run.
Contoh pekerjaan: ceklis traveling/belanja (100% manual) sampai Idea → AI Script → Review → API TTS.

Spesifikasi lengkap: `docs/PRD.md` (PRD v2). Baca bagian "Konsep Inti", "Status & State Machine", dan "MVP" sebelum mengubah engine.

## Scope rule (wajib)

Sebuah fitur hanya boleh masuk jika bisa dinyatakan sebagai **node, edge, item, atau handler**. Jika tidak, jangan dibangun; tanyakan dulu.
Bukan tujuan: pengganti n8n, Notion/Trello/Miro, editor video, platform agen otonom, kalender, kolaborasi multi-user (sampai V4).

## Stack

- Next.js (App Router), React, TypeScript strict, Tailwind CSS, shadcn/ui
- React Flow untuk canvas
- Supabase: Postgres, Auth, Storage, Realtime, Vault. RLS aktif di SEMUA tabel sejak migration pertama
- Worker Node.js terpisah (folder `worker/`) untuk stage AI/API. Antrean = tabel `jobs` di Postgres (`FOR UPDATE SKIP LOCKED`). Jangan tambah Redis/BullMQ di MVP
- Validasi: Zod. Test: Vitest

## Aturan arsitektur

1. **Satu Stage Engine.** Setiap tipe stage = handler dengan kontrak sama (`type`, `configSchema`, `inputPorts`, `outputPorts`, `run`, `defaultMode`, `Workspace`). Orkestrator tidak boleh tahu logika tipe tertentu. Tipe baru = handler baru, bukan percabangan di engine.
2. **Definisi ≠ eksekusi.** `workflows/stages/stage_connections/items/templates` tidak punya status. Status hidup di `runs/stage_runs/run_items`. Run membuat snapshot definisi.
3. **LOCKED dan READY diturunkan dari graph**, tidak disimpan. Status tersimpan: RUNNING, REVIEW, APPROVED, REJECTED, FAILED, STALE (dan TODO/DOING/DONE untuk stage manual).
4. **Edge punya jenis:** `blocking` (mengunci hilir) atau `flow` (informasi saja). Port bertipe (text, json, file).
5. **Artifact immutable dan berversi.** Regenerate = versi baru. `stage_runs.input_refs` menunjuk versi persis input. Perubahan hulu menandai hilir STALE; mode Auto tidak boleh menimpa hasil tanpa sepengetahuan user.
6. **Item ceklis di tabel sendiri** (`items`, `run_items`), bukan array JSON. Sinkron per item, last-write-wins.
7. **Workflow yang hanya berisi stage manual harus jalan penuh tanpa worker, tanpa AI, dan offline** (PWA, update optimistis).
8. **Next.js tidak menjalankan stage.** Hanya UI + perintah singkat (mulai, approve, reject). Eksekusi lewat worker.
9. **Secret** (API key) tidak pernah di config stage atau browser; simpan di Supabase Vault, rujuk lewat nama, di-resolve worker.
10. **API Stage:** blokir IP privat/localhost (SSRF). Setiap panggilan eksternal membawa kunci idempotensi `stage_run_id + attempt`.
11. **AI Stage:** output JSON divalidasi schema; catat model, prompt final, dan token usage per stage run.

## Konvensi

- Bahasa UI: Indonesia. Kode, nama tabel, dan komentar teknis: Inggris.
- Migration SQL di `supabase/migrations/`, satu perubahan per file, RLS policy di file yang sama dengan tabelnya.
- Logika engine (state machine, penurunan LOCKED/READY, invalidasi STALE) ditulis sebagai fungsi murni di `packages/engine/` dan WAJIB punya unit test sebelum disambung ke UI.
- Jangan tambah dependency besar tanpa alasan; sebut alasannya di PR/commit message.
- Commit kecil, satu tujuan per commit.

## Struktur yang diharapkan

```
apps/web/          Next.js (canvas, workspace, mode ceklis)
worker/            Node.js worker (claim job, jalankan handler)
packages/engine/   state machine, graph, handler contract (murni, teruji)
packages/handlers/ checklist, task, note, group, review, ai, api
supabase/          migrations, seed, policies
docs/PRD.md        spesifikasi produk
```

## Fase MVP (kerjakan berurutan; berhenti di tiap gate)

1. **Fondasi:** Next.js + Supabase + auth + project + canvas dasar + stage Checklist/Task/Note.
2. **Engine:** orkestrator + state machine dengan unit test (tanpa UI), lalu sambung ke canvas; template dan run.
3. **Mode ceklis + offline:** tampilan mobile, PWA, sinkron per item. **Gate:** Workflow A (Travel Checklist) lolos semua kriteria penerimaan.
4. **AI dan API:** worker, antrean jobs, stage AI/API, context, review, artifact berversi, STALE.
5. **Creative layer ringan:** library asset dan prompt. **Gate:** Workflow B (Idea → AI Script → Review → API TTS → Output) lolos semua kriteria penerimaan.

Kriteria penerimaan lengkap ada di bagian "MVP" pada `docs/PRD.md`.

## Cara bekerja

- Mulai tiap sesi dengan membaca fase aktif di atas dan `git log` terbaru.
- Untuk perubahan engine atau skema data: jelaskan rencana singkat dulu, tunggu konfirmasi, baru implementasi.
- Jika sebuah permintaan melanggar scope rule atau aturan arsitektur, sampaikan konfliknya dan usulkan alternatif, jangan diam-diam mengikuti.
