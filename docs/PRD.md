# PRD Sevn Studio v2 — Visual Workflow Sandbox

Oct 2, 2026 · @Sevn

## Visi & Positioning

Sevn Studio adalah visual workflow sandbox: tempat menyusun pekerjaan apa pun sebagai graph, menjalankannya dengan campuran tindakan manusia, AI, dan otomatisasi, lalu memakainya ulang sebagai template.

Pekerjaannya bisa sepenuhnya manual (ceklis belanja, ceklis traveling), campuran (draft script oleh AI lalu direview manusia), atau hampir otomatis (TTS lewat API). Otomatisasi bersifat opsional: ceklis tanpa satu pun AI node tetap produk yang utuh.

Prinsip utama: **Automate what is deterministic. Assist what is creative. Keep humans in control.**

**Perubahan dari PRD v1**

- Dari "AI production workspace" menjadi sandbox untuk pekerjaan manusia + AI.
- Stage manual (Checklist, Task, Note) menjadi tipe kelas satu, bukan pelengkap.
- Definisi workflow dipisah dari eksekusinya (template vs run).
- Dependency antar stage opsional (blocking vs flow).
- Mobile dan offline masuk kebutuhan, karena ceklis dipakai di toko, bandara, dan tempat bersinyal buruk.

**Pembeda dari tool lain.** Bukan n8n (tidak mengejar trigger → action murni) dan bukan Notion/Trello (ceklis di sini adalah graph yang bisa dijalankan, template yang dipakai ulang, dengan otomatisasi yang bisa ditambahkan kapan saja).

## Masalah & Prinsip Desain

Tool automation memperlakukan semua pekerjaan sebagai Trigger → Action → Result, padahal sebagian besar pekerjaan nyata campuran: ada langkah yang bisa dipastikan hasilnya (panggil TTS API), ada yang butuh penilaian manusia (apakah script ini enak?), dan ada yang murni dikerjakan tangan (beli sabun, cek paspor). Tool ceklis di sisi lain tidak bisa menjalankan atau mengotomatisasi apa pun.

Sevn Studio mengisi celah di antara keduanya: satu model kerja untuk ceklis manual sampai pipeline produksi video.

**Prinsip desain**

1. **Human first.** AI membantu, tidak mengambil alih. Stage kreatif berhenti di review sebelum lanjut.
2. **Visible state.** User selalu tahu apa yang sedang jalan, apa yang menunggu, dan kenapa menunggu.
3. **Reusable.** Workflow, stage, prompt, asset, dan style bisa dipakai ulang.
4. **Deterministic where possible.** Kode, API, dan Remotion untuk pekerjaan yang hasilnya bisa dipastikan.
5. **AI where useful.** Reasoning, transformasi, generasi, klasifikasi, saran kreatif; output terstruktur (JSON tervalidasi) sebisa mungkin.
6. **Otomatisasi opsional.** Workflow tanpa worker, tanpa AI, dan tanpa jaringan harus tetap berfungsi penuh.

## Konsep Inti

Seluruh produk dibangun dari tujuh primitif; fitur baru hanya diterima jika bisa dinyatakan lewat salah satunya.

| Primitif | Arti | Contoh |
| --- | --- | --- |
| Project | Wadah satu pekerjaan, berisi workflow, context, dan library | "Trip Jepang Nov 2026" |
| Workflow | Graph stage + koneksi; bisa menjadi template | "Travel Checklist" |
| Stage | Unit kerja di canvas; punya tipe, config, dan mode otomatisasi | "Packing", "AI Script" |
| Item | Isi di dalam stage bertipe Checklist; punya state sendiri | "Paspor", qty 1, centang |
| Edge | Koneksi antar stage: blocking (mengunci) atau flow (informasi) | Script → TTS |
| Template | Workflow tersimpan yang bisa diduplikasi | "Japanese Learning Short" |
| Run | Satu eksekusi workflow dari template; state-nya terpisah | "Trip #2" |

**Kelompok bukan primitif tersimpan.** Stage yang terhubung edge (blocking maupun flow) otomatis menjadi satu kelompok; stage tanpa edge berdiri sendiri. Kelompok dihitung dari graph, tidak punya tabel, nama, atau status, dan tidak diatur manual. (Perubahan dari draf awal, yang punya tipe stage Group.)

