import type { Preset, PresetStage } from "./types";

const AWAL = "Bahan awal";
const PROSES = "Proses";
const HASIL = "Hasil";

type Link = Preset["links"][number];
/** Blocking chain: each step waits for the one before it. */
const seq = (...keys: string[]): Link[] => keys.slice(1).map((k, i) => [keys[i] as string, k, "blocking"] as Link);

const task = (key: string, name: string, text: string, group = PROSES, decision = false): PresetStage => ({
  key, type: "task", name, text, group, decision,
});
const decide = (key: string, name: string, text: string): PresetStage => task(key, name, text, PROSES, true);
const rules = (text: string): PresetStage => ({ key: "aturan", type: "note", name: "Aturan penting", text, group: AWAL });
const results = (name: string, items: string[]): PresetStage => ({ key: "hasil", type: "checklist", name, items, group: HASIL });
const input = (text: string, name = "Isi bahan awal"): PresetStage => task("input", name, text, AWAL);

// ───────────────────────────── OTOMATIS ─────────────────────────────

const contentFactory: Preset = {
  key: "content-factory",
  category: "otomatis",
  title: "Content Factory",
  goal: "Mengubah satu ide menjadi paket konten siap produksi.",
  results: ["Skrip final + estimasi durasi", "Storyboard per adegan", "Caption, judul sampul, tagar", "Checklist produksi"],
  stages: [
    input(
      "Tulis dulu:\n• Ide atau topik\n• Audiens\n• Platform dan format (mis. TikTok, video 45 detik)\n• Tujuan: edukasi, interaksi, atau promosi\n• Gaya bahasa\n• Produk atau ajakan tindakan (boleh kosong)\n• Bahan referensi (boleh kosong)",
    ),
    rules(
      "Pakai asumsi yang wajar untuk informasi yang belum ada, dan tuliskan asumsinya.\nJangan mengarang fakta, testimoni, atau manfaat produk.\nKalau ada alat produksi, buat aset dan render kontennya. Kalau tidak, jelaskan bagian yang masih harus diproduksi.\nPublikasi hanya sesuai izin yang sudah Anda berikan.",
    ),
    task("masalah", "Cari masalah audiens dan pesan utama", "Identifikasi masalah yang dirasakan audiens dan satu pesan utama yang ingin disampaikan."),
    task("sudut", "Buat 5 sudut pembahasan, pilih satu", "Buat 5 sudut pembahasan, lalu pilih yang paling sesuai dengan tujuan. Catat alasan pemilihannya."),
    task("hook", "Tulis 3 hook, pilih satu", "Tulis 3 alternatif kalimat pembuka (hook), lalu pilih satu."),
    task("skrip", "Tulis skrip lengkap", "Susun skrip: hook → isi → penutup → ajakan tindakan. Tulis perkiraan durasinya."),
    task("storyboard", "Pecah jadi storyboard per adegan", "Pecah skrip menjadi adegan-adegan, dalam bentuk tabel."),
    task("visual", "Tentukan visual, teks layar, narasi, dan aset", "Untuk tiap adegan: visualnya apa, teks di layar, narasinya, dan aset apa yang dibutuhkan."),
    task("caption", "Buat caption, judul sampul, dan tagar", "Buat caption, 3 pilihan judul sampul, dan 5–8 tagar yang relevan."),
    task("cek", "Periksa konsistensi, durasi, dan klaim", "Periksa apakah ceritanya konsisten, durasinya pas, tidak ada klaim yang tidak berdasar, dan tidak ada pengulangan."),
    results("Checklist produksi", [
      "Konsep dan alasan pemilihannya tercatat",
      "Skrip final + estimasi durasi",
      "Storyboard dalam tabel",
      "Daftar aset dan instruksi penyuntingan",
      "Caption, 3 judul sampul, 5–8 tagar",
      "Bagian yang masih harus diproduksi dicatat",
      "Siap dipublikasikan (sesuai izin Anda)",
    ]),
  ],
  links: [...seq("input", "masalah", "sudut", "hook", "skrip", "storyboard", "visual", "caption", "cek", "hasil"), ["aturan", "masalah", "flow"]],
};

