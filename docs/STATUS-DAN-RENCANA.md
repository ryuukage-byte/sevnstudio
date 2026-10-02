# Sevn Studio: Status Saat Ini dan Rencana Implementasi

Diperbarui: 2 Oktober 2026. Dokumen ini merangkum keadaan proyek sekarang (desain, sistem, fitur, verifikasi) dan rencana kerja berikutnya.
Spesifikasi produk tetap di [PRD.md](PRD.md); aturan kerja di [../CLAUDE.md](../CLAUDE.md). Bila ada perbedaan, dokumen ini menjelaskan keadaan kode **sekarang**.

---

## 1. Ringkasan

Sevn Studio adalah *visual workflow sandbox*: susun pekerjaan sebagai peta langkah, kerjakan dengan campuran manusia + AI + otomatisasi opsional, simpan sebagai template, pakai ulang sebagai pengerjaan.

| Fase (CLAUDE.md) | Status |
|---|---|
| 1. Fondasi (Next.js, Supabase, auth, proyek, canvas, Ceklis/Tugas/Catatan) | **Selesai** |
| 2. Engine (state machine, LOCKED/READY, STALE, template, run) | **Selesai** (engine murni + tes, tersambung ke UI) |
| 3. Mode ceklis + offline | **Kode selesai; gate belum lolos** (butuh uji di Supabase asli dan offline sungguhan) |
| 4. AI dan API (worker, jobs, review, artifact, STALE) | Belum dimulai |
| 5. Creative layer (library asset dan prompt) | Belum dimulai |

Angka: 23 commit lokal, 137 tes otomatis lulus (engine 35, handlers 4, web 98), `tsc`, `eslint`, dan `next build` bersih.

---

## 2. Keputusan produk terbaru (menyimpang dari PRD awal)

Semua sudah dicatat di PRD.md/CLAUDE.md kecuali yang bertanda *belum*.

1. **Kelompok diturunkan dari garis.** Langkah yang tersambung garis (Harus urut maupun Bebas urutan) otomatis satu kelompok; tanpa garis masuk "Lainnya". Tidak ada tipe langkah Group baru, tidak ada picker kelompok. (PRD, CLAUDE.md aturan 12.)
2. **Preset = Template.** Satu daftar; pembeda hanya tag (*Bawaan* + kategori, *Milik saya*). (PRD, kamus.)
3. **Halaman proyek minimal:** judul, deskripsi proyek, dua tombol: **Alur kerja** (masuk ke pipeline) dan **Lihat live action** (placeholder "Segera hadir").
4. **Membuat proyek lewat tombol + pojok kanan bawah:** **Manual**, **Preset**, **AI** (terkunci sampai API terhubung di Pengaturan).
5. **Pengerjaan (run) tidak lagi di halaman proyek;** diakses dari header editor alur kerja (menu "Pengerjaan (n)").
6. **Bahasa awam** di seluruh UI (kamus di [KAMUS-ISTILAH.md](KAMUS-ISTILAH.md)).
7. **Scrollbar disembunyikan;** pengguna mouse menggulir dengan menahan dan menggeser.
8. **Deskripsi proyek** (kolom baru `projects.description`, migration 0011), terisi dari tujuan preset dan bisa diubah di tempat.
9. *Belum di PRD:* halaman **Pengaturan** (Profil, Akun, "Hubungkan AI") dan menu akun.

---

## 3. Arsitektur sistem

### 3.1 Stack
Next.js 16 (App Router, Turbopack; `proxy.ts` menggantikan `middleware`), React 19, TypeScript strict, Tailwind v4 + shadcn/ui (basis `@base-ui/react`), React Flow (`@xyflow/react` 12), Supabase (`@supabase/ssr`, Postgres + Auth + RLS), Zod 3, Vitest 2, pnpm workspaces. Font lewat `next/font/google` (Inter, Space Grotesk, JetBrains Mono).