**Aturan emas: definisi dan eksekusi dipisah.** Template/workflow tidak menyimpan status. Status (TODO, RUNNING, DONE) hidup di Run. Dengan begitu ceklis traveling bisa dipakai berkali-kali tanpa saling menimpa.

**Aliran kerja**

Project → Workflow → Stage → Input → Workspace → Output → Stage berikutnya. Untuk stage manual, "Workspace" cukup berupa ceklis; untuk stage AI/API berupa editor dan panel hasil.

## Tipe Stage & Mode Otomatisasi

Semua tipe stage memakai satu Stage Engine dan satu kontrak handler; tipe baru berarti handler baru, bukan engine baru. Tiap tipe mendeklarasikan config, port input/output bertipe (text, json, file), mode default, dan UI workspace-nya.

| Tipe | Fungsi | Mode default | Butuh worker | Fase |
| --- | --- | --- | --- | --- |
| Checklist | Daftar item yang dicentang | Manual | Tidak | MVP |
| Task | Satu pekerjaan dengan catatan dan tenggat | Manual | Tidak | MVP |
| Note | Teks/referensi yang diteruskan ke stage lain | Manual | Tidak | MVP |
| Review | Gerbang approve / reject / regenerate | Manual | Tidak | MVP |
| AI | Prompt + context menghasilkan teks atau JSON | Semi-auto | Ya | MVP |
| API | HTTP request generik dengan mapping input/output | Auto | Ya | MVP |
| Python / File | Skrip eksternal, impor/ekspor file | Semi-auto | Ya | V2 |
| TTS, SRT, Video | Handler khusus produksi video | Semi-auto / Auto | Ya | V3 |
| AI Director, Remotion | Edit plan dan render deterministik | Semi-auto / Auto | Ya | V3 |

**Tiga mode otomatisasi** (berlaku untuk tipe yang bisa dijalankan mesin):

- **Manual**: manusia mengerjakan seluruh stage.
- **Semi-auto**: AI/API/skrip menghasilkan output, manusia wajib approve.
- **Auto**: berjalan sendiri setelah dependency terpenuhi, lalu lanjut ke stage berikutnya.

**Aturan penting:** workflow yang hanya berisi stage manual harus berjalan penuh di klien dan database, tanpa worker dan tanpa koneksi ke layanan AI.

## Status & State Machine

Setiap stage run berada di satu status; LOCKED dan READY dihitung dari graph, sedangkan status lain disimpan di Run.

&#91;embedded content: state machine stage · 8 status\]

Penolakan di REVIEW mengembalikan stage ke RUNNING, kegagalan bisa di-retry, dan perubahan di hulu menandai stage yang sudah APPROVED menjadi STALE.

**Dua jenis edge**

- **Blocking:** stage hilir LOCKED sampai hulu APPROVED (atau DONE untuk stage manual). Dipakai bila urutan wajib, seperti Script → TTS.
- **Flow:** hanya menunjukkan hubungan atau urutan yang disarankan, tidak mengunci. Dipakai untuk ceklis yang bebas urut, seperti Packing dan Booking.

**Status yang dipakai per tipe stage**

| Tipe | Status |
| --- | --- |
| Item Checklist | TODO → DONE |
| Task | TODO → DOING → DONE |
| AI, API | READY → RUNNING → REVIEW → APPROVED, plus FAILED dan STALE |
| Review | READY → REVIEW → APPROVED atau REJECTED |

Mode Auto melewati REVIEW dan lanjut ke stage berikutnya setelah validasi output lolos.

## Canvas & Mode Ceklis

Canvas dipakai untuk memahami dan mengontrol workflow; pekerjaan sebenarnya dilakukan di workspace tiap stage, dan di HP lewat mode ceklis. Keduanya adalah dua tampilan dari Run yang sama.

**Canvas (desktop)**

- Drag, zoom, pan, multi-select, minimap, auto-layout, shortcut keyboard.
- Tambah, hubungkan, putuskan, duplikasi, hapus, dan ganti nama stage.
- Undo/redo di sisi klien; disimpan saat commit, bukan setiap gerakan.
- Posisi node disimpan terpisah dari logika graph, sehingga menggeser node tidak membuat versi workflow baru.
- Teknologi: React, React Flow, TypeScript.

**Mode Ceklis (mobile-first)**

- Daftar vertikal dari Run aktif, dikelompokkan per kelompok (turunan dari edge) dan diurutkan mengikuti edge.
- Centang item dengan satu ketukan; stage yang terkunci tampak jelas beserta alasannya.
- Dipakai di toko atau bandara, jadi harus cepat dan bisa dibuka satu tangan.

