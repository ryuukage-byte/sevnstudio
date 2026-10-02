# Desain: SevnSoul

Sumber: `sevnsoul_unified_home_v10` (`sevnsoul-theme.css`). Diterapkan di `apps/web/app/globals.css`.

## Prinsip
Gelap, monokrom, rapat, premium. Warna hanya dipakai untuk menandai status yang memang perlu dibedakan.

## Token
| Peran | Nilai |
| --- | --- |
| Latar | `#080808` (+ cahaya radial tipis dan tekstur garis halus) |
| Permukaan kartu | gradien `#141414 → #0e0e0e`, border `rgba(255,255,255,.075)` |
| Teks | `#f4f4f2`; redup `.58`; samar `.34` |
| Tombol utama | latar `#f4f4f2`, teks `#090909`, radius 12px |
| Radius | kartu 20px, input 12px |
| Status "selesai" | titik putih terisi; "menunggu" titik kosong; "usang" kuning lembut; "gagal" merah lembut |

## Huruf
- Judul: **Space Grotesk** 400–500, tracking rapat (`-0.03em` s.d. `-0.05em`).
- Isi: **Inter** 300–400.
- Label kecil: **JetBrains Mono** kapital, `10px`, jarak huruf lebar (`.14em`). Kelas: `.sv-label`, `.sv-eyebrow`.

## Komponen (kelas di globals.css)
`.sv-card` (kartu, naik sedikit saat disorot), `.sv-badge[data-tone]` (pil status), `.sv-empty` (keadaan kosong bergaris putus), `.sv-eyebrow` (label dengan garis).

## Aset
Logo: `public/brand/mark.png`. Ikon aplikasi: `public/icons/` (192, 512, apple-touch). Semua dari paket SevnSoul v10.

## Aturan
- Teks tampilan mengikuti [KAMUS-ISTILAH.md](KAMUS-ISTILAH.md).
- Tidak menambah warna aksen baru tanpa alasan status.
- Navbar ada di semua halaman setelah masuk (`components/app/AppHeader.tsx`); halaman penuh tinggi (editor, pengerjaan) memakai `h-full`.