### 3.2 Struktur monorepo
```
apps/web/            Next.js: halaman, canvas, mode ceklis, PWA
packages/engine/     logika murni: status, state machine, graph, STALE, snapshot (teruji)
packages/handlers/   kontrak handler + tipe langkah (checklist, task, note; group = lama)
worker/              (kosong; Fase 4)
supabase/            migrations 0001-0011, seed.sql, tests/rls.sql, all-migrations.sql (hasil gabungan)
docs/                PRD, kamus istilah, desain, dokumen ini
```

### 3.3 Engine (`packages/engine`, fungsi murni)
| Modul | Isi |
|---|---|
| `types` | `StatusModel` (`none`, `checklist`, `task`, `machine`, `gate`), `Mode`, `EdgeKind`, status tersimpan, `StageEvent` |
| `status` | `deriveStatus/deriveAll` (LOCKED dan READY **diturunkan**, tidak disimpan), `lockReasons`, `checklistStatus`, `autoRunnable` (mode Auto tidak pernah menjalankan ulang hasil APPROVED/STALE) |
| `transition` | state machine per model: `START/FINISH/FAIL/RETRY/APPROVE/REJECT/MARK_STALE/DISMISS_STALE/SET_*` |
| `stale` | `staleTargets`: hilir APPROVED bertipe machine/gate ditandai STALE |
| `graph` | `hasCycle`, `topoOrder`, `descendants`, `validateConnection`, `connectedGroups` (kelompok turunan) |
| `snapshot` | `snapshotSchema` (Zod), `buildSnapshot`, `snapshotToGraph`, `cloneSnapshot` |

Aturan penting: orkestrator tidak tahu tipe langkah; tiap handler mendeklarasikan `statusModel`. Definisi tidak punya status; status hidup di run.

### 3.3b Handler (`packages/handlers`)
Kontrak: `type`, `configSchema` (Zod), `inputPorts`, `outputPorts`, `defaultMode`, `statusModel`, `run?` (kosong untuk tipe manual). Terdaftar: `checklist`, `task`, `note`, `group` (hanya untuk data lama). UI workspace tiap tipe ada di `apps/web` (supaya paket ini bebas UI).

### 3.4 Database (Supabase Postgres, RLS di semua tabel)
| Kelompok | Tabel |
|---|---|
| Definisi | `projects` (+`description`), `workflows`, `stages`, `stage_connections`, `items`, `templates` |
| Eksekusi | `runs` (menyimpan snapshot), `stage_runs`, `run_items` |
| Fungsi | `owns_project/workflow/stage/run` (SECURITY DEFINER), `set_updated_at`, trigger `stages_check_parent_group`, RPC `create_run` (atomik: run + run_items dari snapshot) |

Kepemilikan: `projects.owner_id = auth.uid()`; tabel anak memeriksa lewat fungsi `owns_*`. `run_items` memakai `updated_at` dari klien (last-write-wins per item).
Kolom `stages.parent_group_id` sekarang **tidak dipakai** (sisa desain lama).

Belum ada: `artifacts`, `approvals`, `jobs`, `project_context`, `assets`, `prompts`, `styles`.

### 3.5 Aplikasi web
| Rute | Fungsi |
|---|---|
| `/login` | masuk/daftar (pesan galat Indonesia, tanpa balon validasi browser) |
| `/projects` | daftar proyek + tombol + (Manual / Preset / AI) |
| `/projects/[id]` | judul, deskripsi (bisa diubah), tombol Alur kerja dan Lihat live action |
| `/projects/[id]/workflows/[wf]` | editor peta: tambah langkah (panel atau klik dua kali), geser, sambung, ubah, hapus, undo/redo, simpan template, mulai kerjakan, menu Pengerjaan |
| `/projects/[id]/runs/[run]` | mengerjakan: tab **Daftar** (mode ceklis, utama di HP) dan **Peta**; progres; centang; langkah menunggu menampilkan alasannya |
| `/settings` | Profil (nama), Akun (email, ganti kata sandi), Pengaturan ("Hubungkan AI", segera hadir) |
| `/api/dev-db` | hanya mode preview (404 di produksi) |