**PWA dan offline**

- Run yang aktif di-cache di perangkat; centang bekerja saat offline.
- Update optimistis: UI berubah seketika, sinkron ke server setelah koneksi kembali.
- Konflik diselesaikan *last-write-wins per item*, cukup untuk penggunaan pribadi.
- Stage AI/API membutuhkan koneksi; saat offline tampil sebagai "menunggu koneksi", bukan error.

## Stage Workspace, Context & Library

Mengklik sebuah stage membuka workspace khusus tipe itu; workspace menampilkan input, konfigurasi, aksi, output, dan tombol approval bila stage membutuhkannya.

**Workspace per tipe (MVP)**

- **Checklist:** tambah, ubah, urutkan, dan centang item; qty, catatan, tenggat opsional.
- **Task / Note:** teks bebas, tenggat, lampiran dari library.
- **AI:** pilih prompt dari library, lihat context yang dikirim, jalankan, lihat output teks/JSON, regenerate, bandingkan versi.
- **API:** method, URL, header, body, mapping input dan output, tombol uji.
- **Review:** pratinjau output stage hulu dengan aksi Edit, Regenerate, Reject, Approve.

Workspace produksi video (Script, TTS, SRT, Video, AI Director, Remotion) mengikuti spesifikasi PRD v1 dan masuk V3.

**Context System**

Setiap project punya context persisten: brief, target audiens, aturan brand, gaya visual dan tulisan, keputusan sebelumnya, dan output stage. Stage AI hanya menerima bagian context yang dipilih untuk stage itu. Tombol "What does this AI know?" menampilkan persis prompt dan context yang akan dikirim, tanpa tambahan tersembunyi.

**Library**

| Library | Isi | MVP |
| --- | --- | --- |
| Asset | File gambar, audio, video, font, ikon; metadata nama, tag, versi | Ya (upload dan pakai ulang) |
| Prompt | Prompt dengan variabel `{{topic}}`, `{{mood}}` yang diisi saat dipakai | Ya |
| Style, Animation, Character | Preset gaya untuk AI Director dan Remotion | V3 |

## Template, Versioning & Run History

Template memungkinkan satu workflow dipakai berkali-kali: "Travel Jepang" disimpan sekali, lalu setiap perjalanan menjadi Run baru dengan semua item kembali TODO, sementara template tidak berubah.

**Template**

- Simpan sebagai template, duplikasi, impor, dan ekspor (JSON).
- Membuat Run dari template menyalin snapshot definisi, sehingga mengedit template belakangan tidak mengubah Run lama.
- Template bawaan untuk MVP: Travel Checklist, Shopping List, dan Idea → AI Script → Review → API.
- Preset buatan developer dan template buatan pengguna adalah hal yang sama; keduanya hanya dibedakan lewat tag (mis. Bawaan, Milik saya, Otomatis). Memulai proyek bisa dari Manual, Preset/Template, atau AI (AI aktif setelah pengguna menghubungkan API di Pengaturan).

**Versioning**

- Output stage (script, voice, subtitle, edit plan) berupa artifact immutable dan berversi; regenerate selalu membuat versi baru, tidak menimpa.
- Setiap stage run mencatat versi persis dari input yang dipakainya.
- User dapat membandingkan dan rollback ke versi sebelumnya.
- **Aturan STALE:** bila output hulu berubah setelah stage hilir selesai, output hilir ditandai STALE (tetap bisa dilihat). User memilih jalankan ulang atau abaikan; mode Auto tidak boleh menimpa hasil tanpa sepengetahuan user.

**Run History**

Setiap eksekusi tercatat: stage, status, durasi, versi input dan output, keputusan approval beserta catatan, dan error bila gagal (misalnya "TTS: API timeout" dengan tombol Retry).

## Arsitektur & Data Model

Stack mengikuti PRD v1: Next.js, Supabase, dan worker Node.js terpisah. Postgres menjadi sumber kebenaran sekaligus antrean job.

&#91;embedded content: arsitektur sistem · 5 komponen\]

Next.js hanya menangani UI dan perintah singkat (mulai, approve, reject); stage tidak pernah dijalankan di request web. Worker mengambil job dari Postgres (`SELECT ... FOR UPDATE SKIP LOCKED`), menjalankan handler, lalu menyimpan hasil sebagai artifact. Redis/BullMQ baru dipertimbangkan bila ada banyak job paralel.