const knowledgeToAction: Preset = {
  key: "knowledge-to-action",
  category: "otomatis",
  title: "Knowledge to Action",
  goal: "Mengubah bahan bacaan atau catatan menjadi panduan dan tugas yang bisa dikerjakan.",
  results: ["Ringkasan singkat", "Panduan langkah demi langkah", "Checklist tindakan + estimasi waktu", "5 pertanyaan pemahaman"],
  stages: [
    input(
      "Tulis dulu:\n• Bahan (teks, dokumen, atau transkrip)\n• Tujuan Anda memakai bahan ini\n• Tingkat pemahaman awal: pemula, menengah, atau lanjut\n• Waktu yang tersedia untuk menerapkan",
    ),
    rules("Bedakan isi sumber dengan tafsiran atau saran tambahan.\nJangan menambah klaim seolah-olah berasal dari bahan yang Anda berikan."),
    task("ekstrak", "Ambil gagasan utama, istilah, dan langkah penting", "Ekstrak gagasan utama, istilah penting, dan langkah-langkah yang disebut dalam bahan."),
    task("kelompok", "Kelompokkan berdasarkan tema", "Kelompokkan informasi tadi berdasarkan tema."),
    task("jelaskan", "Jelaskan konsep dengan bahasa sederhana", "Jelaskan tiap konsep dengan bahasa sederhana, lengkap dengan contoh."),
    task("hubungkan", "Hubungkan konsep dengan tujuan Anda", "Tulis bagaimana tiap konsep berguna untuk tujuan Anda."),
    task("tugas", "Ubah rekomendasi menjadi tugas", "Ubah rekomendasi yang ada menjadi tugas yang bisa langsung dilakukan."),
    task("urut", "Urutkan tugas", "Urutkan tugas berdasarkan mana yang harus lebih dulu dan mana yang paling berdampak."),
    task("tanya", "Buat pertanyaan pemeriksa pemahaman", "Buat 5 pertanyaan untuk memeriksa pemahaman, lengkap dengan jawabannya."),
    results("Hasil akhir", [
      "Ringkasan singkat",
      "Daftar konsep dan contoh penerapan",
      "Panduan langkah demi langkah",
      "Checklist tindakan beserta estimasi waktu",
      "5 pertanyaan pemahaman dan jawabannya",
      "Informasi yang masih perlu diperiksa kebenarannya",
    ]),
  ],
  links: [...seq("input", "ekstrak", "kelompok", "jelaskan", "hubungkan", "tugas", "urut", "tanya", "hasil"), ["aturan", "ekstrak", "flow"]],
};

const weeklyReport: Preset = {
  key: "weekly-progress-report",
  category: "otomatis",
  title: "Weekly Progress Report",
  goal: "Mengubah catatan aktivitas seminggu menjadi laporan progres dan rencana minggu depan.",
  results: ["Ringkasan progres", "Tabel target, hasil, dan status", "3 prioritas minggu depan", "Tindakan pertama + estimasi waktu"],
  stages: [
    input(
      "Tulis dulu:\n• Periode (mis. 1–7 Oktober)\n• Target minggu ini\n• Catatan aktivitas dan hasilnya\n• Tugas yang belum selesai\n• Hambatan",
    ),
    rules(
      "Jangan menganggap banyaknya aktivitas sama dengan banyaknya kemajuan.\nJangan menghitung persentase kalau tidak ada data yang jelas.\nBisa dijalankan tiap akhir minggu, atau terjadwal otomatis kalau akses data dan penjadwalan sudah diatur.",
    ),
    task("cocok", "Cocokkan aktivitas dengan target", "Cocokkan tiap aktivitas dengan target yang ingin dicapai."),
    task("status", "Kelompokkan: selesai, berjalan, tertunda", "Kelompokkan tiap target menjadi selesai, sedang berjalan, atau tertunda."),
    task("hitung", "Hitung pencapaian (kalau datanya ada)", "Hitung pencapaian hanya jika datanya memungkinkan. Kalau tidak, tulis apa adanya tanpa angka."),
    task("hambatan", "Cari penyebab hambatan", "Cari penyebab hambatan dari catatan yang ada."),
    task("putuskan", "Tentukan tugas: lanjut, ubah, atau hentikan", "Untuk tiap tugas yang belum beres, tentukan: dilanjutkan, diubah, atau dihentikan."),
    task("prioritas", "Pilih maksimal 3 prioritas minggu depan", "Pilih paling banyak 3 prioritas untuk minggu berikutnya."),
    task("aksi", "Pecah prioritas jadi tindakan awal", "Pecah tiap prioritas menjadi tindakan pertama yang jelas, lengkap dengan perkiraan waktunya."),
    results("Laporan akhir", [
      "Ringkasan progres",
      "Tabel target, hasil, dan status",
      "Hambatan utama dan usulan perbaikan",
      "3 prioritas minggu depan",
      "Tindakan pertama dan estimasi waktu",
    ]),
  ],
  links: [...seq("input", "cocok", "status", "hitung", "hambatan", "putuskan", "prioritas", "aksi", "hasil"), ["aturan", "cocok", "flow"]],
};