`proxy.ts` menjaga sesi dan mengarahkan pengguna yang belum masuk ke `/login`. Server Action untuk perintah singkat; Next.js tidak menjalankan langkah.

### 3.6 Alur data penting
- **Editor:** setiap perubahan = daftar *Op* (insert/update/delete). Op yang sama dipakai untuk state lokal, tulis ke DB (antrean berurutan), dan undo/redo (inversi). Posisi disimpan saat lepas drag, bukan tiap gerak.
- **Template/Run:** `buildSnapshot` membekukan definisi; `create_run` menyalin ke run dan `run_items`. Mengedit template/alur tidak mengubah run lama.
- **Proyek dari preset/template:** `compilePreset` / `cloneSnapshot` → `snapshotToRows` → insert `stages`, `stage_connections`, `items`; bila gagal, proyek dihapus lagi.
- **Offline (`lib/sync`):** centang berubah seketika; antrean per run di `localStorage` (`sevn:queue:<runId>`), hanya perubahan terbaru per item yang disimpan; dikirim saat online/tiap 10 dtk; server menolak tulisan yang lebih lama dari datanya. Tata letak peta per perangkat di `sevn:layout:<runId>`.
- **PWA:** manifest, ikon PNG, service worker (halaman: network-first dengan cadangan cache; aset statis: cache-first), hanya aktif di build produksi.

### 3.7 Mode preview (hanya pengembangan)
`NEXT_PUBLIC_DEV_PREVIEW=1` (tidak aktif di produksi) memakai penyimpanan di memori (`lib/dev/*`) tanpa Supabase dan tanpa login, berisi contoh Travel Checklist. Dipakai untuk menguji UI. **Data reset tiap server restart.** `.env.local` sekarang menunjuk Supabase asli; cadangan pengaturan preview ada di `.env.local.preview-backup` (tidak ikut git).

### 3.8 Lingkungan
- Proyek Supabase: milik akun kedua pengguna (ref `ncbqqswwwgyxgocnwlgf`); migration 0001–0010 sudah dijalankan, **0011 belum**.
- `.env.local` / `.env.supabase` berisi URL dan kunci *publishable* saja; keduanya di-ignore git.
- Port 3000 sering dipakai proses lain; `.claude/launch.json` memakai `autoPort`.

---

## 4. Desain (SevnSoul)

Sumber: `sevnsoul_unified_home_v10`. Rincian di [DESIGN-SEVNSOUL.md](DESIGN-SEVNSOUL.md).

- **Tema:** gelap monokrom. Latar `#080808` dengan cahaya radial tipis dan tekstur garis halus; kartu gradien `#141414 → #0e0e0e`, border putih 7,5%, radius 20px (input 12px).
- **Teks:** `#f4f4f2`; redup 58%; samar 34%. Tombol utama putih gading.
- **Huruf:** Space Grotesk (judul, rapat), Inter (isi), JetBrains Mono kapital kecil berjarak (label).
- **Komponen CSS:** `.sv-card`, `.sv-badge[data-tone]` (netral, active, done, warn, bad), `.sv-label`, `.sv-eyebrow`, `.sv-empty`.
- **Status:** pil kecil bertitik (selesai = titik putih terisi). Warna aksen hanya untuk status (kuning lembut = usang, merah lembut = gagal).
- **Navigasi:** navbar tetap (logo + "SEVN STUDIO" + tautan Proyek + menu akun), jejak halaman, hero per halaman.
- **Interaksi khas:** klik langkah → toolbar **Ubah | Hapus**; klik garis → menu Harus urut / Bebas urutan / Hapus hubungan; klik dua kali area kosong → menu tambah langkah; tombol + dengan animasi pegas; dialog bawaan `<dialog>` (tanpa `window.prompt`); konfirmasi hapus dua langkah.
- **Peta:** titik sambung di empat sisi tiap langkah, garis memilih sisi yang cocok (`lib/canvas/handles.ts`); preset ditata zig-zag.
- **Bahasa UI:** Indonesia sehari-hari ([KAMUS-ISTILAH.md](KAMUS-ISTILAH.md)); prinsip "tampil sedikit dulu, detail saat diminta".

