# Kamus istilah tampilan

Teks yang dilihat pengguna memakai bahasa sehari-hari. Istilah teknis tetap dipakai di kode, tabel, dan dokumen teknis.

| Di kode / PRD | Tampil ke pengguna | Catatan |
| --- | --- | --- |
| Project | Proyek | |
| Workflow | Alur kerja | "Susunan langkah yang bisa diubah" |
| Stage | Langkah | |
| Checklist / Task / Note | Ceklis / Tugas / Catatan | |
| (diturunkan dari garis) | Kelompok | Tidak dibuat manual. Langkah yang tersambung garis otomatis satu kelompok; yang tanpa garis masuk "Lainnya". Jenis langkah `group` lama masih bisa tampil, tetapi tidak bisa ditambah lagi. |
| Item | Isi ceklis | |
| Edge `blocking` | Harus urut | Langkah berikutnya menunggu |
| Edge `flow` | Bebas urutan | Label garis: "bebas" |
| Run | Pengerjaan | "Mulai kerjakan" |
| Preset / Template | Preset | Satu hal yang sama. Tag membedakan: "Bawaan" (dari developer, plus kategori) dan "Milik saya" (buatan pengguna). |
| Canvas | Peta | Tab "Daftar" dan "Peta" |
| LOCKED | Menunggu | Selalu sertakan alasan: "Selesaikan dulu: X" |
| READY | Siap dikerjakan | |
| Sync / offline | Dikirim otomatis / Tidak ada internet | |

Aturan: jelaskan akibatnya, bukan mekanismenya. Contoh: "Belum bisa dikerjakan. Selesaikan dulu: Dokumen", bukan "Stage terkunci oleh edge blocking".