**Data model**

| Kelompok | Tabel | Catatan |
| --- | --- | --- |
| Definisi | projects, workflows, stages, stage\_connections, items, templates | Tanpa status; edge punya jenis (blocking/flow) dan port bertipe; items adalah isi stage Checklist |
| Eksekusi | runs, stage\_runs, run\_items | Status dan centang hidup di sini; run menyimpan versi workflow yang dipakainya |
| Output | artifacts, approvals | Artifact immutable dan berversi; file besar di Storage, JSON kecil inline |
| Konteks dan library | project\_context, assets, prompts, styles | Library per user atau project; style masuk V3 |
| Antrean | jobs | Diklaim worker; menyimpan percobaan ke-n dan waktu jalan berikutnya |

**Keputusan kunci**

- **Satu Stage Engine.** Tiap tipe stage adalah handler dengan kontrak sama: schema config, port input/output bertipe, fungsi run, dan UI workspace. Orkestrator tidak tahu apa itu "TTS" atau "Remotion".
- **Item di tabel sendiri**, bukan array JSON, supaya centang cepat, aman dari konflik, dan bisa disinkronkan per item saat offline.
- **Artifact tidak pernah ditimpa.** Regenerate membuat versi baru; stage run mencatat versi input persisnya, sehingga rollback dan perbandingan versi tersedia tanpa kerja tambahan.
- **RLS di semua tabel** sejak hari pertama.

## Keamanan & Non-functional

Pengguna awal hanya satu orang, jadi skala bukan batasan; yang harus benar sejak awal adalah kepemilikan data, rahasia API, dan perilaku offline.

| Area | Persyaratan |
| --- | --- |
| Kepemilikan data | Row Level Security di semua tabel berdasarkan pemilik, meski saat ini hanya satu pengguna |
| Secret | API key tidak disimpan di config stage maupun browser; disimpan terenkripsi (Supabase Vault) dan dirujuk lewat nama, di-resolve oleh worker |
| API Stage | Blokir alamat IP privat dan localhost (SSRF); allowlist domain bila multi-user |
| Idempotensi | Setiap panggilan eksternal membawa kunci stage\_run\_id + attempt agar retry tidak menggandakan biaya |
| Python Stage | Ditunda ke V2; dijalankan di container terpisah tanpa akses kredensial worker |
| Biaya | Catat model, prompt final, dan token usage per stage run |
| Responsivitas | Centang item terasa instan (di bawah 100 ms, optimistis); status stage tampil lewat Realtime tanpa polling |
| Offline | Run aktif bisa dibaca dan dicentang tanpa jaringan; sinkron otomatis saat kembali online |
| Penyimpanan | Artifact berversi tumbuh terus; sediakan kebijakan retensi (hapus versi lama yang tidak pernah di-approve) |

## Non-goals & Scope Rule

**Scope rule:** sebuah fitur masuk produk hanya jika bisa dinyatakan sebagai node, edge, item, atau handler. Jika tidak bisa, kemungkinan besar itu bukan bagian dari Sevn Studio.

**Bukan tujuan produk ini**

- Pengganti penuh n8n atau platform automation enterprise.
- Pengganti Notion, Trello, atau Miro (tidak ada halaman bebas, papan kanban, atau whiteboard).
- Pengganti Premiere Pro atau editor video penuh.
- Platform agen AI otonom; AI selalu berada di bawah kendali user.
- Alat manajemen media sosial.
- Kalender atau aplikasi kolaborasi tim (kolaborasi multi-user di luar cakupan sampai V4).

**Fokus**

Pekerjaan yang membutuhkan kombinasi penilaian manusia dengan eksekusi tool atau AI, termasuk yang sepenuhnya manual.

## Roadmap

MVP membuktikan konsep, lalu V2 sampai V4 dibuka satu per satu setelah gate-nya lolos.

&#91;embedded content: roadmap · 4 fase, 3 gate\]

Gate adalah syarat masuk ke fase berikutnya, bukan tenggat. V2 menambah otomatisasi lanjutan, V3 menghadirkan produksi video (Idea → Script → Voice → SRT → Visual → AI Edit Plan → Remotion → Final), dan V4 membuka kolaborasi serta domain Design dan Development.

## MVP