### Preset bawaan (7)
| Kategori | Preset | Langkah |
|---|---|---|
| Otomatis | Content Factory | 10 |
| Otomatis | Knowledge to Action | 9 |
| Otomatis | Weekly Progress Report | 9 |
| Semi-otomatis | Project Launchpad | 9 (2 keputusan pengguna) |
| Semi-otomatis | Learn & Practice | 11 (3 giliran pengguna) |
| Sehari-hari | Today's Navigator | 9 |
| Sehari-hari | Evening Reset | 9 |

Catatan penting: langkah "AI" di preset saat ini berupa **Tugas** berisi instruksi (dikerjakan manual dengan AI pilihan pengguna). Ini menunggu jenis langkah AI di Fase 4.

---

## 5. Status verifikasi

### Terbukti
- 137 tes otomatis: engine (status, transisi, STALE, graph, kelompok, snapshot), handlers, reducer editor + undo/redo, turunan status run, antrean sinkron, preset (valid, tanpa siklus, tanpa kotak tumpang tindih, satu kelompok per preset), entri pemilih, helper kolom hilang.
- Build produksi, `tsc`, `eslint` bersih.
- Di Supabase asli: sembilan tabel ada; pengguna tanpa login mendapat daftar kosong dan penulisan ditolak RLS (42501), `create_run` ditolak. Pengguna berhasil mendaftar, masuk, dan membuat beberapa proyek.
- Di browser (data tiruan): seluruh alur UI di bagian 3.5, mode HP, antrean offline (jaringan diputus dengan menimpa `fetch`, lalu terkirim), tidak ada kedipan saat geser, dialog, FAB, pemilih preset, menu akun, geser-tahan.

### Belum terbukti
| Hal | Catatan |
|---|---|
| Uji RLS dua pengguna (`supabase/tests/rls.sql`, akun B tidak melihat data akun A) | belum dijalankan |
| Dua pengerjaan dari satu template tidak saling memengaruhi **di Supabase asli** | terbukti hanya di data tiruan |
| Offline sungguhan (mode pesawat, service worker produksi, buka ulang tanpa jaringan) | belum |
| Proyek dari preset/template, simpan nama dan kata sandi di Supabase asli | jalurnya diuji di data tiruan; di Supabase asli belum diperiksa isi tabelnya |
| Tampilan HP untuk UI terbaru (FAB, pemilih preset, menu akun, Pengaturan) dan tab Peta di HP | belum dilihat |
| Migration 0011 | belum dijalankan; sampai itu, deskripsi tidak tersimpan (aplikasi tetap jalan) |
| Ikon di iOS (PNG sudah ada) | belum diuji di perangkat |

---

## 6. Keterbatasan dan utang teknis