// ───────────────────────────── SEMI-OTOMATIS ─────────────────────────────

const projectLaunchpad: Preset = {
  key: "project-launchpad",
  category: "semi",
  title: "Project Launchpad",
  goal: "Mengubah ide menjadi rencana proyek yang realistis, dengan dua keputusan dari Anda.",
  results: ["Brief proyek", "Lingkup yang disepakati", "Milestone dan backlog", "Rencana 7 hari pertama"],
  stages: [
    input(
      "Tulis dulu:\n• Ide proyek\n• Masalah yang ingin diselesaikan\n• Pengguna sasaran\n• Batas waktu, anggaran, dan kemampuan Anda",
    ),
    rules("Kritik ide kalau terlalu luas atau targetnya tidak sesuai dengan sumber daya Anda.\nBuat setiap tugas cukup konkret untuk langsung dikerjakan."),
    task("jelas", "Perjelas masalah, pengguna, dan hasil yang diharapkan", "Perjelas tiga hal ini: masalahnya apa, untuk siapa, dan hasil apa yang diharapkan."),
    task("lingkup", "Usulkan 3 pilihan lingkup", "Usulkan 3 pilihan lingkup: minimum, standar, dan luas. Jelaskan isi dan konsekuensi masing-masing."),
    decide("pilih", "KEPUTUSAN ANDA: pilih atau ubah lingkup", "Ini giliran Anda. Pilih salah satu lingkup, atau ubah sesuai kebutuhan. Langkah berikutnya menunggu keputusan ini."),
    task("fitur", "Susun fitur utama, hasil kerja, milestone, dan ketergantungan", "Berdasarkan lingkup yang Anda pilih, susun fitur utama, hasil kerja, milestone, dan apa yang bergantung pada apa."),
    task("risiko", "Tunjukkan risiko dan kompromi terpenting", "Tunjukkan risiko dan kompromi yang paling penting beserta pilihannya."),
    decide("prioritas", "KEPUTUSAN ANDA: tetapkan prioritas dan batasan akhir", "Ini giliran Anda. Tetapkan mana yang paling diutamakan dan batasan akhir (waktu, biaya, tenaga)."),
    task("backlog", "Susun backlog dan rencana tahap pertama", "Susun daftar tugas (backlog) dan rencana pengerjaan tahap pertama."),
    results("Hasil akhir", [
      "Brief proyek",
      "Lingkup yang disepakati",
      "Daftar fitur atau hasil kerja berdasarkan prioritas",
      "Milestone dan tanda bahwa sudah selesai",
      "Backlog tugas",
      "Rencana 7 hari pertama",
    ]),
  ],
  links: [...seq("input", "jelas", "lingkup", "pilih", "fitur", "risiko", "prioritas", "backlog", "hasil"), ["aturan", "jelas", "flow"]],
};