MVP berhasil bila satu orang dapat menjalankan dua workflow bukti tanpa menulis kode aplikasi: ceklis traveling manual, lalu Idea → AI Script → Review → API → Output. Urutan itu disengaja: yang pertama menguji canvas, state, template, dan run tanpa infrastruktur eksekusi; yang kedua menambah worker, AI, dan API.

**Dua workflow bukti**

|  | Workflow A: Travel Checklist | Workflow B: AI Script → TTS |
| --- | --- | --- |
| Stage | Dokumen (Checklist), Booking (Checklist + tenggat), Packing (Checklist) | Idea (Task) → Script (AI) → Review → TTS (API) → Output (Note/file) |
| Edge | Dokumen → Booking blocking; Packing flow (bebas) | Semua blocking |
| Butuh worker | Tidak | Ya (AI dan API) |
| Yang dibuktikan | Canvas, item, status, template, run baru dari template, mode ceklis, offline | Engine eksekusi, context, approval, versioning, API mapping, run history |

**Termasuk dalam MVP**

1. Auth, project, dan penyimpanan (Supabase, RLS).
2. Canvas: tambah, pindah, hubungkan, hapus, ganti nama stage; auto-save dan undo/redo klien.
3. Tipe stage: Checklist, Task, Note, Review, AI, API. Kelompok diturunkan dari edge (lihat Konsep Inti).
4. Edge blocking dan flow; status LOCKED/READY diturunkan dari graph.
5. Eksekusi: READY → RUNNING → REVIEW → APPROVED, dengan REJECTED, FAILED, dan STALE.
6. Template: simpan workflow sebagai template dan buat Run baru darinya.
7. Mode ceklis (PWA) untuk Run aktif, dengan centang offline dan sinkron.
8. Persistent context project dan tampilan "What does this AI know?".
9. Library: upload dan pakai ulang asset; simpan dan pakai ulang prompt dengan variabel.
10. Stage AI dengan output teks/JSON bervalidasi; stage API dengan HTTP generik.
11. Artifact berversi dan run history dasar.

**Ditunda**

Python/File stage, conditional branch, loop, paralel, webhook, pengingat dan notifikasi tenggat (kolom tenggat tetap ada), TTS/SRT/Video/AI Director/Remotion, kolaborasi multi-user, dan marketplace template.

**Kriteria penerimaan**

- Membuat workflow Travel Checklist dari nol, menyimpannya sebagai template, lalu membuat dua Run terpisah; mencentang item di Run pertama tidak mengubah Run kedua.
- Mencentang item di HP dalam mode pesawat; setelah online kembali, perubahan tersinkron tanpa kehilangan data.
- Stage dengan edge blocking tidak bisa dijalankan sebelum hulunya APPROVED atau DONE; alasan penguncian terlihat di UI.
- Workflow B berjalan dari awal sampai Output: AI menghasilkan script, user me-review dan approve, API menghasilkan file suara yang tersimpan sebagai artifact.
- Me-regenerate script setelah TTS selesai menandai TTS sebagai STALE, bukan menimpanya.
- Kegagalan API (timeout) tampil di run history dengan tombol Retry dan tidak menggandakan panggilan berbayar.
- Workflow A berfungsi penuh dengan worker dimatikan.

**Fase pembangunan**

1. **Fondasi:** Next.js, Supabase, auth, project, canvas dasar, stage Checklist/Task/Note.
2. **Engine:** orchestrator dan state machine dengan unit test (tanpa UI), lalu disambung ke canvas; template dan run.
3. **Mode ceklis dan offline:** tampilan mobile, PWA, sinkronisasi per item. Gerbang: Workflow A lolos semua kriteria.
4. **AI dan API:** worker, job queue Postgres, stage AI/API, context, review, artifact berversi, STALE.
5. **Creative layer ringan:** library asset dan prompt. Gerbang: Workflow B lolos semua kriteria.

**Risiko**

- **Scope creep karena kata "sandbox".** Mitigasi: scope rule di atas; setiap permintaan fitur diuji dengan "node, edge, item, atau handler?".
- **Sinkronisasi offline lebih rumit dari perkiraan.** Mitigasi: last-write-wins per item dan cache hanya untuk Run aktif.
- **Engine terlalu generik terlalu dini.** Mitigasi: bangun hanya handler yang dibutuhkan dua workflow bukti; kontrak handler dibuktikan oleh tujuh tipe MVP.
- **Biaya API/AI tak terduga.** Mitigasi: catat token dan biaya per stage run sejak awal, dan batasi regenerate otomatis.