1. **Tidak ada input teks saat mengerjakan.** Catatan dan notes pada pengerjaan hanya bisa dibaca; bagian "Isi bahan awal" di preset berupa petunjuk. Perlu jenis langkah **Isian**.
2. **Langkah AI/API/Review belum ada;** tombol AI di + terkunci; "Hubungkan AI" hanya penanda.
3. **Tidak bisa menambah alur kerja kedua** atau memulai pengerjaan langsung dari template lewat UI (tombolnya dihapus saat penyederhanaan). Data lama dengan >1 alur tetap bisa dipilih lewat menu.
4. **Jenis langkah `group` lama** dan kolom `parent_group_id` masih ada di data/skema; perlu migrasi pembersihan bila dianggap tidak dipakai lagi.
5. **`all-migrations.sql` dihasilkan manual** (gabungan); perlu skrip atau CI agar tidak melenceng.
6. **Belum ada CI, uji end-to-end, atau uji RLS otomatis.**
7. **Gambar tidak dioptimalkan** (`sharp` tidak terpasang; logo memakai `unoptimized`).
8. **Font bergantung internet saat build/dev** (Google Fonts).
9. **Teks tidak bisa dipilih dengan menyeret** (menyeret menggulir); pilih teks lewat klik dua atau tiga kali.
10. **Ujung baris:** peringatan LF/CRLF dari git di Windows; perlu `.gitattributes`.
11. **Kunci rahasia pernah terkirim di chat** (secret key dan service_role). Harus dirotasi di dashboard Supabase; aplikasi hanya memakai kunci publishable.
12. **Satu pengguna per proyek;** kolaborasi di luar cakupan sampai V4.

---

## 7. Rencana implementasi

### P0. Segera (membuka gate Fase 3)
- [ ] Jalankan `supabase/migrations/0011_projects_description.sql` di SQL Editor Supabase.
- [ ] Rotasi kunci yang bocor (secret key dan service_role).
- [ ] Daftar **akun B** (manual oleh pemilik), jalankan `supabase/tests/rls.sql` dan cek B tidak melihat proyek A.
- [ ] Uji di Supabase asli: dua pengerjaan dari satu template, centang tidak saling memengaruhi.
- [ ] Uji offline sungguhan pada build produksi (mode pesawat → centang → online → sinkron tanpa kehilangan).
- [ ] Periksa UI terbaru di lebar HP (FAB, pemilih preset, menu akun, Pengaturan, tab Peta).

**Kriteria gate Fase 3 (PRD "Kriteria penerimaan" untuk Workflow A):**
| Kriteria | Status |
|---|---|
| Buat Travel Checklist, simpan template, dua run terpisah, centang tidak saling memengaruhi | terbukti di data tiruan; **uji di Supabase asli** |
| Centang di HP mode pesawat, sinkron setelah online tanpa kehilangan | logika terbukti; **uji sungguhan** |
| Langkah dengan garis "Harus urut" tidak bisa dikerjakan sebelum hulu selesai; alasan terlihat | terbukti |
| Workflow A berfungsi penuh tanpa worker | terbukti (tidak ada worker) |

### P1. Sebelum Fase 4
- [ ] Jenis langkah **Isian** (formulir teks yang bisa diisi saat mengerjakan; keluaran bertipe `text` ke langkah berikutnya). Memenuhi aturan lingkup (satu handler).
- [ ] Skrip pembuat `all-migrations.sql` dan `.gitattributes`.
- [ ] Uji RLS otomatis (dua pengguna) di CI.
- [ ] Pembersihan data lama bertipe `group` / `parent_group_id` (migrasi + hapus dari kode).
- [ ] Pengaturan: kerangka penyimpanan API (belum menerima kunci; menunggu Vault).