const learnPractice: Preset = {
  key: "learn-and-practice",
  category: "semi",
  title: "Learn & Practice",
  goal: "Menguasai satu keterampilan lewat materi, latihan, dan umpan balik.",
  results: ["Target sesi", "Materi singkat dan latihan", "Umpan balik dan latihan perbaikan", "Jadwal pengulangan"],
  stages: [
    input("Tulis dulu:\n• Keterampilan atau topik\n• Kemampuan Anda sekarang\n• Target yang konkret\n• Waktu belajar per sesi"),
    rules("Jangan menyimpulkan Anda sudah menguasai materi hanya karena sudah membacanya.\nKemajuan dinilai dari hasil latihan."),
    task("diagnosa", "Beri tes singkat untuk mengukur kemampuan", "Buat tes diagnostik singkat untuk mengetahui kemampuan Anda saat ini."),
    decide("jawab", "ANDA: kerjakan tes singkat", "Ini giliran Anda. Jawab atau kerjakan tes tadi apa adanya, tanpa mencari jawaban."),
    task("materi", "Tentukan titik awal dan susun materi satu sesi", "Dari hasil tes, tentukan mulai dari mana, lalu susun materi untuk satu sesi."),
    task("konsep", "Jelaskan konsep dengan contoh", "Jelaskan konsep yang dibahas, lengkap dengan contoh."),
    decide("latihan", "ANDA: kerjakan latihan tanpa melihat solusi", "Ini giliran Anda. Kerjakan latihan tanpa melihat solusi dulu."),
    task("nilai", "Nilai hasil dan jelaskan kesalahan", "Nilai jawaban Anda, lalu jelaskan di mana salahnya dan kenapa."),
    task("perbaikan", "Beri latihan perbaikan", "Beri latihan perbaikan yang fokus pada bagian yang masih lemah."),
    decide("ulang", "ANDA: coba lagi", "Ini giliran Anda. Kerjakan latihan perbaikan."),
    task("lanjut", "Putuskan: diulang atau lanjut", "Berdasarkan hasil latihan, tentukan apakah materi perlu diulang atau boleh dilanjutkan."),
    results("Hasil sesi", [
      "Target sesi",
      "Materi singkat dan contoh",
      "Latihan",
      "Umpan balik atas jawaban Anda",
      "Latihan perbaikan",
      "Jadwal pengulangan dan langkah berikutnya",
    ]),
  ],
  links: [...seq("input", "diagnosa", "jawab", "materi", "konsep", "latihan", "nilai", "perbaikan", "ulang", "lanjut", "hasil"), ["aturan", "diagnosa", "flow"]],
};

// ───────────────────────────── KEHIDUPAN SEHARI-HARI ─────────────────────────────

const todayNavigator: Preset = {
  key: "todays-navigator",
  category: "harian",
  title: "Today's Navigator",
  goal: "Menjawab “hari ini aku harus ngapain?” dengan rencana yang sesuai waktu dan tenagamu.",
  results: ["Fokus utama hari ini", "3 prioritas", "Jadwal sederhana", "Versi minimum hari ini"],
  stages: [
    input(
      "Tulis dulu:\n• Waktu luang hari ini\n• Agenda tetap\n• Tugas dan tenggatnya\n• Tenaga sekarang: rendah, sedang, atau tinggi\n• Hal pribadi yang perlu diperhatikan",
    ),
    rules("Jangan penuhi seluruh waktu dengan tugas.\nKalau daftarnya terlalu banyak, tentukan mana yang ditunda dan tulis alasannya."),
    task("pisah", "Pisahkan agenda tetap dan tugas yang fleksibel", "Tulis dua daftar: agenda yang waktunya tetap, dan tugas yang bisa digeser."),
    task("fokus", "Tentukan satu hasil terpenting hari ini", "Kalau hari ini hanya satu hal yang selesai, apa yang paling berarti?"),
    task("tiga", "Pilih maksimal 3 tugas utama", "Pilih paling banyak 3 tugas, berdasarkan seberapa mendesak dan seberapa besar dampaknya."),
    task("pecah", "Pecah tugas besar jadi langkah pertama 10–25 menit", "Untuk tiap tugas besar, tulis langkah pertama yang cukup kecil: 10 sampai 25 menit."),
    task("energi", "Taruh tugas terberat di waktu tenaga terbaik", "Tempatkan tugas yang paling menuntut pada jam ketika tenagamu paling baik."),
    task("jeda", "Sisipkan makan, istirahat, ibadah, dan waktu cadangan", "Masukkan makan, istirahat, ibadah, dan waktu cadangan sesuai kebutuhan."),
    task("minimum", "Siapkan versi minimum kalau hari tidak sesuai rencana", "Tulis versi paling ringan dari hari ini, supaya tetap ada yang berjalan kalau rencana kacau."),
    results("Rencana hari ini", [
      "Fokus utama hari ini",
      "3 prioritas",
      "Jadwal sederhana dengan durasi yang realistis",
      "Langkah yang dimulai sekarang",
      "Versi minimum hari ini",
      "Tugas yang boleh ditunda",
    ]),
  ],
  links: [...seq("input", "pisah", "fokus", "tiga", "pecah", "energi", "jeda", "minimum", "hasil"), ["aturan", "pisah", "flow"]],
};

const eveningReset: Preset = {
  key: "evening-reset",
  category: "harian",
  title: "Evening Reset",
  goal: "Menutup hari dengan evaluasi singkat supaya besok pagi tidak bingung.",
  results: ["3 hal yang berjalan baik", "Prioritas besok", "Persiapan malam ini (maks. 10 menit)", "Langkah pertama besok pagi"],
  stages: [
    input(
      "Tulis dulu:\n• Rencana hari ini\n• Yang benar-benar dikerjakan\n• Tugas yang tertunda\n• Kondisi tenaga dan perasaan\n• Agenda besok",
    ),
    rules("Jangan otomatis memindahkan semua tugas yang tertunda ke besok.\nSesuaikan lagi dengan tenaga dan agenda yang tersedia."),
    task("selesai", "Catat yang selesai, sekecil apa pun", "Tulis hal-hal yang selesai, termasuk kemajuan kecil."),
    task("banding", "Bandingkan rencana dengan kenyataan", "Lihat selisih antara rencana dan kenyataan, tanpa menyalahkan diri sendiri."),
    task("hambatan", "Cari satu hambatan utama", "Tentukan satu hambatan yang paling mengganggu hari ini."),
    decide("tertunda", "Putuskan tugas yang tertunda", "Untuk tiap tugas yang tertunda, pilih: lanjutkan, jadwalkan ulang, atau hapus."),
    task("besok", "Pilih satu prioritas untuk besok", "Pilih satu hal yang paling penting untuk besok."),
    task("siap", "Tentukan langkah pertama dan persiapan malam ini", "Tulis langkah pertama besok pagi, dan persiapan yang bisa dilakukan malam ini (maksimal 10 menit)."),
    task("pelajaran", "Tutup dengan satu pelajaran", "Tulis satu pelajaran dari hari ini yang bisa dipakai besok."),
    results("Evaluasi hari ini", [
      "3 hal yang berjalan baik",
      "Hambatan utama dan satu perbaikan",
      "Keputusan untuk tugas yang tertunda",
      "Prioritas besok",
      "Persiapan malam ini (maksimal 10 menit)",
      "Langkah pertama besok pagi",
    ]),
  ],
  links: [...seq("input", "selesai", "banding", "hambatan", "tertunda", "besok", "siap", "pelajaran", "hasil"), ["aturan", "selesai", "flow"]],
};

/** Seven built-in presets: 3 otomatis, 2 semi-otomatis, 2 kehidupan sehari-hari. */
export const presets: readonly Preset[] = [
  contentFactory,
  knowledgeToAction,
  weeklyReport,
  projectLaunchpad,
  learnPractice,
  todayNavigator,
  eveningReset,
];

export const getPreset = (key: string) => presets.find((p) => p.key === key);