### Fase 4: AI dan API (inti sistem otomasi)
Urutan kerja; setiap langkah memiliki tes sebelum disambung ke UI.
1. **Skema:** `jobs` (antrean: `stage_run_id`, `attempt`, `status`, `run_at`, `locked_by/at`), `artifacts` (immutable, berversi), `approvals`, `project_context`. RLS di file yang sama dengan tabelnya. Sebelum menulis migration: rencana singkat dan konfirmasi (aturan CLAUDE.md).
2. **Engine:** orkestrator murni yang menentukan aksi berikutnya (mulai, tunggu persetujuan, lanjutkan otomatis, tandai STALE) dari graph + status; sudah ada bahan dasarnya (`autoRunnable`, `transition`, `staleTargets`).
3. **Worker (`worker/`):** klaim job dengan `FOR UPDATE SKIP LOCKED`, jalankan handler, simpan artifact versi baru, catat `input_refs`; kunci idempotensi `stage_run_id + attempt`.
4. **Handler:** `ai` (prompt + context, keluaran teks/JSON divalidasi Zod; catat model, prompt final, token), `api` (HTTP generik, blokir IP privat/localhost untuk SSRF, pemetaan input/output), `review` (Edit / Regenerate / Reject / Approve).
5. **Rahasia:** kunci API di Supabase Vault, dirujuk lewat nama dan di-resolve worker; tidak pernah di config langkah atau browser. Antarmuka lewat halaman Pengaturan.
6. **UI:** workspace per tipe, panel "What does this AI know?" (prompt dan context yang akan dikirim), perbandingan dan rollback versi, status berjalan via Realtime tanpa polling, tampilan "menunggu koneksi" saat offline, tombol Retry, penanda STALE.
7. **Preset:** ganti langkah Tugas-instruksi pada preset Otomatis/Semi-otomatis dengan langkah AI sungguhan; keputusan pengguna menjadi langkah Review.
8. **Tombol AI di +:** aktif bila API terhubung; AI menyusun alur dari satu kalimat → hasil divalidasi `snapshotSchema` → dibuat sebagai proyek (tidak pernah langsung menimpa data).

**Gerbang Fase 5 (Workflow B: Idea → AI Script → Review → API TTS → Output):**
- [ ] AI menghasilkan skrip, pengguna review dan setujui, API menghasilkan file suara tersimpan sebagai artifact.
- [ ] Regenerate skrip setelah TTS selesai menandai TTS **STALE** (tidak menimpa).
- [ ] Kegagalan API (timeout) tampil di riwayat dengan Retry dan tidak menggandakan panggilan berbayar.
- [ ] Biaya: model, prompt final, dan token tercatat per stage run.

### Fase 5: Creative layer ringan
- Library **asset** (unggah/pakai ulang) dan **prompt** (variabel `{{topic}}`).
- Kebijakan retensi artifact (hapus versi lama yang tidak pernah disetujui).

### Setelah MVP (urutan usulan)
1. **Lihat live action:** visualisasi jalannya pekerjaan (konsep awal; perlu desain).
2. Pengaturan lanjutan (tampilan, ekspor/impor template JSON).
3. V2: Python/File stage (di container terpisah), kondisional/loop.
4. V3: handler produksi video (TTS, SRT, Video, AI Director, Remotion).
5. V4: kolaborasi multi-user.

---

## 8. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Lingkup melebar karena kata "sandbox" | Uji tiap fitur: node, edge, item, atau handler? |
| Sinkron offline lebih rumit dari perkiraan | last-write-wins per item; cache hanya run aktif (sudah berlaku) |
| Engine terlalu generik terlalu dini | hanya bangun handler yang dibutuhkan dua workflow bukti |
| Biaya AI/API tak terduga | catat token/biaya per stage run sejak awal; batasi regenerate otomatis |
| Kunci bocor | hanya kunci publishable di aplikasi; rahasia lewat Vault; rotasi segera setelah bocor |
| UI bergantung data tiruan saat diuji | prioritaskan uji di Supabase asli (P0) |

---

## 9. Cara menjalankan

```bash
pnpm install
pnpm test              # engine, handlers, logika web
pnpm typecheck
pnpm --filter @sevn/web dev        # butuh apps/web/.env.local (URL + kunci publishable)
```

Mode tanpa database/login (hanya pengembangan): `NEXT_PUBLIC_DEV_PREVIEW=1 pnpm --filter @sevn/web dev`.
Skema database: jalankan `supabase/migrations/0001`–`0011` berurutan, atau tempel `supabase/all-migrations.sql` ke SQL Editor pada proyek kosong.
